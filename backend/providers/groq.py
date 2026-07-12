import math
import os
import re

import httpx

from providers.params import capability_params, parse_params

GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_MODEL_PREFIX = "groq/"
GROQ_PROVIDER_NAME = "Groq"
GROQ_TIMEOUT_S = 10.0
GROQ_DEFAULT_CTX = 131_072


def get_groq_api_key() -> str:
    return os.getenv("GROQ_API_KEY", "")


def is_groq_model(model_id: str) -> bool:
    return isinstance(model_id, str) and model_id.startswith(GROQ_MODEL_PREFIX)


def strip_groq_prefix(model_id: str) -> str:
    return model_id[len(GROQ_MODEL_PREFIX):] if is_groq_model(model_id) else model_id



def _is_reasoning(model_id: str) -> bool:
    return bool(re.search(r"deepseek-r1|reasoning|thinking|qwen3|gpt-oss", model_id.lower()))


async def fetch_groq_models() -> list[dict]:
    api_key = get_groq_api_key()
    if not api_key:
        return []
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{GROQ_BASE_URL}/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=GROQ_TIMEOUT_S,
            )
            r.raise_for_status()
            return r.json().get("data", [])
    except Exception as e:
        print(f"Groq models error: {e}")
        return []


def build_groq_market_stats(raw: list[dict]) -> list[dict]:
    result = []
    for m in raw:
        slug = m["id"]
        ctx = m.get("context_window") or GROQ_DEFAULT_CTX
        params = parse_params(slug)
        capability = capability_params(params) * math.log10(ctx + 1)
        brain = _is_reasoning(slug)
        result.append({
            "id": f"groq/{slug}",
            "name": slug,
            "params": params,
            "ctx": int(ctx),
            "is_free": True,
            "capability": capability,
            "brain": brain,
            "tools": True,
            "open": True,
            "tps": None,
            "uptime": None,
            "provider": GROQ_PROVIDER_NAME,
            "balanced": 0.0,
            "value": 0.0,
        })
    return result
