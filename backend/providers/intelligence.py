import os
import time

import httpx

AA_API_URL = "https://artificialanalysis.ai/api/v2/data/llms/models"
AA_TIMEOUT_S = 20.0
CACHE_TTL_S = 600.0

_ALIAS_TAILS = ("-fast", "-latest")

_cache: dict = {"data": None, "ts": 0.0}


def get_aa_api_key() -> str:
    return os.getenv("AA_API_KEY", "")


def normalize_slug(model_id: str) -> str:
    """Reduce any provider model id to a bare AA-comparable slug.

    e.g. groq/openai/gpt-oss-120b -> gpt-oss-120b
         openrouter/openai/gpt-oss-120b:free -> gpt-oss-120b
         aistudio/gemini-2.5-pro -> gemini-2-5-pro
    """
    s = model_id.lower().split(":")[0]
    s = s.split("/")[-1]
    s = s.replace(".", "-")
    for tail in _ALIAS_TAILS:
        if s.endswith(tail):
            s = s[: -len(tail)]
    return s


def _norm_aa_slug(slug: str) -> str:
    return slug.lower().replace(".", "-")


def _build_index_map(raw: list[dict]) -> dict[str, dict]:
    """slug -> {intel, coding, math, gpqa, mmlu_pro}, keeping max intel per slug."""
    result: dict[str, dict] = {}
    for m in raw:
        evals = m.get("evaluations") or {}
        intel = evals.get("artificial_analysis_intelligence_index")
        if intel is None:
            continue
        norm = _norm_aa_slug(m.get("slug", ""))
        if not norm:
            continue
        prev = result.get(norm)
        if prev is None or intel > prev["intel"]:
            result[norm] = {
                "intel": intel,
                "coding": evals.get("artificial_analysis_coding_index"),
                "math": evals.get("artificial_analysis_math_index"),
                "gpqa": evals.get("gpqa"),
                "mmlu_pro": evals.get("mmlu_pro"),
            }
    return result


async def fetch_aa_index() -> dict[str, dict]:
    """Cached map of normalized-slug -> intelligence metrics. {} if no key or error."""
    now = time.monotonic()
    if _cache["data"] is not None and now - _cache["ts"] < CACHE_TTL_S:
        return _cache["data"]

    key = get_aa_api_key()
    if not key:
        _cache["data"] = {}
        _cache["ts"] = now
        return {}

    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                AA_API_URL,
                headers={"x-api-key": key},
                timeout=AA_TIMEOUT_S,
            )
            r.raise_for_status()
            data = r.json().get("data", [])
        index = _build_index_map(data)
        _cache["data"] = index
        _cache["ts"] = now
        return index
    except Exception as e:
        print(f"Artificial Analysis fetch error: {e}")
        # cache an empty result briefly so a hard-down AA doesn't block every request
        _cache["data"] = {}
        _cache["ts"] = now
        return {}


async def enrich_with_intelligence(stats: list[dict]) -> list[dict]:
    """Attach real AA intelligence index to each stat; mark heuristic fallback."""
    index = await fetch_aa_index()
    for m in stats:
        hit = index.get(normalize_slug(m["id"]))
        if hit:
            m["intel"] = hit["intel"]
            m["intel_coding"] = hit["coding"]
            m["intel_math"] = hit["math"]
            m["intel_est"] = False
        else:
            m["intel"] = None
            m["intel_coding"] = None
            m["intel_math"] = None
            m["intel_est"] = True
    return stats
