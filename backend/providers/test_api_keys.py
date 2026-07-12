"""Key handling is the security-critical part: the raw key must never be recoverable."""

from providers.api_keys import (
    DEFAULT_SCOPES,
    KEY_PREFIX,
    ApiKey,
    Scope,
    generate_key,
    hash_key,
)


def test_generated_key_is_prefixed_and_high_entropy():
    raw, digest, prefix = generate_key()
    assert raw.startswith(KEY_PREFIX)
    assert len(raw) > len(KEY_PREFIX) + 20
    assert prefix.startswith(KEY_PREFIX)
    assert prefix != raw  # the display prefix is not a credential


def test_the_raw_key_is_not_recoverable_from_what_we_store():
    raw, digest, prefix = generate_key()
    # A database dump must hand an attacker nothing usable.
    assert raw not in digest
    assert raw not in prefix
    assert digest == hash_key(raw)
    assert len(digest) == 64  # sha-256 hex


def test_two_keys_never_collide():
    assert generate_key()[0] != generate_key()[0]


def test_hash_is_stable():
    raw = KEY_PREFIX + "abc"
    assert hash_key(raw) == hash_key(raw)


def _key(*scopes: str) -> ApiKey:
    return ApiKey(
        id="1", tenant="t", name="n", key_prefix="gr_live_x",
        scopes=tuple(scopes), created_at=None, last_used_at=None, revoked_at=None,
    )


def test_scopes_gate_capability():
    """A market-only consumer must not be able to spend inference."""
    market_only = _key(Scope.MARKET)
    assert market_only.has(Scope.MARKET)
    assert not market_only.has(Scope.INFERENCE)


def test_default_scopes_cover_market_and_inference():
    assert Scope.MARKET in DEFAULT_SCOPES
    assert Scope.INFERENCE in DEFAULT_SCOPES
    assert Scope.ADMIN not in DEFAULT_SCOPES  # minting keys is never a default
