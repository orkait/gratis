import os

from providers.cloudflare import cloudflare_openai_base


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
