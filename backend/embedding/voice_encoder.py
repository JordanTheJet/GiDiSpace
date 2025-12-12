"""
Voice feature encoder that maps scalar traits to a fixed vector.
"""

from __future__ import annotations

from typing import Dict

import numpy as np

EMBED_DIM = 8


def encode_voice_features(features: Dict[str, float]) -> np.ndarray:
    ordered_keys = ["energy", "warmth", "confidence", "articulation"]
    vector = np.zeros(EMBED_DIM, dtype=np.float32)

    for idx, key in enumerate(ordered_keys):
        vector[idx] = float(features.get(key, 0.0))

    # Repeat values to fill the vector
    for i in range(len(ordered_keys), EMBED_DIM):
        vector[i] = vector[i % len(ordered_keys)]

    norm = np.linalg.norm(vector) + 1e-8
    return vector / norm
