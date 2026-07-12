import math
import os
import re

import httpx

CLOUDFLARE_MODEL_PREFIX = "cloudflare/"
CLOUDFLARE_PROVIDER_NAME = "Cloudflare Workers AI"
CLOUDFLARE_TIMEOUT_S = 10.0
CLOUDFLARE_DEFAULT_CTX = 8_192
CLOUDFLARE_API_BASE = os.getenv("CLOUDFLARE_API_BASE", "https://api.cloudflare.com/client/v4")


def get_cloudflare_credentials() -> tuple[str, str]:
    return os.getenv("CLOUDFLARE_API_KEY", ""), os.getenv("CLOUDFLARE_ACCOUNT_ID", "")


def cloudflare_openai_base(account_id: str) -> str:
    """OpenAI-compatible route. litellm's native cloudflare/ provider reads
    result["response"], which newer Workers AI models no longer return."""
    return f"{CLOUDFLARE_API_BASE}/accounts/{account_id}/ai/v1"


def is_cloudflare_model(model_id: str) -> bool:
    return isinstance(model_id, str) and model_id.startswith(CLOUDFLARE_MODEL_PREFIX)


def strip_cloudflare_prefix(model_id: str) -> str:
    return model_id[len(CLOUDFLARE_MODEL_PREFIX):] if is_cloudflare_model(model_id) else model_id


def _parse_params(model_id: str) -> float:
    lower = model_id.lower()
    m = re.search(r"(\d+(?:\.\d+)?)b\b", lower)
    if m:
        return float(m.group(1))
    return 1.0


def _is_reasoning(model_id: str) -> bool:
    return bool(re.search(r"deepseek-r1|reasoning|thinking|qwen|gpt-oss", model_id.lower()))


async def fetch_cloudflare_models() -> list[dict]:
    api_key, account_id = get_cloudflare_credentials()
    if not api_key or not account_id:
        return []
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{CLOUDFLARE_API_BASE}/accounts/{account_id}/ai/models/search",
                headers={"Authorization": f"Bearer {api_key}"},
                params={"task": "Text Generation", "per_page": 100},
                timeout=CLOUDFLARE_TIMEOUT_S,
            )
            r.raise_for_status()
            return r.json().get("result", [])
    except Exception as e:
        print(f"Cloudflare models error: {e}")
        return []


def build_cloudflare_market_stats(raw: list[dict]) -> list[dict]:
    result = []
    for m in raw:
        slug = m.get("name", "")
        if not slug:
            continue
        params = _parse_params(slug)
        ctx = CLOUDFLARE_DEFAULT_CTX
        properties = {p.get("property_id"): p.get("value") for p in m.get("properties", [])}
        ctx_str = properties.get("context_window") or properties.get("max_input_tokens")
        if ctx_str:
            try:
                ctx = int(ctx_str)
            except (ValueError, TypeError):
                pass
        capability = params * math.log10(ctx + 1)
        brain = _is_reasoning(slug)
        is_beta = m.get("properties") and any(
            p.get("property_id") == "beta" and p.get("value") == "true"
            for p in m.get("properties", [])
        )
        result.append({
            "id": f"cloudflare/{slug}",
            "name": slug,
            "params": params,
            "ctx": ctx,
            "is_free": True,
            "capability": capability,
            "brain": brain,
            "tools": bool(properties.get("function_calling")),
            "open": True,
            "tps": None,
            "uptime": None,
            "provider": CLOUDFLARE_PROVIDER_NAME,
            "balanced": 0.0,
            "value": 0.0,
        })
    return result
