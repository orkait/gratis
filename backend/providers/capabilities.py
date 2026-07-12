"""What this deployment can actually do, given the keys it was started with.

Production ran for hours with no AA_API_KEY. Nothing failed, nothing logged, and nothing looked
broken from the outside - the market simply degraded into nonsense: with no intelligence index every
model fell back to the capability heuristic (params x log(context)), so a 1T model ranked #1 and
every sub-score on every row was identical.

A missing key must be LOUD. Silence is the bug: a degraded market is indistinguishable from a
working one unless you happen to know what the numbers should look like.
"""

import os
from dataclasses import dataclass

# Two env files exist and it is a trap: `.env.local` (used by docker-compose and the frontend) and
# `backend/.env` (loaded by load_dotenv when the backend runs from its own directory). AA_API_KEY
# lived only in the second one, which is exactly why it was missed when provisioning the host.
AA_KEY = "AA_API_KEY"
DATABASE = "DATABASE_URL"


@dataclass(frozen=True)
class Capability:
    name: str
    env_var: str
    #: what silently breaks when the key is absent
    degradation: str


CAPABILITIES: tuple[Capability, ...] = (
    Capability(
        name="durable_state",
        env_var=DATABASE,
        degradation=(
            "No database: API keys, usage metering and price history are unavailable, and "
            "availability learning falls back to SQLite on local disk - which on an ephemeral "
            "host is destroyed on every deploy, taking an hour of probing with it."
        ),
    ),
    Capability(
        name="intelligence",
        env_var=AA_KEY,
        degradation=(
            "No Artificial Analysis key: model scores fall back to a size heuristic "
            "(params x log(context)). The ranking will look plausible and be meaningless - "
            "the biggest model wins and every dimension scores the same."
        ),
    ),
)


def missing_capabilities() -> list[Capability]:
    return [c for c in CAPABILITIES if not os.getenv(c.env_var)]


def degradations() -> list[dict[str, str]]:
    """Machine-readable, for /health. An operator should not have to read logs to see this."""
    return [
        {"capability": c.name, "missing_env": c.env_var, "impact": c.degradation}
        for c in missing_capabilities()
    ]


def warn_on_startup() -> None:
    for capability in missing_capabilities():
        print(f"WARNING [{capability.env_var} not set] {capability.degradation}", flush=True)
