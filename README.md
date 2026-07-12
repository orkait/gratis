<div align="center">

# Gratis

### Every free LLM, behind one OpenAI-compatible endpoint.

**Point your existing OpenAI code at it, pay nothing, and know which free model is actually worth using.**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![LiteLLM](https://img.shields.io/badge/LiteLLM-4B4BFF?style=for-the-badge)](https://litellm.ai)

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Zustand](https://img.shields.io/badge/Zustand-5-443E38?style=flat-square)](https://zustand.docs.pmnd.rs)
[![TanStack](https://img.shields.io/badge/TanStack-Query%20%2B%20Table-FF4154?style=flat-square&logo=reactquery&logoColor=white)](https://tanstack.com)

</div>

---

Free LLM tiers are everywhere and nobody can keep track of them. Six providers, hundreds of models, wildly uneven quality, and a catalogue that rots weekly as models get retired or moved behind a paid plan.

Gratis does two things about that. It **proxies** every free tier behind one OpenAI-compatible API, so your existing code keeps working and stops costing money. And it **ranks** them, so you know which free model is genuinely good instead of just genuinely free.

## ⚡ Quick start

```bash
git clone https://github.com/orkait/gratis && cd gratis
cp .env.local.example .env.local   # add whichever provider keys you have
python dev.py                      # backend :3460, UI :3470
```

`dev.py` is the whole local stack. It installs deps (`bun install`, `uv sync`), loads `.env.local`, starts both servers with interleaved logs, and shuts them down together on Ctrl+C. Every key is optional: providers you have no key for are skipped, and the rest still work.

<details>
<summary><b>🛠️ All dev.py commands</b></summary>

| Command | What it does |
|---|---|
| `python dev.py` | backend `:3460` + UI `:3470` |
| `python dev.py backend` | backend only |
| `python dev.py ui` | UI only |
| `python dev.py test` | vitest + pytest (`test ui` / `test backend` to narrow) |
| `python dev.py lint` | eslint |
| `python dev.py build` | next build |
| `python dev.py docker up` | docker compose up --build (`--minimal` for the 256MB backend-only image) |
| `python dev.py docker down` | stop the compose stack (`logs`, `ps` also work) |
| `python dev.py deploy` | backend → Railway, UI → Cloudflare Workers (`deploy ui` / `deploy backend` to narrow) |

| Flag | What it does |
|---|---|
| `--env NAME` | load `.env.NAME` instead of `.env.local` |
| `--no-install` | skip the dep install, for fast restarts |
| `--backend-port N`, `--ui-port N` | move a service off its default port |
| `--force-port` | kill whatever holds the port, even if it is not Gratis |
| `--allow-dirty` | deploy a tree that is dirty or unpushed |

If a port is held by something outside this repo, `dev.py` names the process and stops rather than killing it.

</details>

<details>
<summary><b>🚀 Deploying</b></summary>

```bash
python dev.py deploy          # both
python dev.py deploy ui       # frontend only
```

The backend URL is **compiled into the client bundle**, so a build that forgets `NEXT_PUBLIC_API_BASE_URL` inlines the localhost dev default and the deployed site talks to a laptop. `dev.py deploy` removes the chance to get that wrong: it asks Railway for the service's public domain, builds against it, and refuses to upload a bundle that does not contain it or that still mentions localhost.

| Step | Behaviour |
|---|---|
| Preflight | A dirty or unpushed tree does not reach prod |
| Railway | Waits for the build. A failed build leaves prod on the old version, and says so |
| Bundle check | Deploy is aborted if the compiled bundle points anywhere but the real backend |
| Cloudflare | `wrangler` prefers `CLOUDFLARE_API_TOKEN` over an OAuth login, so a stale one in your shell breaks every deploy. It is verified, and ignored when Cloudflare rejects it |
| Retries | Cloudflare's API answering 5xx is retried; a rejected credential is not |
| Verify | Backend `/health` and a 200 from the published route, after the deploy |

| Variable | Default |
|---|---|
| `RAILWAY_SERVICE` | `gratis-backend` |
| `PROD_API_BASE_URL` | asked of Railway |
| `PROD_SITE_URL` | the route in `wrangler.jsonc` |

</details>

```bash
curl localhost:3460/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model": "gratis-auto", "messages": [{"role": "user", "content": "hi"}]}'
```

`gratis-auto` is the point of the whole thing: you do not name a model, and it picks the most capable free one available right now.

> Formerly `zero-cost-intelligent`. That id still works and always will.

## 🎯 What you get

| | |
|---|---|
| 🔌 **Drop-in OpenAI API** | `/v1/chat/completions`, `/v1/embeddings`, `/v1/models`. Streaming included. Change the base URL, change nothing else. |
| 🎭 **Paid names route to free models** | Send `gpt-4o`, get Llama 3.3 70B on Groq. Your code does not know the difference. |
| 🧠 **Pick-for-me routing** | `gratis-auto` selects the strongest free model at request time. |
| 📊 **A real market, not a list** | Models scored on benchmarks, [Artificial Analysis](https://artificialanalysis.ai) intelligence and LMArena Elo, with task lenses for coding, agents, reasoning, price and speed. |
| 🧹 **Dead models remove themselves** | Every listed model has actually answered. Nothing is hand-maintained. |

## 🧹 The self-cleaning catalogue

Most "free LLM" lists are a lie within a month. Models get retired, moved behind a paid plan, or gated behind an agreement, and the list keeps advertising them.

Gratis keeps no list. A model earns its place by answering:

```
a call fails
   ├── 403 gate · 404 gone · "requires a paid plan" · "data policy" ──→ PERMANENT ──→ quarantined
   └── 429 rate limit · 5xx · timeout · anything unrecognised ────────→ TRANSIENT ──→ stays listed

plus a background sweep that verifies free models nobody has tried yet
```

A rate-limited free model is a *working* model, so only failures we positively recognise as permanent remove anything. Quarantines expire, which means the catalogue heals itself: accept a model agreement or upgrade a plan, and the model returns on its own. Paid models are never probed, because that would spend your money to learn something you did not ask for.

On a real run this caught Gemini 2.0 Flash variants that Google had quietly retired. A hardcoded list would still be recommending them.

## 🔑 Providers

Bring whatever keys you have. Six are routed directly, and OpenRouter fans out to dozens more upstream.

| Provider | Env var | Free tier |
|---|---|---|
| Groq | `GROQ_API_KEY` | Yes, generous |
| Google AI Studio | `GOOGLE_AISTUDIO_API_KEY` | Yes, Flash models |
| Cerebras | `CEREBRAS_API_KEY` | Yes |
| Cloudflare Workers AI | `CLOUDFLARE_API_KEY` + `CLOUDFLARE_ACCOUNT_ID` | Yes, 10k neurons/day |
| Ollama Cloud | `OLLAMA_API_KEY` | Yes |
| OpenRouter | `OPENROUTER_API_KEY` | Free models need a [data-policy opt-in](https://openrouter.ai/settings/privacy) |

<details>
<summary><b>⚙️ All configuration</b></summary>

### Backend

| Variable | Default | What it does |
|---|---|---|
| `LOCAL_API_KEY` | *(unset)* | Require `Authorization: Bearer` on the proxy. Unset means open. |
| `MODEL_ALIASES` | built-in map | JSON object, merged over the defaults. |
| `RANKINGS_CACHE_TTL` | `1800` | Seconds to cache the assembled market. |
| `AA_API_KEY` | *(unset)* | Artificial Analysis intelligence index. |
| `AVAILABILITY_ENABLED` | `1` | Kill switch for the self-cleaning catalogue. |
| `AVAILABILITY_UNAVAILABLE_TTL` | `86400` | How long a quarantine lasts before the model is retried. |
| `AVAILABILITY_PROBE_CONCURRENCY` | `3` | Parallel probes in the background sweep. |
| `AVAILABILITY_PROBE_BATCH` | `25` | Models verified per sweep. |
| `AVAILABILITY_PROBE_INTERVAL` | `900` | Seconds between sweeps. |
| `AVAILABILITY_DB_PATH` | `backend/availability.db` | Where verdicts persist. |
| `CLOUDFLARE_API_BASE` | Cloudflare v4 | Override, mainly for testing. |

### Frontend

| Variable | Default | What it does |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3460` | Where the UI finds the backend. |
| `NEXT_PUBLIC_RANKINGS_STALE_MS` | `1800000` | Client cache window, mirrors the backend TTL. |
| `BACKEND_URL` | falls back to the public URL | Server-side base for the chat route. |

</details>

<details>
<summary><b>🔀 Built-in model aliases</b></summary>

Send an OpenAI or Anthropic model name and it is transparently routed to a free equivalent. Override any of these with `MODEL_ALIASES`.

| You send | You get |
|---|---|
| `gpt-4`, `gpt-4-turbo`, `gpt-4o` | `groq/llama-3.3-70b-versatile` |
| `gpt-4o-mini`, `gpt-3.5-turbo` | `groq/llama-3.1-8b-instant` |
| `claude-3-5-sonnet`, `claude-sonnet-4` | `groq/llama-3.3-70b-versatile` |
| `claude-3-5-haiku`, `claude-haiku-4` | `groq/llama-3.1-8b-instant` |
| `claude-3-opus` | `openrouter/anthropic/claude-3-opus` |

</details>

<details>
<summary><b>📡 API reference</b></summary>

| Method | Route | Notes |
|---|---|---|
| `POST` | `/v1/chat/completions` | OpenAI-compatible. `stream: true` supported. |
| `POST` | `/v1/embeddings` | OpenAI-compatible. |
| `GET` | `/v1/models` | OpenAI-compatible listing. Unavailable models filtered out. |
| `GET` | `/v1/models/{id}` | Single model. |
| `GET` | `/v1/rankings` | The scored market. Powers the UI. Not an OpenAI route. |
| `GET` | `/health` | `{"status": "ok"}` |

</details>

## 🏗️ How it fits together

```
┌──────────────────────┐        ┌────────────────────────┐        ┌────────────────┐
│  Next.js 16 UI       │        │  FastAPI backend       │        │  Providers     │
│                      │        │                        │        │                │
│  /models   market    │ ─────▶ │  /v1/rankings          │ ─────▶ │  Groq          │
│  /chats    chat      │ ─────▶ │  /v1/chat/completions  │        │  AI Studio     │
│                      │        │                        │        │  Cerebras      │
│  Zustand             │        │  scoring · arena       │        │  Cloudflare    │
│  TanStack Query      │        │  availability (sqlite) │        │  Ollama Cloud  │
│  TanStack Table      │        │                        │        │  OpenRouter    │
└──────────────────────┘        └────────────────────────┘        └────────────────┘
                                            │
                                            └── litellm routes every provider
```

## 🧪 Development

| Command | What it does |
|---|---|
| `python dev.py` | Backend on `:3460`, UI on `:3470`, logs interleaved |
| `bun run dev` | UI only |
| `bun run test` | Frontend tests (Vitest) |
| `cd backend && uv run pytest providers` | Backend tests |
| `bun run build` | Production build |
| `docker compose up` | Full stack, UI on `:3030`, backend on `:3040` |

Backend dependencies are managed with [uv](https://github.com/astral-sh/uv), frontend with [bun](https://bun.sh).

## 📁 Layout

```
backend/
  main.py                  proxy, model routing, rankings assembly
  providers/
    availability.py        the self-cleaning catalogue
    scoring.py             composite model scoring
    intelligence.py        Artificial Analysis index
    arena.py               LMArena Elo overlay
    {groq,cerebras,cloudflare,openrouter,models}.py
src/
  app/models/              the market
  app/chats/               the chat surface
  components/app/          market table, filters, drawers
  lib/stores/              Zustand slices
  lib/query/               TanStack Query hooks
```

<div align="center">
<sub>Built because free models are abundant, uneven, and impossible to keep track of.</sub>
</div>
