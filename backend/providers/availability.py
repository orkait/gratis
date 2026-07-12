"""Runtime model availability. No maintained list - every verdict is learned from a real call.

Two sources write to one store:
  reactive    - a live chat/embedding call fails permanently (403 plan gate, 404 gone) -> quarantine
  lazy probe  - a background sweep tries models that have never been verified, once each

Only *permanent* failures quarantine. Rate limits, 5xx and timeouts are the normal weather of free
tiers and must never remove a model, so anything we don't positively recognise as permanent is
treated as transient. We remove a model only when we are sure.

401 is deliberately transient: a bad/expired provider key would otherwise quarantine that provider's
entire catalogue on a config mistake. A missing key already yields an empty provider fetch upstream.

Quarantines expire (default 24h) so the market self-heals: upgrade a Workers plan or accept a model
agreement and the model returns on its own. "ok" verdicts do not expire - a model that later breaks
is caught by the reactive path, so there is no need to re-probe it on a timer.
"""

import asyncio
import os
import sqlite3
import time
from typing import Awaitable, Callable, Iterable

STATUS_OK = "ok"
STATUS_UNAVAILABLE = "unavailable"

_DEFAULT_DB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "availability.db")

DB_PATH = os.getenv("AVAILABILITY_DB_PATH", _DEFAULT_DB)
ENABLED = os.getenv("AVAILABILITY_ENABLED", "1") not in {"0", "false", "False"}
UNAVAILABLE_TTL = float(os.getenv("AVAILABILITY_UNAVAILABLE_TTL", "86400"))
PROBE_CONCURRENCY = int(os.getenv("AVAILABILITY_PROBE_CONCURRENCY", "3"))
PROBE_BATCH = int(os.getenv("AVAILABILITY_PROBE_BATCH", "25"))
PROBE_INTERVAL = float(os.getenv("AVAILABILITY_PROBE_INTERVAL", "900"))

# Matched against the error text, before status codes. A provider that spells out *why* it refused is
# more trustworthy than the HTTP code it wrapped that refusal in.
PERMANENT_MARKERS = (
    "workers paid plan",
    "model agreement",
    "no endpoints found",
    "data policy",
    "no such model",
    "model not found",
    "does not exist",
    "unsupported model",
    "not available on the",
    "decommissioned",
    "has been deprecated",
)

# Checked after PERMANENT_MARKERS. Note "connection" is NOT a marker here: litellm wraps permanent
# provider refusals in APIConnectionError, whose text contains the substring "connection".
TRANSIENT_MARKERS = (
    "rate limit",
    "rate_limit",
    "quota",
    "timeout",
    "timed out",
    "overloaded",
    "capacity",
    "temporarily",
    "try again",
    "service unavailable",
)

PERMANENT_STATUS = {403, 404, 422}


def classify_failure(status: int | None, message: str) -> str:
    """-> "permanent" (quarantine) or "transient" (ignore). Unknown errors are transient."""
    msg = (message or "").lower()
    if any(m in msg for m in PERMANENT_MARKERS):
        return "permanent"
    if any(m in msg for m in TRANSIENT_MARKERS):
        return "transient"
    if status in PERMANENT_STATUS:
        return "permanent"
    return "transient"


class AvailabilityStore:
    """SQLite-backed verdict store. Survives restarts so a known-broken model stays filtered."""

    def __init__(self, db_path: str = DB_PATH, clock: Callable[[], float] = time.time):
        self._clock = clock
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._conn.execute(
            """CREATE TABLE IF NOT EXISTS model_availability (
                   model_id   TEXT PRIMARY KEY,
                   status     TEXT NOT NULL,
                   reason     TEXT,
                   checked_at REAL NOT NULL,
                   expires_at REAL
               )"""
        )
        self._conn.commit()

    def record_ok(self, model_id: str) -> None:
        self._write(model_id, STATUS_OK, None, expires_at=None)

    def record_unavailable(self, model_id: str, reason: str, ttl: float = UNAVAILABLE_TTL) -> None:
        self._write(model_id, STATUS_UNAVAILABLE, reason[:500], expires_at=self._clock() + ttl)

    def _write(self, model_id: str, status: str, reason: str | None, expires_at: float | None) -> None:
        self._conn.execute(
            """INSERT INTO model_availability (model_id, status, reason, checked_at, expires_at)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(model_id) DO UPDATE SET
                   status=excluded.status, reason=excluded.reason,
                   checked_at=excluded.checked_at, expires_at=excluded.expires_at""",
            (model_id, status, reason, self._clock(), expires_at),
        )
        self._conn.commit()

    def unavailable_ids(self) -> set[str]:
        now = self._clock()
        rows = self._conn.execute(
            "SELECT model_id FROM model_availability WHERE status=? AND (expires_at IS NULL OR expires_at > ?)",
            (STATUS_UNAVAILABLE, now),
        ).fetchall()
        return {r[0] for r in rows}

    def verified_ids(self) -> set[str]:
        """Models with a verdict that still stands - an expired quarantine counts as unverified."""
        now = self._clock()
        rows = self._conn.execute(
            "SELECT model_id FROM model_availability WHERE expires_at IS NULL OR expires_at > ?",
            (now,),
        ).fetchall()
        return {r[0] for r in rows}

    def close(self) -> None:
        self._conn.close()


def filter_available(models: list[dict], store: AvailabilityStore) -> list[dict]:
    if not ENABLED:
        return models
    blocked = store.unavailable_ids()
    return [m for m in models if m.get("id") not in blocked]


def record_call_failure(store: AvailabilityStore, model_id: str, status: int | None, message: str) -> bool:
    """Reactive path. Returns True when the model was quarantined."""
    if not ENABLED or not model_id:
        return False
    if classify_failure(status, message) != "permanent":
        return False
    store.record_unavailable(model_id, message)
    return True


def pick_unverified(models: list[dict], store: AvailabilityStore, limit: int = PROBE_BATCH) -> list[str]:
    """Free models only. Probing a paid model would spend the user's money to learn nothing they asked for."""
    verified = store.verified_ids()
    out = [m["id"] for m in models if m.get("is_free") and m.get("id") not in verified]
    return out[:limit]


async def probe_models(
    model_ids: Iterable[str],
    probe: Callable[[str], Awaitable[None]],
    store: AvailabilityStore,
    concurrency: int = PROBE_CONCURRENCY,
) -> dict[str, str]:
    """Run `probe` per model, recording a verdict for each. `probe` raises on failure.

    Transient failures record nothing, leaving the model unverified so a later sweep retries it.
    """
    sem = asyncio.Semaphore(max(1, concurrency))
    verdicts: dict[str, str] = {}

    async def one(model_id: str) -> None:
        async with sem:
            try:
                await probe(model_id)
            except Exception as e:  # noqa: BLE001 - provider SDKs raise anything
                status = getattr(e, "status_code", None)
                message = str(e)
                if classify_failure(status, message) == "permanent":
                    store.record_unavailable(model_id, message)
                    verdicts[model_id] = STATUS_UNAVAILABLE
                else:
                    verdicts[model_id] = "transient"
                return
            store.record_ok(model_id)
            verdicts[model_id] = STATUS_OK

    await asyncio.gather(*(one(m) for m in model_ids))
    return verdicts
