"""Bring-your-own-key routing. The user's key is used per request, never stored."""

import os

import pytest

os.environ.setdefault("GROQ_API_KEY", "server-groq")
os.environ.setdefault("OPENROUTER_API_KEY", "server-or")
os.environ.setdefault("CLOUDFLARE_API_KEY", "server-cf")
os.environ.setdefault("CLOUDFLARE_ACCOUNT_ID", "server-acct")

import main  # noqa: E402
from main import resolve_model  # noqa: E402


def test_user_key_overrides_server_key():
    _, extra = resolve_model("groq/llama-3.3-70b-versatile", user_key="user-supplied")
    assert extra["api_key"] == "user-supplied"


def test_falls_back_to_server_key_when_user_sends_none():
    """Self-hosting and local dev must keep working straight from .env."""
    _, extra = resolve_model("groq/llama-3.3-70b-versatile", user_key=None)
    assert extra["api_key"] == "server-groq"


def test_user_key_applies_to_openrouter_default_route():
    _, extra = resolve_model("some/unprefixed-model", user_key="user-or")
    assert extra["api_key"] == "user-or"


def test_cloudflare_takes_user_account_id_too():
    _, extra = resolve_model("cloudflare/@cf/meta/llama-3.2-3b-instruct", user_key="user-cf", cf_account_id="user-acct")
    assert extra["api_key"] == "user-cf"
    assert "user-acct" in extra["api_base"]


def test_cloudflare_falls_back_to_server_account_id():
    _, extra = resolve_model("cloudflare/@cf/meta/llama-3.2-3b-instruct", user_key="user-cf")
    assert "server-acct" in extra["api_base"]


def test_require_user_key_rejects_keyless_inference(monkeypatch):
    from fastapi import HTTPException

    monkeypatch.setattr(main, "REQUIRE_USER_KEY", True)
    with pytest.raises(HTTPException) as e:
        main.require_user_key(None)
    assert e.value.status_code == 401


def test_require_user_key_allows_keyless_when_off(monkeypatch):
    monkeypatch.setattr(main, "REQUIRE_USER_KEY", False)
    main.require_user_key(None)  # must not raise
