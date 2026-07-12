"""Usage metering and rate limiting.

Both read the same table. That is on purpose: a rate limiter that counts something other than what
the usage report bills would eventually disagree with it, and the disagreement would surface as a
customer dispute rather than a test failure.

Recording is fire-and-forget. A metering write must never fail the request it is describing - the
customer got their tokens either way, and losing one row is cheaper than losing the response.
"""

import asyncio
import os
from dataclasses import dataclass

from . import db

RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))


@dataclass(frozen=True)
class UsageSummary:
    requests: int
    prompt_tokens: int
    completion_tokens: int
    errors: int


async def record(
    key_id: str | None,
    endpoint: str,
    status: int,
    model_id: str | None = None,
    prompt_tokens: int | None = None,
    completion_tokens: int | None = None,
    latency_ms: int | None = None,
) -> None:
    if not db.is_configured():
        return
    try:
        await db.execute(
            """insert into usage_events
                   (key_id, endpoint, model_id, status, prompt_tokens, completion_tokens, latency_ms)
               values ($1::uuid, $2, $3, $4, $5, $6, $7)""",
            key_id,
            endpoint,
            model_id,
            status,
            prompt_tokens,
            completion_tokens,
            latency_ms,
        )
    except Exception as e:  # noqa: BLE001 - metering must never break the request path
        print(f"usage record failed: {e}", flush=True)


def record_background(**kwargs) -> None:
    """Fire-and-forget: the response should not wait on a metering insert."""
    if not db.is_configured():
        return
    task = asyncio.create_task(record(**kwargs))
    _BACKGROUND.add(task)
    task.add_done_callback(_BACKGROUND.discard)


# Held so the event loop does not garbage-collect a task that is still running.
_BACKGROUND: set[asyncio.Task] = set()


async def within_rate_limit(key_id: str) -> bool:
    """Sliding one-minute window over the SAME rows the usage report bills from.

    Open when no database is configured: a self-hosted deployment with no Postgres is not a service
    with customers, and refusing every request there would be absurd.
    """
    if not db.is_configured():
        return True

    row = await db.fetchrow(
        """select count(*) as n from usage_events
           where key_id = $1::uuid and created_at > now() - interval '1 minute'""",
        key_id,
    )
    if row is None:
        return True
    return int(row["n"]) < RATE_LIMIT_PER_MINUTE


async def summary(key_id: str, hours: int = 24) -> UsageSummary:
    row = await db.fetchrow(
        """select
               count(*)                                          as requests,
               coalesce(sum(prompt_tokens), 0)                   as prompt_tokens,
               coalesce(sum(completion_tokens), 0)               as completion_tokens,
               count(*) filter (where status >= 400)             as errors
           from usage_events
           where key_id = $1::uuid and created_at > now() - ($2 || ' hours')::interval""",
        key_id,
        str(hours),
    )
    if row is None:
        return UsageSummary(0, 0, 0, 0)
    return UsageSummary(
        requests=int(row["requests"]),
        prompt_tokens=int(row["prompt_tokens"]),
        completion_tokens=int(row["completion_tokens"]),
        errors=int(row["errors"]),
    )
