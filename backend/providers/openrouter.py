import asyncio
import math
from typing import TypedDict

import httpx

from providers.params import capability_params, parse_params

OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
MODELS_DEV_URL = "https://models.dev/api.json"
OPENROUTER_API_URL = "https://openrouter.ai/api/v1"
OPENROUTER_PROVIDER_NAME = "OpenRouter"
ENDPOINT_TIMEOUT_S = 10.0
TPS_CONCURRENCY = 12


class ModelStats(TypedDict):
    id: str
    name: str
    params: float
    ctx: int
    is_free: bool
    capability: float
    brain: bool
    tools: bool
    open: bool
    tps: float | None
    uptime: float | None
    provider: str
    balanced: float
    value: float
    price_in: float   # $/token input (0 for free lanes); kept so the UI can show cost with no extra fetch
    price_out: float  # $/token output
    intel: float | None
    intel_coding: float | None
    intel_math: float | None
    intel_est: bool



def _get_value(capability: float, prompt_price: str, completion_price: str) -> float:
    input_cost = float(prompt_price or "0") * 1_000_000
    output_cost = float(completion_price or "0") * 1_000_000
    cost_per_million = input_cost * 0.75 + output_cost * 0.25
    return math.floor(capability / (cost_per_million or 0.01))


async def _fetch_model_endpoints(client: httpx.AsyncClient, model_id: str) -> list[dict]:
    parts = model_id.split("/", 1)
    if len(parts) < 2:
        return []
    author, slug = parts
    try:
        r = await client.get(
            f"{OPENROUTER_API_URL}/models/{author}/{slug}/endpoints",
            timeout=ENDPOINT_TIMEOUT_S,
        )
        r.raise_for_status()
        return r.json().get("data", {}).get("endpoints", []) or []
    except Exception:
        return []


def _aggregate_metrics(endpoints: list[dict]) -> dict:
    if not endpoints:
        return {"tps": None, "uptime": None, "latency": None, "provider": None}

    active = [e for e in endpoints if e.get("status") == 0]
    candidates = active or endpoints

    with_tps = [e for e in candidates if isinstance(e.get("throughput_last_30m"), (int, float))]
    if with_tps:
        best = max(with_tps, key=lambda e: (e.get("throughput_last_30m") or -1, e.get("uptime_last_30m") or -1))
        return {
            "tps": best.get("throughput_last_30m"),
            "uptime": best.get("uptime_last_30m"),
            "latency": best.get("latency_last_30m"),
            "provider": best.get("provider_name"),
        }

    fallback = max(candidates, key=lambda e: e.get("uptime_last_30m") or -1)
    return {
        "tps": None,
        "uptime": fallback.get("uptime_last_30m"),
        "latency": fallback.get("latency_last_30m"),
        "provider": fallback.get("provider_name"),
    }


async def _enrich_with_metrics(client: httpx.AsyncClient, stats: list[ModelStats]) -> list[ModelStats]:
    sem = asyncio.Semaphore(TPS_CONCURRENCY)

    async def fetch_one(model: ModelStats) -> dict:
        async with sem:
            endpoints = await _fetch_model_endpoints(client, model["id"])
            return _aggregate_metrics(endpoints)

    metrics = await asyncio.gather(*[fetch_one(m) for m in stats])

    return [
        {
            **m,
            "tps": met["tps"],
            "uptime": met["uptime"],
            "provider": met["provider"] or OPENROUTER_PROVIDER_NAME,
        }
        for m, met in zip(stats, metrics)
    ]


async def fetch_market_data() -> list[ModelStats]:
    async with httpx.AsyncClient() as client:
        try:
            models_r = await client.get(OPENROUTER_MODELS_URL, timeout=ENDPOINT_TIMEOUT_S)
            models_r.raise_for_status()
            all_models = models_r.json().get("data", [])
        except Exception as e:
            print(f"OpenRouter models fetch error: {e}")
            return []

        models_dev_index: dict = {}
        try:
            dev_r = await client.get(MODELS_DEV_URL, timeout=ENDPOINT_TIMEOUT_S)
            dev_r.raise_for_status()
            for provider_data in dev_r.json().values():
                for model_id, model_data in (provider_data.get("models") or {}).items():
                    models_dev_index[model_id.lower()] = model_data
        except Exception:
            pass

        free_models = [m for m in all_models if m.get("pricing", {}).get("prompt") == "0"]
        paid_models = [m for m in all_models if m.get("pricing", {}).get("prompt") != "0"]
        target_models = free_models + paid_models[:150]

        def find_dev_entry(model: dict) -> dict:
            slug = model["id"].split("/")[-1].split(":")[0].lower()
            entry = models_dev_index.get(slug)
            if not entry:
                entry = next((v for v in models_dev_index.values() if v.get("id", "").lower() == slug), None)
            return entry or {}

        base_stats: list[ModelStats] = []
        for model in target_models:
            dev = find_dev_entry(model)
            params = parse_params(model["id"], model.get("name", ""))
            ctx = dev.get("limit", {}).get("context") or model.get("context_length") or 1
            capability = capability_params(params) * math.log10(ctx + 1)
            pricing = model.get("pricing", {})
            is_free = pricing.get("prompt") == "0"
            brain = bool(dev.get("reasoning") or "reasoning" in (model.get("supported_parameters") or []))
            tools = bool(dev.get("tool_call") or "tool_choice" in (model.get("supported_parameters") or []))
            base_stats.append({
                "id": model["id"],
                "name": model.get("name", model["id"]),
                "params": params,
                "ctx": int(ctx),
                "is_free": is_free,
                "capability": capability,
                "brain": brain,
                "tools": tools,
                "open": bool(dev.get("open_weights")),
                "tps": None,
                "uptime": None,
                "provider": OPENROUTER_PROVIDER_NAME,
                "balanced": 0.0,
                "value": _get_value(capability, pricing.get("prompt", "0"), pricing.get("completion", "0")),
                "price_in": float(pricing.get("prompt") or 0.0),
                "price_out": float(pricing.get("completion") or 0.0),
            })

        max_cap = max((m["capability"] for m in base_stats), default=1)
        scored = [
            {**m, "balanced": (m["capability"] / max_cap) * 60 + (20 if m["brain"] else 0) + 20}
            for m in base_stats
        ]

        enriched = await _enrich_with_metrics(client, scored)
        return sorted(enriched, key=lambda m: m["balanced"], reverse=True)
