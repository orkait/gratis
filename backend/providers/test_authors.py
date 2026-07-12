"""Author, route and host are three different facts. They were conflated into one field."""

from providers.authors import author_from_model_id


def test_the_bug_claude_is_not_google():
    # The row showed the upstream ENDPOINT HOST, so anthropic/claude-fable-5 rendered as "Google".
    assert author_from_model_id("anthropic/claude-fable-5") == "Anthropic"
    assert author_from_model_id("anthropic/claude-opus-4.8") == "Anthropic"


def test_known_authors():
    assert author_from_model_id("openai/gpt-5.5") == "OpenAI"
    assert author_from_model_id("google/gemini-3.5-flash") == "Google"
    assert author_from_model_id("meta-llama/llama-3.3-70b") == "Meta"
    assert author_from_model_id("x-ai/grok-4.5") == "xAI"


def test_unknown_author_is_still_an_author():
    # Do not drop the fact on the floor just because the slug is not in the map.
    assert author_from_model_id("some-lab/model-1") == "Some Lab"


def test_no_author_segment():
    assert author_from_model_id("gpt-4") is None
