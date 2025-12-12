"""
Compact text encoder that hashes tokens into a fixed-size vector.
This is intentionally lightweight so it can run without external models.
"""

from __future__ import annotations

import hashlib
from typing import Dict, Iterable, List

import numpy as np

EMBED_DIM = 16


def _hash_token(token: str) -> int:
    return int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)


def encode_text_features(features: Dict[str, object]) -> np.ndarray:
    """
    Encode text-like profile fields into a numeric vector.
    """
    tokens: List[str] = []
    for key, value in features.items():
        if isinstance(value, str):
            tokens.extend(value.lower().split())
        elif isinstance(value, Iterable):
            tokens.extend([str(item).lower() for item in value])
        else:
            tokens.append(str(value))

    vector = np.zeros(EMBED_DIM, dtype=np.float32)
    for token in tokens:
        idx = _hash_token(token) % EMBED_DIM
        vector[idx] += 1.0

    # L2 normalize to keep distances meaningful
    norm = np.linalg.norm(vector) + 1e-8
    return vector / norm
