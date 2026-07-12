import os

from providers.cloudflare import build_cloudflare_market_stats, cloudflare_openai_base


def _raw(name, price=None):
    """Cloudflare /ai/models/search payload shape."""
    props = [{"property_id": "context_window", "value": "128000"}]
    if price is not None:
        props.append({
            "property_id": "price",
            "value": [{"unit": "per M input tokens", "price": price, "currency": "USD"}],
        })
    return {"name": name, "properties": props}


def test_priced_model_is_still_free_to_run():
    """Workers AI bundles 10k Neurons/day free, so a non-zero `price` does not mean paid.

    Deriving is_free from `price` would wrongly mark gpt-oss-120b (0.35/M) as paid when it is
    callable for free under the daily allocation. See the comment in build_cloudflare_market_stats.
    """
    [model] = build_cloudflare_market_stats([_raw("@cf/openai/gpt-oss-120b", price=0.35)])
    assert model["is_free"] is True


def test_unpriced_model_is_free_to_run():
    [model] = build_cloudflare_market_stats([_raw("@cf/google/gemma-2b-it-lora")])
    assert model["is_free"] is True


def test_openai_base_targets_cf_openai_compatible_route():
    assert cloudflare_openai_base("acct123").endswith("/accounts/acct123/ai/v1")


def test_openai_base_honours_env_override(monkeypatch):
    monkeypatch.setenv("CLOUDFLARE_API_BASE", "https://example.test/v4")
    import importlib

    import providers.cloudflare as cf

    importlib.reload(cf)
    assert cf.cloudflare_openai_base("a") == "https://example.test/v4/accounts/a/ai/v1"
    monkeypatch.delenv("CLOUDFLARE_API_BASE")
    importlib.reload(cf)


def test_resolve_model_routes_cloudflare_through_openai_provider():
    """litellm's native cloudflare/ provider reads result["response"], a key newer
    Workers AI models no longer return. Route via CF's OpenAI-compatible endpoint."""
    os.environ.setdefault("CLOUDFLARE_ACCOUNT_ID", "acct123")
    os.environ.setdefault("CLOUDFLARE_API_KEY", "key")
    from main import resolve_model

    model, extra = resolve_model("cloudflare/@cf/openai/gpt-oss-120b")

    assert model == "openai/@cf/openai/gpt-oss-120b"
    assert extra["api_base"].endswith("/ai/v1")
    assert extra["api_key"]
