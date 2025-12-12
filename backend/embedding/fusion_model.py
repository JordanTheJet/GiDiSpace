"""
Multi-modal fusion that blends text, voice, and interest signals.
"""

from __future__ import annotations

from typing import Dict

import numpy as np


def fuse_embeddings(
    text_embedding: np.ndarray, voice_embedding: np.ndarray, interest_scores: Dict[str, float]
) -> np.ndarray:
    interest_keys = sorted(interest_scores.keys())
    interest_vector = np.array([interest_scores[k] for k in interest_keys], dtype=np.float32)

    merged = np.concatenate([text_embedding, voice_embedding, interest_vector], axis=0)
    norm = np.linalg.norm(merged) + 1e-8
    return merged / norm
