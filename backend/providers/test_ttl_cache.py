"""AsyncTTLCache - single-flight in-memory TTL cache with an injectable clock."""

import asyncio

from providers.ttl_cache import AsyncTTLCache


class Clock:
    def __init__(self):
        self.t = 0.0

    def __call__(self):
        return self.t


def test_second_call_within_ttl_is_a_hit_and_does_not_recompute():
    clock = Clock()
    cache = AsyncTTLCache(ttl=1800, clock=clock)
    calls = {"n": 0}

    async def compute():
        calls["n"] += 1
        return ["a", "b"]

    async def run():
        v1, hit1 = await cache.get_or_compute(compute)
        clock.t = 1799.0
        v2, hit2 = await cache.get_or_compute(compute)
        return v1, hit1, v2, hit2

    v1, hit1, v2, hit2 = asyncio.run(run())
    assert v1 == ["a", "b"] and hit1 is False
    assert v2 == ["a", "b"] and hit2 is True
    assert calls["n"] == 1


def test_recomputes_after_ttl_expires():
    clock = Clock()
    cache = AsyncTTLCache(ttl=1800, clock=clock)
    calls = {"n": 0}

    async def compute():
        calls["n"] += 1
        return calls["n"]

    async def run():
        await cache.get_or_compute(compute)
        clock.t = 1800.0  # exactly at expiry -> stale
        return await cache.get_or_compute(compute)

    value, hit = asyncio.run(run())
    assert value == 2 and hit is False
    assert calls["n"] == 2


def test_empty_result_is_not_cached_by_default():
    clock = Clock()
    cache = AsyncTTLCache(ttl=1800, clock=clock)
    calls = {"n": 0}

    async def compute():
        calls["n"] += 1
        return [] if calls["n"] == 1 else ["ready"]

    async def run():
        v1, hit1 = await cache.get_or_compute(compute)   # [] -> not stored
        v2, hit2 = await cache.get_or_compute(compute)   # recompute -> ["ready"], stored
        v3, hit3 = await cache.get_or_compute(compute)   # served from cache
        return v1, hit1, v2, hit2, v3, hit3

    v1, hit1, v2, hit2, v3, hit3 = asyncio.run(run())
    assert v1 == [] and hit1 is False
    assert v2 == ["ready"] and hit2 is False
    assert v3 == ["ready"] and hit3 is True
    assert calls["n"] == 2


def test_single_flight_concurrent_callers_compute_once():
    clock = Clock()
    cache = AsyncTTLCache(ttl=1800, clock=clock)
    calls = {"n": 0}

    async def compute():
        calls["n"] += 1
        await asyncio.sleep(0)  # yield so a stampede could interleave without the lock
        return ["x"]

    async def run():
        results = await asyncio.gather(*[cache.get_or_compute(compute) for _ in range(10)])
        return results

    results = asyncio.run(run())
    assert all(v == ["x"] for v, _ in results)
    assert calls["n"] == 1  # lock collapses the stampede to a single compute
