from providers.intelligence import normalize_slug, _build_index_map


def test_strips_provider_prefix():
    assert normalize_slug("groq/openai/gpt-oss-120b") == "gpt-oss-120b"
    assert normalize_slug("cerebras/gpt-oss-120b") == "gpt-oss-120b"


def test_strips_free_and_size_suffix():
    assert normalize_slug("openrouter/openai/gpt-oss-120b:free") == "gpt-oss-120b"
    assert normalize_slug("cogito-2.1:671b") == "cogito-2-1"


def test_dots_become_dashes():
    assert normalize_slug("aistudio/gemini-2.5-pro") == "gemini-2-5-pro"
    assert normalize_slug("claude-opus-4.8") == "claude-opus-4-8"


def test_cloudflare_at_cf_path():
    assert normalize_slug("cloudflare/@cf/openai/gpt-oss-120b") == "gpt-oss-120b"


def test_strips_routing_alias_tails():
    assert normalize_slug("claude-opus-4.8-fast") == "claude-opus-4-8"
    assert normalize_slug("claude-opus-latest") == "claude-opus"


def test_lowercases():
    assert normalize_slug("Groq/Llama-3.3-70B") == "llama-3-3-70b"


def test_build_index_map_dedupes_by_max_intel():
    raw = [
        {"slug": "gpt-5-5", "evaluations": {"artificial_analysis_intelligence_index": 60.2}},
        {"slug": "gpt-5.5", "evaluations": {"artificial_analysis_intelligence_index": 40.0}},
        {"slug": "no-index", "evaluations": {"artificial_analysis_intelligence_index": None}},
    ]
    m = _build_index_map(raw)
    assert m["gpt-5-5"]["intel"] == 60.2  # dedup keeps the higher
    assert "no-index" not in m  # null index skipped
