"""Who MADE the model, as distinct from who serves it and how you reach it.

Three different facts were being conflated into one `provider` field:

    author    Anthropic     who built the model            <- what a human reads off the row
    route     OpenRouter    how you call it                <- what the market is FOR
    host      Amazon Bedrock  whose GPUs answer the request  <- an implementation detail, unstable

The row used to show the HOST, so `claude-fable-5` was labelled "Google".
"""

# OpenRouter ids are `author/model`. The author segment is stable and authoritative; the endpoint
# host is neither.
_AUTHOR_LABELS: dict[str, str] = {
    "anthropic": "Anthropic",
    "openai": "OpenAI",
    "google": "Google",
    "meta-llama": "Meta",
    "mistralai": "Mistral",
    "deepseek": "DeepSeek",
    "qwen": "Qwen",
    "x-ai": "xAI",
    "nvidia": "Nvidia",
    "microsoft": "Microsoft",
    "cohere": "Cohere",
    "perplexity": "Perplexity",
    "amazon": "Amazon",
    "ai21": "AI21",
    "inclusionai": "InclusionAI",
    "moonshotai": "Moonshot AI",
    "zai-org": "Z.AI",
    "z-ai": "Z.AI",
}


def author_from_model_id(model_id: str) -> str | None:
    """"anthropic/claude-fable-5" -> "Anthropic". None when the id carries no author segment."""
    if "/" not in model_id:
        return None

    slug = model_id.split("/", 1)[0].lower()
    known = _AUTHOR_LABELS.get(slug)
    if known:
        return known

    # An unknown author is still an author: title-case it rather than drop the fact on the floor.
    cleaned = slug.replace("-", " ").replace("_", " ").strip()
    return cleaned.title() if cleaned else None
