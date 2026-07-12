"""Unknown means unknown. A fabricated number that looks measured is worse than an absent one."""

from providers.params import CAPABILITY_FALLBACK_PARAMS, capability_params, parse_params


def test_reads_billions_from_the_id():
    assert parse_params("llama-3.3-70b-versatile") == 70.0
    assert parse_params("qwen3-32b") == 32.0
    assert parse_params("gemma-2b-it") == 2.0


def test_reads_fractional_billions():
    assert parse_params("llama-3.2-1.5b") == 1.5


def test_reads_trillions():
    assert parse_params("some-model-1.5t") == 1500.0


def test_unknown_size_is_None_not_one_billion():
    """The bug: this returned 1.0, so Claude Opus and GPT-5 rendered as "1B" in the market."""
    assert parse_params("claude-opus-4.8") is None
    assert parse_params("gpt-5.5") is None
    assert parse_params("gemini-3.5-flash") is None


def test_gemini_sizes_are_not_invented():
    """models.py used to guess: flash-lite -> 4B, flash -> 8B, pro -> 70B. Google publishes none."""
    assert parse_params("gemini-2.5-flash-lite") is None
    assert parse_params("gemini-2.5-flash") is None
    assert parse_params("gemini-2.5-pro") is None


def test_falls_back_across_candidates():
    assert parse_params("opaque-id", "Meta Llama 70B") == 70.0


def test_capability_math_still_gets_a_number():
    # The heuristic needs a float; unknown is treated as small, never as a claim.
    assert capability_params(None) == CAPABILITY_FALLBACK_PARAMS
    assert capability_params(70.0) == 70.0
