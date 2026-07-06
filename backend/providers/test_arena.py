"""attach_arena — the pure human-preference + divergence logic (no network)."""

from providers.arena import attach_arena


def _m(mid, overall, elo=None):
    return {"id": mid, "name": mid, "scores": {"overall": overall}}, elo


def _run(pairs):
    models = [m for m, _ in pairs]
    arena = {m["id"]: {"elo": e, "votes": 100} for m, e in pairs if e is not None}
    return attach_arena(models, arena)


def test_attaches_elo_and_normalized_preference():
    r = _run([(_m("a", 90, 1500)), (_m("b", 50, 1400))])
    by = {m["id"]: m for m in r}
    assert by["a"]["arena_elo"] == 1500
    assert by["a"]["preference"] == 100.0  # top elo
    assert by["b"]["preference"] == 0.0


def test_unmatched_model_gets_none():
    r = _run([(_m("a", 90, 1500)), (_m("nomatch", 50, None))])
    by = {m["id"]: m for m in r}
    assert by["nomatch"]["arena_elo"] is None
    assert by["nomatch"]["preference"] is None


def test_divergence_flags_bench_vs_human():
    # 6 models; "benchdarling" tops benchmarks but is mid on elo; "crowdfav" is opposite
    pairs = [
        (_m("benchdarling", 99, 1400)),  # bench #1, elo low
        (_m("crowdfav", 40, 1500)),      # bench last, elo top
        (_m("m3", 80, 1460)), (_m("m4", 70, 1450)),
        (_m("m5", 60, 1440)), (_m("m6", 50, 1420)),
    ]
    by = {m["id"]: m for m in _run(pairs)}
    assert by["benchdarling"]["divergence"] == "bench-favored"
    assert by["crowdfav"]["divergence"] == "human-favored"


def test_divergence_none_when_too_few_matched():
    by = {m["id"]: m for m in _run([(_m("a", 90, 1500)), (_m("b", 50, 1400))])}
    assert by["a"]["divergence"] is None  # <5 matched → no divergence call


def test_empty_arena_is_fail_open():
    models = [{"id": "a", "name": "a", "scores": {"overall": 90}}]
    r = attach_arena(models, {})
    assert r[0]["arena_elo"] is None and r[0]["preference"] is None
