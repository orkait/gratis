"""Availability verdicts, durable.

This was SQLite on Railway's EPHEMERAL disk, so every deploy destroyed it. The market spent an hour
probing to learn which models are actually dead, and a deploy threw that away: production carried
291 models while dev, having finished a sweep, carried 270. The difference was not a bug in the
learning, it was the learning being deleted.

The store's read API is SYNCHRONOUS - `filter_available()` is called inside a sync request path -
so this keeps an in-memory mirror and writes through to Postgres. Reads never touch the network;
writes are durable. The mirror is refreshed at startup and after each probe sweep.
"""

import time
from typing import Callable

from . import db
from .availability import STATUS_OK, STATUS_UNAVAILABLE, UNAVAILABLE_TTL


class PostgresAvailabilityStore:
    """Same surface as the SQLite store, so nothing above it needs to know which one it has."""

    def __init__(self, clock: Callable[[], float] = time.time):
        self._clock = clock
        self._unavailable: set[str] = set()
        self._verified: set[str] = set()

    # ---- reads: served from the mirror, so the request path never waits on the database ----

    def unavailable_ids(self) -> set[str]:
        return set(self._unavailable)

    def verified_ids(self) -> set[str]:
        return set(self._verified)

    # ---- writes: memory first (so the next read is correct), then durable ----

    def record_ok(self, model_id: str) -> None:
        self._verified.add(model_id)
        self._unavailable.discard(model_id)
        _fire(
            """insert into model_availability (model_id, status, reason, checked_at, expires_at)
               values ($1, $2, null, now(), null)
               on conflict (model_id) do update
                   set status = excluded.status,
                       reason = excluded.reason,
                       checked_at = excluded.checked_at,
                       expires_at = excluded.expires_at""",
            model_id,
            STATUS_OK,
        )

    def record_unavailable(self, model_id: str, reason: str, ttl: float = UNAVAILABLE_TTL) -> None:
        self._unavailable.add(model_id)
        self._verified.add(model_id)
        _fire(
            """insert into model_availability (model_id, status, reason, checked_at, expires_at)
               values ($1, $2, $3, now(), now() + ($4 || ' seconds')::interval)
               on conflict (model_id) do update
                   set status = excluded.status,
                       reason = excluded.reason,
                       checked_at = excluded.checked_at,
                       expires_at = excluded.expires_at""",
            model_id,
            STATUS_UNAVAILABLE,
            reason[:500],
            str(int(ttl)),
        )

    async def refresh(self) -> None:
        """Reload the mirror from Postgres. An EXPIRED quarantine counts as unverified, which is what
        lets the market self-heal: upgrade a plan, accept an agreement, and the model comes back."""
        rows = await db.fetch(
            """select model_id, status
               from model_availability
               where expires_at is null or expires_at > now()"""
        )
        self._unavailable = {r["model_id"] for r in rows if r["status"] == STATUS_UNAVAILABLE}
        self._verified = {r["model_id"] for r in rows}

    def close(self) -> None:  # parity with the SQLite store
        return None


def _fire(query: str, *args) -> None:
    """Write-behind. A verdict that fails to persist must not break the request that produced it -
    the mirror already has it, and the next sweep will write it again."""
    import asyncio

    async def run() -> None:
        try:
            await db.execute(query, *args)
        except Exception as e:  # noqa: BLE001
            print(f"availability persist failed: {e}", flush=True)

    try:
        task = asyncio.create_task(run())
        _PENDING.add(task)
        task.add_done_callback(_PENDING.discard)
    except RuntimeError:
        # No running loop (a sync test, say). The mirror still holds the verdict.
        pass


_PENDING: set = set()
