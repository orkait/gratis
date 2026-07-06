"""LMArena (Chatbot Arena) human-preference signal.

Benchmarks and human preference disagree — and the disagreement is the most honest thing a leaderboard
can tell you (reasoning-maxxed models crush benches but humans find them verbose; well-aligned models
win humans but skip the reasoning benches). So we pull LMArena's Elo (real blind A/B human votes,
Bradley-Terry) as an INDEPENDENT axis and flag where it diverges from the benchmark composite.

Data is the community daily snapshot (no key): a `latest.json` pointer → `<date>/text.json`. Fail-open:
a fetch error just means no preference signal, never a crash.
"""

from __future__ import annotations

import re

import httpx

_BASE = "https://raw.githubusercontent.com/oolong-tea-2026/arena-ai-leaderboards/main/data"
_TIMEOUT = 12.0


def _nk(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


async def fetch_arena_elo() -> dict[str, dict]:
    """{normalized_name: {"elo": int, "votes": int}} from the latest Arena text leaderboard, or {}."""
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            ptr = (await client.get(f"{_BASE}/latest.json")).json()
            path = ptr.get("path") or ptr.get("date")
            data = (await client.get(f"{_BASE}/{path}/text.json")).json()
        rows = data.get("models", data) if isinstance(data, dict) else data
        out: dict[str, dict] = {}
        for m in rows or []:
            name = m.get("model") or m.get("name")
            elo = m.get("score") or m.get("elo")
            if name and elo is not None:
                out[_nk(str(name))] = {"elo": elo, "votes": m.get("votes")}
        return out
    except Exception:  # noqa: BLE001 — fail-open: no preference signal, never a crash
        return {}


def attach_arena(models: list[dict], arena: dict[str, dict]) -> list[dict]:
    """Attach arena_elo/votes, a normalized `preference` (0..100), and a divergence label comparing the
    benchmark-overall rank vs the human-Elo rank. Mutates + returns the list."""
    for m in models:
        hit = arena.get(_nk(m.get("name", ""))) or arena.get(_nk(m.get("id", "")))
        m["arena_elo"] = hit["elo"] if hit else None
        m["arena_votes"] = hit.get("votes") if hit else None
        m["preference"] = None
        m["divergence"] = None

    matched = [m for m in models if m["arena_elo"] is not None]
    elos = [m["arena_elo"] for m in matched]
    if len(elos) >= 2:
        lo, hi = min(elos), max(elos)
        for m in matched:
            m["preference"] = round((m["arena_elo"] - lo) / (hi - lo) * 100, 1) if hi > lo else 50.0

    # divergence: where does human preference disagree with the benchmark composite?
    if len(matched) >= 5:
        by_bench = sorted(matched, key=lambda m: -m["scores"]["overall"])
        by_elo = sorted(matched, key=lambda m: -m["arena_elo"])
        brank = {id(m): i for i, m in enumerate(by_bench)}
        erank = {id(m): i for i, m in enumerate(by_elo)}
        n = len(matched)
        for m in matched:
            frac = (brank[id(m)] - erank[id(m)]) / n  # >0: humans rank it higher than benchmarks do
            m["divergence"] = "human-favored" if frac >= 0.25 else "bench-favored" if frac <= -0.25 else "aligned"
    return models
