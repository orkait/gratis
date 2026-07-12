"""Per-consumer API keys.

The raw key is generated once, returned once, and NEVER stored. What the database keeps is a
SHA-256 digest, so a dump of `api_keys` hands an attacker nothing usable. The prefix is stored
separately purely so a human can identify a key in a list without the value being a credential.

Lookup is by hash, not by a scan-and-compare, so an extra key in the table costs nothing.
"""

import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime

from . import db

KEY_PREFIX = "gr_live_"
KEY_BYTES = 24  # 192 bits of entropy, url-safe
PREFIX_DISPLAY_CHARS = len(KEY_PREFIX) + 6


class Scope:
    """What a key is allowed to do. A market-only consumer must not be able to spend inference."""

    MARKET = "market"  # read the rankings / catalogue
    INFERENCE = "inference"  # chat + embeddings
    ADMIN = "admin"  # mint and revoke keys


DEFAULT_SCOPES = (Scope.MARKET, Scope.INFERENCE)


@dataclass(frozen=True)
class ApiKey:
    id: str
    tenant: str
    name: str
    key_prefix: str
    scopes: tuple[str, ...]
    created_at: datetime
    last_used_at: datetime | None
    revoked_at: datetime | None

    def has(self, scope: str) -> bool:
        return scope in self.scopes


def hash_key(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def generate_key() -> tuple[str, str, str]:
    """-> (raw, hash, display_prefix). The raw value is the only time it ever exists in plaintext."""
    raw = KEY_PREFIX + secrets.token_urlsafe(KEY_BYTES)
    return raw, hash_key(raw), raw[:PREFIX_DISPLAY_CHARS]


async def create(tenant: str, name: str, scopes: tuple[str, ...] = DEFAULT_SCOPES) -> tuple[str, ApiKey]:
    """Mint a key. The raw value is returned ONCE - it cannot be recovered afterwards."""
    raw, digest, prefix = generate_key()
    row = await db.fetchrow(
        """insert into api_keys (tenant, name, key_hash, key_prefix, scopes)
           values ($1, $2, $3, $4, $5)
           returning id, tenant, name, key_prefix, scopes, created_at, last_used_at, revoked_at""",
        tenant,
        name,
        digest,
        prefix,
        list(scopes),
    )
    if row is None:
        raise RuntimeError("api key creation requires a database")
    return raw, _to_key(row)


async def authenticate(raw: str) -> ApiKey | None:
    """Resolve a raw key. Returns None when unknown or revoked - the caller must not distinguish
    the two to a client, or it becomes an oracle for which keys exist."""
    row = await db.fetchrow(
        """select id, tenant, name, key_prefix, scopes, created_at, last_used_at, revoked_at
           from api_keys
           where key_hash = $1 and revoked_at is null""",
        hash_key(raw),
    )
    if row is None:
        return None

    # Best-effort; a failed touch must never fail the request it is describing.
    await db.execute("update api_keys set last_used_at = now() where id = $1", row["id"])
    return _to_key(row)


async def revoke(key_id: str) -> bool:
    result = await db.execute(
        "update api_keys set revoked_at = now() where id = $1::uuid and revoked_at is null",
        key_id,
    )
    return result.endswith("1")


async def list_keys(tenant: str | None = None) -> list[ApiKey]:
    if tenant:
        rows = await db.fetch(
            """select id, tenant, name, key_prefix, scopes, created_at, last_used_at, revoked_at
               from api_keys where tenant = $1 order by created_at desc""",
            tenant,
        )
    else:
        rows = await db.fetch(
            """select id, tenant, name, key_prefix, scopes, created_at, last_used_at, revoked_at
               from api_keys order by created_at desc"""
        )
    return [_to_key(r) for r in rows]


def _to_key(row) -> ApiKey:
    return ApiKey(
        id=str(row["id"]),
        tenant=row["tenant"],
        name=row["name"],
        key_prefix=row["key_prefix"],
        scopes=tuple(row["scopes"] or ()),
        created_at=row["created_at"],
        last_used_at=row["last_used_at"],
        revoked_at=row["revoked_at"],
    )
