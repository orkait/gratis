import math
import os
import re

import httpx

from providers.params import capability_params, parse_params

CEREBRAS_BASE_URL = "https://api.cerebras.ai/v1"
CEREBRAS_MODEL_PREFIX = "cerebras/"
CEREBRAS_PROVIDER_NAME = "Cerebras"
CEREBRAS_TIMEOUT_S = 10.0
CEREBRAS_DEFAULT_CTX = 8_192


def get_cerebras_api_key() -> str:
    return os.getenv("CEREBRAS_API_KEY", "")


def is_cerebras_model(model_id: str) -> bool:
    return isinstance(model_id, str) and model_id.startswith(CEREBRAS_MODEL_PREFIX)


def strip_cerebras_prefix(model_id: str) -> str:
    return model_id[len(CEREBRAS_MODEL_PREFIX):] if is_cerebras_model(model_id) else model_id



def _is_reasoning(model_id: str) -> bool:
    return bool(re.search(r"qwen3|gpt-oss|deepseek|reasoning|thinking", model_id.lower()))


async def fetch_cerebras_models() -> list[dict]:
    api_key = get_cerebras_api_key()
    if not api_key:
        return []
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{CEREBRAS_BASE_URL}/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=CEREBRAS_TIMEOUT_S,
            )
            r.raise_for_status()
            return r.json().get("data", [])
    except Exception as e:
        print(f"Cerebras models error: {e}")
        return []


def build_cerebras_market_stats(raw: list[dict]) -> list[dict]:
    result = []
    for m in raw:
        slug = m["id"]
        params = parse_params(slug)
        ctx = CEREBRAS_DEFAULT_CTX
        capability = capability_params(params) * math.log10(ctx + 1)
        brain = _is_reasoning(slug)
        result.append({
            "id": f"cerebras/{slug}",
            "name": slug,
            "params": params,
            "ctx": ctx,
            "is_free": True,
            "capability": capability,
            "brain": brain,
            "tools": True,
            "open": True,
            "tps": None,
            "uptime": None,
            "provider": CEREBRAS_PROVIDER_NAME,
            "balanced": 0.0,
            "value": 0.0,
        })
    return result
