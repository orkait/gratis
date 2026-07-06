"""Single-flight, in-memory TTL cache for expensive async computations.

Reusable across endpoints. The clock is injectable so TTL behaviour is testable without sleeping.
Empty/falsy results are not cached by default, so a transient upstream failure (every provider down
-> empty list) is retried on the next request instead of being pinned for the whole TTL.
"""

import asyncio
import time
from typing import Awaitable, Callable, Generic, TypeVar

T = TypeVar("T")


class AsyncTTLCache(Generic[T]):
    def __init__(self, ttl: float, clock: Callable[[], float] = time.monotonic):
        self._ttl = ttl
        self._clock = clock
        self._value: T | None = None
        self._expires_at = 0.0
        self._lock = asyncio.Lock()

    def _fresh(self, now: float) -> bool:
        return self._value is not None and now < self._expires_at

    async def get_or_compute(
        self, compute: Callable[[], Awaitable[T]], *, cache_empty: bool = False
    ) -> tuple[T, bool]:
        """Return (value, hit). `hit` is True when served from cache."""
        if self._fresh(self._clock()):
            return self._value, True  # type: ignore[return-value]
        async with self._lock:
            if self._fresh(self._clock()):
                return self._value, True  # type: ignore[return-value]
            value = await compute()
            if cache_empty or value:
                self._value = value
                self._expires_at = self._clock() + self._ttl
            return value, False
