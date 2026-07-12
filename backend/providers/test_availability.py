import asyncio

import pytest

from providers.availability import (
    STATUS_OK,
    STATUS_UNAVAILABLE,
    AvailabilityStore,
    classify_failure,
    filter_available,
    pick_unverified,
    probe_models,
    record_call_failure,
)

# Verbatim error text captured from the live providers - not invented.
CF_PAID_PLAN = (
    'litellm.APIConnectionError: CloudflareException - {"errors":[{"message":"AiError: Model '
    "@cf/zai-org/glm-5.2 is not available on the Workers Free plan: This model requires a Workers "
    'Paid plan.","code":5035}],"success":false}'
)
CF_AGREEMENT = 'litellm.APIError: OpenAIException - Error code: 403 - {"errors":[{"message":"AiError: Model Agreement: Prior to using this model you must agree to the terms"}]}'
RATE_LIMITED = "litellm.RateLimitError: RateLimitError - rate limit exceeded, please try again later"
CAPACITY = "litellm.APIConnectionError: CloudflareException - AiError: no capacity available"


class _Clock:
    def __init__(self, t: float = 1000.0):
        self.t = t

    def __call__(self) -> float:
        return self.t


@pytest.fixture
def store(tmp_path):
    clock = _Clock()
    s = AvailabilityStore(db_path=str(tmp_path / "a.db"), clock=clock)
    s._clock_obj = clock  # type: ignore[attr-defined]
    yield s
    s.close()


def _m(model_id, is_free=True):
    return {"id": model_id, "is_free": is_free}


# --- classification: the load-bearing decision ---

def test_paid_plan_gate_is_permanent():
    assert classify_failure(None, CF_PAID_PLAN) == "permanent"


def test_model_agreement_is_permanent():
    assert classify_failure(403, CF_AGREEMENT) == "permanent"


def test_rate_limit_is_transient_not_permanent():
    """A rate-limited free model is working. Removing it would be the worst possible bug."""
    assert classify_failure(429, RATE_LIMITED) == "transient"


def test_capacity_error_is_transient():
    assert classify_failure(500, CAPACITY) == "transient"


def test_apiconnectionerror_wrapper_does_not_read_as_transient():
    """litellm wraps permanent refusals in APIConnectionError, whose text contains 'connection'."""
    assert classify_failure(None, CF_PAID_PLAN) == "permanent"


def test_401_is_transient_so_a_bad_key_cannot_nuke_a_catalogue():
    assert classify_failure(401, "AuthenticationError: invalid api key") == "transient"


def test_unknown_error_defaults_to_transient():
    assert classify_failure(None, "something we have never seen") == "transient"


def test_403_without_marker_is_permanent():
    assert classify_failure(403, "forbidden") == "permanent"


# --- store + filtering ---

def test_quarantined_model_is_filtered_from_market(store):
    store.record_unavailable("cloudflare/@cf/zai-org/glm-5.2", CF_PAID_PLAN)
    models = [_m("cloudflare/@cf/zai-org/glm-5.2"), _m("groq/llama-3.3-70b")]
    assert [m["id"] for m in filter_available(models, store)] == ["groq/llama-3.3-70b"]


def test_quarantine_expires_so_market_self_heals(store):
    store.record_unavailable("m1", CF_PAID_PLAN, ttl=100)
    assert store.unavailable_ids() == {"m1"}
    store._clock_obj.t += 101
    assert store.unavailable_ids() == set()
    assert filter_available([_m("m1")], store) == [_m("m1")]


def test_ok_verdict_never_expires(store):
    store.record_ok("m1")
    store._clock_obj.t += 10_000_000
    assert "m1" in store.verified_ids()


def test_verdict_survives_reopen(tmp_path):
    path = str(tmp_path / "a.db")
    s1 = AvailabilityStore(db_path=path)
    s1.record_unavailable("m1", CF_PAID_PLAN)
    s1.close()
    s2 = AvailabilityStore(db_path=path)
    assert "m1" in s2.unavailable_ids()
    s2.close()


# --- reactive path ---

def test_reactive_permanent_failure_quarantines(store):
    assert record_call_failure(store, "m1", None, CF_PAID_PLAN) is True
    assert store.unavailable_ids() == {"m1"}


def test_reactive_transient_failure_does_not_quarantine(store):
    assert record_call_failure(store, "m1", 429, RATE_LIMITED) is False
    assert store.unavailable_ids() == set()


# --- lazy probe ---

def test_pick_unverified_skips_paid_models(store):
    models = [_m("free1"), _m("paid1", is_free=False)]
    assert pick_unverified(models, store) == ["free1"]


def test_pick_unverified_skips_already_verified(store):
    store.record_ok("free1")
    assert pick_unverified([_m("free1"), _m("free2")], store) == ["free2"]


def test_pick_unverified_retries_expired_quarantine(store):
    store.record_unavailable("free1", CF_PAID_PLAN, ttl=100)
    assert pick_unverified([_m("free1")], store) == []
    store._clock_obj.t += 101
    assert pick_unverified([_m("free1")], store) == ["free1"]


def test_probe_records_ok_and_quarantine(store):
    async def probe(model_id: str) -> None:
        if model_id == "bad":
            raise RuntimeError(CF_PAID_PLAN)

    verdicts = asyncio.run(probe_models(["good", "bad"], probe, store, concurrency=2))
    assert verdicts == {"good": STATUS_OK, "bad": STATUS_UNAVAILABLE}
    assert store.unavailable_ids() == {"bad"}


def test_probe_leaves_transient_failure_unverified_for_retry(store):
    async def probe(model_id: str) -> None:
        raise RuntimeError(RATE_LIMITED)

    verdicts = asyncio.run(probe_models(["m1"], probe, store, concurrency=1))
    assert verdicts == {"m1": "transient"}
    assert store.unavailable_ids() == set()
    assert pick_unverified([_m("m1")], store) == ["m1"]
