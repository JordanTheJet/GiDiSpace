"""
Map embeddings into 3D coordinates.
"""

from __future__ import annotations

import numpy as np


def map_to_3d_space(embedding: np.ndarray) -> np.ndarray:
    if embedding.shape[0] < 3:
        embedding = np.pad(embedding, (0, 3 - embedding.shape[0]), constant_values=0.0)
    coords = embedding[:3]
    norm = np.linalg.norm(coords) or 1.0
    return coords / norm
