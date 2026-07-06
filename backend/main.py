import asyncio
import os
from contextlib import asynccontextmanager
from typing import Any

import litellm
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from providers.models import fetch_unified_models, fetch_unified_market_stats
from providers.openrouter import fetch_market_data
from providers.groq import (
    fetch_groq_models,
    build_groq_market_stats,
    is_groq_model,
    strip_groq_prefix,
    get_groq_api_key,
)
from providers.cerebras import (
    fetch_cerebras_models,
    build_cerebras_market_stats,
    is_cerebras_model,
    strip_cerebras_prefix,
    get_cerebras_api_key,
)
from providers.cloudflare import (
    fetch_cloudflare_models,
    build_cloudflare_market_stats,
    is_cloudflare_model,
    strip_cloudflare_prefix,
    get_cloudflare_credentials,
)
from providers.intelligence import enrich_with_intelligence
from providers.scoring import score_models
from providers.arena import fetch_arena_elo, attach_arena
from providers.ttl_cache import AsyncTTLCache

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "")
GOOGLE_AISTUDIO_API_KEY = os.getenv("GOOGLE_AISTUDIO_API_KEY", "")
LOCAL_API_KEY = os.getenv("LOCAL_API_KEY", "")
FALLBACK_MODEL = "groq/llama-3.3-70b-versatile"
OLLAMA_CLOUD_BASE = "https://ollama.com/v1"

# Model alias map: clients sending OpenAI/Anthropic names get routed to free equivalents.
# Override with MODEL_ALIASES env (JSON object).
DEFAULT_ALIASES: dict[str, str] = {
    "gpt-4": "groq/llama-3.3-70b-versatile",
    "gpt-4-turbo": "groq/llama-3.3-70b-versatile",
    "gpt-4o": "groq/llama-3.3-70b-versatile",
    "gpt-4o-mini": "groq/llama-3.1-8b-instant",
    "gpt-3.5-turbo": "groq/llama-3.1-8b-instant",
    "claude-3-opus": "openrouter/anthropic/claude-3-opus",
    "claude-3-sonnet": "groq/llama-3.3-70b-versatile",
    "claude-3-haiku": "groq/llama-3.1-8b-instant",
    "claude-3-5-sonnet": "groq/llama-3.3-70b-versatile",
    "claude-3-5-haiku": "groq/llama-3.1-8b-instant",
    "claude-sonnet-4": "groq/llama-3.3-70b-versatile",
    "claude-haiku-4": "groq/llama-3.1-8b-instant",
}


def load_aliases() -> dict[str, str]:
    raw = os.getenv("MODEL_ALIASES", "")
    if not raw:
        return DEFAULT_ALIASES
    try:
        import json
        custom = json.loads(raw)
        if isinstance(custom, dict):
            return {**DEFAULT_ALIASES, **custom}
    except Exception as e:
        print(f"MODEL_ALIASES parse error: {e}")
    return DEFAULT_ALIASES


ALIASES = load_aliases()

litellm.drop_params = True
litellm.set_verbose = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="ZeroCostLLM", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===== OpenAI-compat error envelope =====

def openai_error(message: str, status: int, err_type: str = "api_error", code: str | None = None) -> JSONResponse:
    body = {
        "error": {
            "message": message,
            "type": err_type,
            "code": code,
            "param": None,
        },
    }
    return JSONResponse(status_code=status, content=body)


@app.exception_handler(HTTPException)
async def http_exc_handler(_: Request, exc: HTTPException):
    err_type = "invalid_request_error" if exc.status_code == 400 else "api_error"
    if exc.status_code == 401:
        err_type = "authentication_error"
    elif exc.status_code == 403:
        err_type = "permission_error"
    elif exc.status_code == 404:
        err_type = "not_found_error"
    elif exc.status_code == 429:
        err_type = "rate_limit_error"
    msg = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    return openai_error(msg, exc.status_code, err_type)


@app.exception_handler(RequestValidationError)
async def validation_exc_handler(_: Request, exc: RequestValidationError):
    return openai_error(str(exc.errors()), 400, "invalid_request_error")


# ===== Auth (optional bearer) =====

