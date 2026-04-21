# 🚀 ZeroCostLLM

**The Smartest Free AI Infrastructure on the Planet.**

ZeroCostLLM is a self-maintaining, autonomous OpenAI-compatible proxy server. It mathematically identifies the highest-IQ free models available on the market (OpenRouter Free Tier), monitors their live health, and routes your traffic to the best available provider with automatic failover.

## ✨ Key Features

*   **🧠 Mathematical IQ Ranking:** Uses a verified capability formula `(Params × log(Context))` cross-referenced with the `models.dev` database to rank models by intelligence, not hype.
*   **📡 Live Health Monitoring:** Authenticates against OpenRouter endpoints to pull real-time Uptime (%) and authenticated Throughput (TPS).
*   **🔄 Autonomous Failover:** Integrated `APScheduler` refreshes rankings every 60 minutes. If the #1 model goes down, the server silently jumps to the next best in the pool.
*   **🏎️ Nitro-Optimized:** Uses OpenRouter's `sort: throughput` routing to ensure you are always using the fastest provider for any given model ID.
*   **🛠️ Dynamic Tuning:** Hot-swap weights (IQ vs. Speed vs. Reliability) via a `config.json` or on-the-fly via the `/v1/refresh` endpoint.
*   **🔌 OpenAI Compatible:** Drop-in replacement for any app that supports OpenAI. Just point your base URL to `http://localhost:8000/v1`.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
# Recommended: use uv for blazing fast installs
uv pip install fastapi uvicorn litellm requests pydantic python-dotenv apscheduler rich typer
```

### 2. Configure Environment
Create a `.env` file and add your OpenRouter API Key:
```bash
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

### 3. Start the Server
```bash
python main.py
```
The server is now live at `http://localhost:8000`.

---

## 📊 Management & Tooling

### The Master Ranker CLI
Visualize the entire free-tier market with our rich CLI tool:
```bash
# Default balanced view
python live_health_ranker.py

# Sort by fastest Reasoning models
python live_health_ranker.py --sort brain --sort tps
```

### On-the-Fly Overrides
Change the server's brain without a restart:
```bash
curl -X POST http://localhost:8000/v1/refresh \
  -H "Content-Type: application/json" \
  -d '{"model_pool_size": 3, "weights": {"intelligence": 1.0}}'
```

---

## 🛠️ Configuration (`config.json`)

| Key | Description |
| :--- | :--- |
| `update_interval_minutes` | How often to re-scrape model health. |
| `model_pool_size` | Number of top-tier models to include in the router. |
| `weights.intelligence` | Weight (0.0 - 1.0) for raw parameter/context score. |
| `weights.speed` | Weight (0.0 - 1.0) for real-time TPS. |
| `overrides.blacklist` | Model IDs to never use. |

---

## 🛡️ License
MIT - Built with ❤️ for the community.
