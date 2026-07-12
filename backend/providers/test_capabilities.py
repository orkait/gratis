"""A missing key must be loud. Silence is the bug.

Production ran for hours with no AA_API_KEY. Nothing errored and nothing logged, so the market
degraded into nonsense in total silence: with no intelligence index every model fell back to the
capability heuristic, a 1T model ranked #1, and every sub-score on every row was identical.
"""

from providers.capabilities import AA_KEY, degradations, missing_capabilities


def test_missing_aa_key_is_reported(monkeypatch):
    monkeypatch.delenv(AA_KEY, raising=False)
    assert AA_KEY in [c.env_var for c in missing_capabilities()]


def test_present_aa_key_is_not_reported(monkeypatch):
    monkeypatch.setenv(AA_KEY, "some-key")
    assert AA_KEY not in [c.env_var for c in missing_capabilities()]


def test_degradation_says_what_actually_breaks(monkeypatch):
    monkeypatch.delenv(AA_KEY, raising=False)
    [entry] = [d for d in degradations() if d["missing_env"] == AA_KEY]

    # An operator must be able to act on this without reading the source.
    assert entry["capability"] == "intelligence"
    assert "heuristic" in entry["impact"].lower()


def test_no_degradations_when_fully_configured(monkeypatch):
    monkeypatch.setenv(AA_KEY, "some-key")
    assert degradations() == []
