from __future__ import annotations

import numpy as np

from backend.embedding.user_embedder import UserProfile, embed_user


def test_embed_user_is_deterministic():
    profile = UserProfile(
        name="Test User",
        cv_text="Python developer with ML background and product instincts.",
        transcript="Hi there, I like building things.",
        interests=["ml", "product"],
    )
    first = embed_user(profile)
    second = embed_user(profile)

    assert len(first["embedding"]) == len(second["embedding"]) == 32
    assert np.allclose(first["embedding"], second["embedding"])
