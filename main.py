import os
import json
import math
import asyncio
import requests
import re
import concurrent.futures
from typing import List, Dict, Optional
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from litellm import Router
import litellm
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# 1. Load Environment
load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
LITELLM_EXTRA_HEADERS = {
    "HTTP-Referer": "https://github.com/orkait/zerocostllm",
    "X-Title": "ZeroCostLLM Autonomous Server"
}

app = FastAPI(title="ZeroCostLLM Autonomous API")
scheduler = AsyncIOScheduler()
router = None

# --- CONFIG MANAGEMENT ---

def load_server_config() -> Dict:
    default_config = {
        "update_interval_minutes": 60,
        "model_pool_size": 10,
        "weights": {"intelligence": 0.6, "reasoning": 0.2, "speed": 0.1, "stability": 0.1},
        "overrides": {"blacklist": [], "priority_models": []}
    }
    if os.path.exists("config.json"):
        try:
            with open("config.json", "r") as f:
                user_conf = json.load(f)
                # Basic merge
                for k, v in user_conf.items():
                    if isinstance(v, dict) and k in default_config:
                        default_config[k].update(v)
                    else:
                        default_config[k] = v
        except: pass
    return default_config

# --- RANKING LOGIC ---

def fetch_live_data(config: Dict):
    w = config["weights"]
    try:
        resp = requests.get("https://openrouter.ai/api/v1/models", timeout=10)
        or_free = [m for m in resp.json().get("data", []) if m.get("pricing", {}).get("prompt") == "0" and m.get("pricing", {}).get("completion") == "0"]
        
        blacklist = config["overrides"].get("blacklist", [])
        or_free = [m for m in or_free if m["id"] not in blacklist]

        def get_stats(mid):
            headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}"} if OPENROUTER_API_KEY else {}
            r = requests.get(f"https://openrouter.ai/api/v1/models/{mid}/endpoints", headers=headers, timeout=5)
            if r.status_code == 200:
                data = r.json().get("data", {})
                endpoints = data.get("endpoints", [])
                if not endpoints: return {"uptime": 0, "tps": 0}
                ep = endpoints[0]
                tps = ep.get("throughput_last_30m", {}).get("p50", 0) if isinstance(ep.get("throughput_last_30m"), dict) else 0
                return {"uptime": ep.get("uptime_last_1d", 0), "tps": tps}
            return {"uptime": 0, "tps": 0}

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            stats_map = {m["id"]: executor.submit(get_stats, m["id"]) for m in or_free}
            
        temp_data = []
        for m in or_free:
            name_text = (m.get("name", "") + m["id"]).lower()
            matches = re.findall(r'(\d+)b', name_text)
            params = max([float(x) for x in matches]) if matches else 1.0
            ctx = m.get("context_length", 1)
            cap = params * math.log10(ctx + 1)
            s = stats_map[m["id"]].result()
            temp_data.append({"id": m["id"], "cap": cap, "tps": s["tps"], "up": s["uptime"], "brain": 1 if "reasoning" in m.get("supported_parameters", []) else 0})

        if not temp_data: return []

        max_cap = max(x["cap"] for x in temp_data) or 1
        max_tps = max(x["tps"] for x in temp_data) or 1
        
        scored_list = []
        for x in temp_data:
            score = (
                (x["cap"] / max_cap) * w["intelligence"] +
                (x["brain"] * w["reasoning"]) +
                (math.log10(x["tps"] + 1) / math.log10(max_tps + 1) if max_tps > 0 else 0) * w["speed"] +
                (x["up"] / 100.0) * w["stability"]
            )
            if x["id"] in config["overrides"].get("priority_models", []): score += 10.0
            scored_list.append({"id": x["id"], "score": score})
            
        scored_list.sort(key=lambda x: x["score"], reverse=True)
        return [x["id"] for x in scored_list[:config["model_pool_size"]]]
    except Exception as e:
        print(f"Update failed: {e}")
        return []

async def update_router(overrides: Optional[Dict] = None):
    global router
    config = load_server_config()
    if overrides:
        for k, v in overrides.items():
            if isinstance(v, dict) and k in config:
                config[k].update(v)
            else: config[k] = v

    print(f"🔄 Syncing Top {config['model_pool_size']} models with weights: {config['weights']}")
    top_models = await asyncio.to_thread(fetch_live_data, config)
    
    if not top_models: return

    model_list = []
    for model_id in top_models:
        model_list.append({
            "model_name": "zero-cost-intelligent",
            "litellm_params": {
                "model": f"openrouter/{model_id}",
                "api_key": OPENROUTER_API_KEY,
                "extra_headers": LITELLM_EXTRA_HEADERS,
                "extra_body": {"provider": {"sort": "throughput"}}
            }
        })
    
    router = Router(
        model_list=model_list,
        routing_strategy="latency-based-routing",
        num_retries=2,
        fallbacks=[{"zero-cost-intelligent": ["zero-cost-intelligent"]}]
    )
    print(f"✅ Router updated. Best: {top_models[0]}")

# --- API ENDPOINTS ---

@app.on_event("startup")
async def startup_event():
    await update_router()
    config = load_server_config()
    scheduler.add_job(update_router, 'interval', minutes=config["update_interval_minutes"])
    scheduler.start()

@app.post("/v1/refresh")
async def force_refresh(request: Request):
    """Endpoint to manually force a re-ranking. Accepts optional config overrides in body."""
    try:
        body = await request.json()
    except:
        body = None
    
    await update_router(overrides=body)
    return {"status": "success", "message": "Rankings refreshed with overrides." if body else "Rankings refreshed."}

@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    if not router: return JSONResponse({"error": "Router initializing..."}, status_code=503)
    body = await request.json()
    body["model"] = "zero-cost-intelligent"
    response = await router.acompletion(**body)
    if body.get("stream", False):
        async def generate():
            async for chunk in response: yield f"data: {chunk.json()}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(generate(), media_type="text/event-stream")
    return JSONResponse(content=response.model_dump())

@app.get("/v1/models")
async def get_models():
    return {"object": "list", "data": [{"id": "zero-cost-intelligent"}]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
