"""Durable market: a cold-start cache and a time series.

Two things a service needs that an in-memory TTL cache cannot give:

  cold start   A fresh instance had to refetch ~10 upstreams (5 provider catalogues + Artificial
               Analysis + the arena feed) before it could answer its first request. Now it answers
               from the last snapshot immediately and refreshes behind the request.

  history      "Did this model get cheaper?" and "is its score drifting?" were unanswerable, because
               the market only ever knew about right now.
"""

import json
import os

from . import db

SNAPSHOT_RETENTION = int(os.getenv("MARKET_SNAPSHOT_RETENTION", "48"))
HISTORY_FIELDS = ("overall", "intelligence")


async def save_snapshot(models: list[dict]) -> None:
    """Persist the assembled market, and fold each model into the time series."""
    if not db.is_configured() or not models:
        return

    try:
        await db.execute(
            "insert into market_snapshots (models) values ($1::jsonb)", json.dumps(models)
        )
        await _append_history(models)
        # Keep the table from growing without bound; the history table is the long-lived record.
        await db.execute(
            """delete from market_snapshots
               where id not in (
                   select id from market_snapshots order by captured_at desc limit $1
               )""",
            SNAPSHOT_RETENTION,
        )
    except Exception as e:  # noqa: BLE001 - a snapshot failure must not break the market response
        print(f"market snapshot failed: {e}", flush=True)


async def latest_snapshot() -> list[dict] | None:
    """The last assembled market, for answering before the upstreams have been refetched."""
    if not db.is_configured():
        return None
    row = await db.fetchrow(
        "select models from market_snapshots order by captured_at desc limit 1"
    )
    if row is None:
        return None
    models = row["models"]
    return json.loads(models) if isinstance(models, str) else models


async def _append_history(models: list[dict]) -> None:
    """One row per model per snapshot. The primary key is (model_id, captured_at), so a re-run at
    the same instant is idempotent rather than a duplicate."""
    rows = []
    for m in models:
        scores = m.get("scores") or {}
        rows.append(
            (
                m["id"],
                scores.get("overall"),
                scores.get("intelligence"),
                m.get("price_in"),
                m.get("price_out"),
                bool(m.get("is_free")),
            )
        )

    pool = db.pool()
    if pool is None:
        return

    async with pool.acquire() as conn:
        await conn.executemany(
            """insert into model_history
                   (model_id, captured_at, overall, intelligence, price_in, price_out, is_free)
               values ($1, date_trunc('hour', now()), $2, $3, $4, $5, $6)
               on conflict (model_id, captured_at) do nothing""",
            rows,
        )


async def history(model_id: str, days: int = 30) -> list[dict]:
    """Price and score over time for one model."""
    rows = await db.fetch(
        """select captured_at, overall, intelligence, price_in, price_out, is_free
           from model_history
           where model_id = $1 and captured_at > now() - ($2 || ' days')::interval
           order by captured_at asc""",
        model_id,
        str(days),
    )
    return [
        {
            "captured_at": r["captured_at"].isoformat(),
            "overall": r["overall"],
            "intelligence": r["intelligence"],
            "price_in": r["price_in"],
            "price_out": r["price_out"],
            "is_free": r["is_free"],
        }
        for r in rows
    ]
