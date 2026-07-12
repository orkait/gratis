"""Model parameter counts, parsed from the model id.

There is exactly ONE rule here, and it is a truth rule: when the size cannot be determined, the
answer is None - NOT 1.0.

Five providers each had their own copy of this parser and each returned 1.0 on failure. 177 of 289
models in the live market hit that path, so the UI rendered "1B" for Claude Opus, GPT-5 and Gemini.
A fabricated number that looks like a measurement is worse than an absent one: the user cannot tell
it is missing, so they act on it.
"""

import re

# "70b", "8x7b", "4.5b" -> billions.  "1.5t" -> trillions.
_TRILLIONS = re.compile(r"(\d+(?:\.\d+)?)\s*t\b")
_BILLIONS = re.compile(r"(\d+(?:\.\d+)?)\s*b\b")

_PARAMS_PER_TRILLION = 1000.0

# Used only where a number is structurally required (the capability heuristic). Never displayed.
CAPABILITY_FALLBACK_PARAMS = 1.0


def parse_params(*candidates: str) -> float | None:
    """Billions of parameters, or None when the id does not state a size.

    Tries each candidate string in order (usually the slug, then the display name).
    """
    for text in candidates:
        lower = (text or "").lower()

        trillions = _TRILLIONS.search(lower)
        if trillions:
            return float(trillions.group(1)) * _PARAMS_PER_TRILLION

        billions = _BILLIONS.search(lower)
        if billions:
            return float(billions.group(1))

    return None


def capability_params(params: float | None) -> float:
    """The capability heuristic needs a number. Unknown size is treated as small, not as a claim."""
    return params if params is not None else CAPABILITY_FALLBACK_PARAMS
