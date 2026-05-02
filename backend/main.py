import asyncio
import json
import math
import os
from contextlib import asynccontextmanager
from typing import Any

import litellm
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
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

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "")
GOOGLE_AISTUDIO_API_KEY = os.getenv("GOOGLE_AISTUDIO_API_KEY", "")
FALLBACK_MODEL = "openrouter/google/gemma-3-27b-it:free"
OLLAMA_CLOUD_BASE = "https://ollama.com/v1"

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


def resolve_model(model_id: str) -> tuple[str, dict[str, Any]]:
    """Returns (litellm_model_string, extra_kwargs)."""
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
    try:
        market = await fetch_market_data()
        best = next((m for m in market if m["is_free"]), None)
        return f"openrouter/{best['id']}" if best else FALLBACK_MODEL
    except Exception:
        return FALLBACK_MODEL


@app.post("/v1/chat/completions")
async def chat_completions(request: Request) -> Any:
    body = await request.json()
    model_id: str = body.get("model", "")
    is_pool = not model_id or model_id == "zero-cost-intelligent"

    if is_pool:
        model_id = await pick_best_free_model()
        litellm_model, extra = resolve_model(model_id)
    else:
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
                async for chunk in response:
                    yield f"data: {chunk.model_dump_json()}\n\n"
                yield "data: [DONE]\n\n"

            return StreamingResponse(event_stream(), media_type="text/event-stream")

        response = await litellm.acompletion(
            model=litellm_model,
            messages=messages,
            stream=False,
            **extra,
            **passthrough,
        )
        return JSONResponse(content=response.model_dump())

    except Exception as e:
        status = getattr(e, "status_code", 500)
        msg = str(e)
        raise HTTPException(status_code=status, detail=msg)


@app.get("/v1/rankings")
async def rankings():
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
        return JSONResponse(content=[])

    max_cap = max((m["capability"] for m in all_stats), default=1)

    def rescore(m: dict) -> dict:
        return {**m, "balanced": (m["capability"] / max_cap) * 60 + (20 if m["brain"] else 0) + 20}

    rescored_extra = [rescore(m) for m in extras]
    combined = sorted(openrouter_stats + rescored_extra, key=lambda m: m["balanced"], reverse=True)
    return JSONResponse(content=combined)


@app.get("/v1/models")
async def models():
    result = await fetch_unified_models()
    return JSONResponse(content=result)


@app.get("/health")
async def health():
    return {"status": "ok"}
