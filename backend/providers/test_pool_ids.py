"""The pool id is a public API string and also sits in users' persisted client state.

Renaming the product must not break either. `zero-cost-intelligent` is kept permanently.
"""

from main import POOL_MODEL_ID, POOL_MODEL_IDS


def test_new_canonical_pool_id():
    assert POOL_MODEL_ID == "gratis-auto"
    assert POOL_MODEL_ID in POOL_MODEL_IDS


def test_legacy_pool_id_still_routes_to_the_pool():
    """Live clients and persisted Zustand state still send this. It must never stop working."""
    assert "zero-cost-intelligent" in POOL_MODEL_IDS