async def require_auth(authorization: str | None = Header(default=None)):
    if not LOCAL_API_KEY:
        return  # open mode - no auth required
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization[len("Bearer "):].strip()
    if token != LOCAL_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


# ===== Model resolution =====

def resolve_model(model_id: str) -> tuple[str, dict[str, Any]]:
    """Returns (litellm_model_string, extra_kwargs)."""
    if model_id in ALIASES:
        model_id = ALIASES[model_id]

    if model_id.startswith("aistudio/"):
        slug = model_id[len("aistudio/"):]
        return f"gemini/{slug}", {"api_key": GOOGLE_AISTUDIO_API_KEY}

    if is_groq_model(model_id):
        slug = strip_groq_prefix(model_id)
        return f"groq/{slug}", {"api_key": get_groq_api_key()}

    if is_cerebras_model(model_id):
        slug = strip_cerebras_prefix(model_id)
        return f"cerebras/{slug}", {"api_key": get_cerebras_api_key()}

    if is_cloudflare_model(model_id):
        slug = strip_cloudflare_prefix(model_id)
        api_key, account_id = get_cloudflare_credentials()
        return f"cloudflare/{slug}", {"api_key": api_key, "account_id": account_id}

    if model_id.startswith("ollama/"):
        slug = model_id[len("ollama/"):]
        return f"openai/{slug}", {
            "api_base": OLLAMA_CLOUD_BASE,
            "api_key": OLLAMA_API_KEY or "ollama",
        }

    if model_id.startswith("openrouter/"):
        return model_id, {"api_key": OPENROUTER_API_KEY}

    return f"openrouter/{model_id}", {"api_key": OPENROUTER_API_KEY}


async def pick_best_free_model() -> str:
    """Most capable free model from providers that work without account config.

    Avoids OpenRouter for the default pool: its free models require an account
    data-policy opt-in (openrouter.ai/settings/privacy) and 404 otherwise.
    """
    try:
        groq_free = [m for m in build_groq_market_stats(await fetch_groq_models()) if m["is_free"]]
        if groq_free:
            return max(groq_free, key=lambda m: m["capability"])["id"]
    except Exception:
        pass
    return FALLBACK_MODEL


# ===== Chat completions =====

@app.post("/v1/chat/completions", dependencies=[Depends(require_auth)])
async def chat_completions(request: Request) -> Any:
    body = await request.json()
    model_id: str = body.get("model", "")
    is_pool = not model_id or model_id == "zero-cost-intelligent"

    if is_pool:
        model_id = await pick_best_free_model()
    litellm_model, extra = resolve_model(model_id)

    messages = body.get("messages", [])
    stream: bool = body.get("stream", False)

    passthrough = {
        k: v for k, v in body.items()
        if k not in {"model", "messages", "stream"}
    }

    try:
        if stream:
            response = await litellm.acompletion(
                model=litellm_model,
                messages=messages,
                stream=True,
                **extra,
                **passthrough,
            )

            async def event_stream():
                try:
                    async for chunk in response:
                        payload = chunk.model_dump_json()
                        yield f"data: {payload}\n\n"
                except Exception as e:
                    err = {"error": {"message": str(e), "type": "api_error", "code": getattr(e, "status_code", None)}}
                    import json as _json
                    yield f"data: {_json.dumps(err)}\n\n"
                finally:
                    yield "data: [DONE]\n\n"

            return StreamingResponse(
                event_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache, no-transform",
                    "X-Accel-Buffering": "no",
                    "Connection": "keep-alive",
                },
            )

        response = await litellm.acompletion(
            model=litellm_model,
            messages=messages,
            stream=False,
            **extra,
            **passthrough,
        )
        return JSONResponse(content=response.model_dump())

    except HTTPException:
        raise
    except Exception as e:
        status = getattr(e, "status_code", 500) or 500
        raise HTTPException(status_code=status, detail=str(e))


# ===== Embeddings =====

