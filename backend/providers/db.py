"""Postgres pool + migrations.

The database is OPTIONAL. Without DATABASE_URL the service still runs - it just loses the things
only a database can give it (durable availability learning, API keys, metering, history), and
/health says so out loud rather than pretending everything is fine.

That is deliberate: local dev and self-hosting must not require Postgres, and a service that
silently degrades is the bug this codebase has already been bitten by twice.
"""

import os
import pathlib
from typing import Any

import asyncpg

DATABASE_URL = os.getenv("DATABASE_URL", "")
POOL_MIN = int(os.getenv("DB_POOL_MIN", "1"))
POOL_MAX = int(os.getenv("DB_POOL_MAX", "10"))

MIGRATIONS_DIR = pathlib.Path(__file__).resolve().parent.parent / "migrations"

_pool: asyncpg.Pool | None = None


def is_configured() -> bool:
    return bool(DATABASE_URL)


async def connect() -> asyncpg.Pool | None:
    """Open the pool and run migrations. Returns None when no database is configured."""
    global _pool
    if not is_configured():
        return None
    if _pool is not None:
        return _pool

    _pool = await asyncpg.create_pool(DATABASE_URL, min_size=POOL_MIN, max_size=POOL_MAX)
    await _migrate(_pool)
    return _pool


async def disconnect() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def pool() -> asyncpg.Pool | None:
    return _pool


async def _migrate(p: asyncpg.Pool) -> None:
    """Numbered SQL files, applied once, in order. No ORM and no magic: the schema is the file."""
    async with p.acquire() as conn:
        await conn.execute(
            "create table if not exists schema_migrations ("
            " version text primary key,"
            " applied_at timestamptz not null default now())"
        )
        applied = {r["version"] for r in await conn.fetch("select version from schema_migrations")}

        for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
            version = path.stem
            if version in applied:
                continue
            # One transaction per migration: a half-applied schema is worse than none.
            async with conn.transaction():
                await conn.execute(path.read_text())
                await conn.execute(
                    "insert into schema_migrations (version) values ($1)", version
                )
            print(f"migration applied: {version}", flush=True)


async def fetch(query: str, *args: Any) -> list[asyncpg.Record]:
    p = pool()
    if p is None:
        return []
    async with p.acquire() as conn:
        return await conn.fetch(query, *args)


async def fetchrow(query: str, *args: Any) -> asyncpg.Record | None:
    p = pool()
    if p is None:
        return None
    async with p.acquire() as conn:
        return await conn.fetchrow(query, *args)


async def execute(query: str, *args: Any) -> str:
    p = pool()
    if p is None:
        return ""
    async with p.acquire() as conn:
        return await conn.execute(query, *args)