@app.post("/v1/embeddings", dependencies=[Depends(require_auth)])
async def embeddings(request: Request) -> Any:
    body = await request.json()
    model_id: str = body.get("model", "")
    if not model_id:
        raise HTTPException(status_code=400, detail="model field required")
    inputs = body.get("input")
    if inputs is None:
        raise HTTPException(status_code=400, detail="input field required")

    litellm_model, extra = resolve_model(model_id)
    passthrough = {k: v for k, v in body.items() if k not in {"model", "input"}}

    try:
        response = await litellm.aembedding(
            model=litellm_model,
            input=inputs,
            **extra,
            **passthrough,
        )
        return JSONResponse(content=response.model_dump())
    except HTTPException:
        raise
    except Exception as e:
        status = getattr(e, "status_code", 500) or 500
        raise HTTPException(status_code=status, detail=str(e))


# ===== Models =====

@app.get("/v1/models", dependencies=[Depends(require_auth)])
async def models():
    result = await fetch_unified_models()
    return JSONResponse(content=result)


@app.get("/v1/models/{model_id:path}", dependencies=[Depends(require_auth)])
async def model_get(model_id: str):
    listing = await fetch_unified_models()
    found = next((m for m in listing.get("data", []) if m.get("id") == model_id), None)
    if not found:
        raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found")
    return JSONResponse(content=found)


# ===== Rankings (extension) =====

async def _compute_rankings() -> list[dict]:
    (
        openrouter_stats,
        unified_extra,
        groq_raw,
        cerebras_raw,
        cloudflare_raw,
    ) = await asyncio.gather(
        fetch_market_data(),
        fetch_unified_market_stats(),
        fetch_groq_models(),
        fetch_cerebras_models(),
        fetch_cloudflare_models(),
    )

    ollama_stats, aistudio_stats = unified_extra
    groq_stats = build_groq_market_stats(groq_raw)
    cerebras_stats = build_cerebras_market_stats(cerebras_raw)
    cloudflare_stats = build_cloudflare_market_stats(cloudflare_raw)

    extras = ollama_stats + aistudio_stats + groq_stats + cerebras_stats + cloudflare_stats
    all_stats = openrouter_stats + extras
    if not all_stats:
        return []

    max_cap = max((m["capability"] for m in all_stats), default=1)

    def rescore(m: dict) -> dict:
        return {**m, "balanced": (m["capability"] / max_cap) * 60 + (20 if m["brain"] else 0) + 20}

    rescored_extra = [rescore(m) for m in extras]
    combined = sorted(openrouter_stats + rescored_extra, key=lambda m: m["balanced"], reverse=True)
    # Attach real AA intelligence FIRST, then the composite scorer — so intelligence actually drives the
    # ranking (previously it was only decorated on AFTER the crude balanced sort). score_models returns
    # the list sorted by overall, with per-dimension + task-fit scores + archetype for downstream sorts.
    combined = await enrich_with_intelligence(combined)
    combined = score_models(combined)
    # Overlay the human-preference axis (LMArena Elo) + the benchmark-vs-humans divergence flag — the
    # honest triangulation the benchmark composite alone can't give. Fail-open (no Elo → no overlay).
    combined = attach_arena(combined, await fetch_arena_elo())
    return combined


# The full ranking is ~10 external calls (5 provider markets + AA intelligence + LMArena Elo) plus
# scoring. Cache the assembled result so repeat loads within the TTL are instant and don't re-hammer
# upstreams. Empty results (all providers down) are not cached, so recovery isn't pinned out. TTL is
# env-driven; default 1800s (30 min).
RANKINGS_CACHE_TTL = float(os.getenv("RANKINGS_CACHE_TTL", "1800"))
_rankings_cache: AsyncTTLCache[list[dict]] = AsyncTTLCache(ttl=RANKINGS_CACHE_TTL)


@app.get("/v1/rankings")
async def rankings():
    data, hit = await _rankings_cache.get_or_compute(_compute_rankings)
    return JSONResponse(content=data, headers={"X-Cache": "HIT" if hit else "MISS"})


# ===== Health + Root =====

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {
        "name": "ZeroCostLLM",
        "version": "1.0.0",
        "compat": "openai",
        "auth": "required" if LOCAL_API_KEY else "none",
        "endpoints": [
            "/v1/chat/completions",
            "/v1/embeddings",
            "/v1/models",
            "/v1/models/{id}",
            "/v1/rankings",
            "/health",
        ],
        "aliases_count": len(ALIASES),
    }
