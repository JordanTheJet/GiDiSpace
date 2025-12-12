"""
K-NN utilities for embedding similarity.
"""

from __future__ import annotations

from typing import List, Dict

import numpy as np


def cosine_distance(a: np.ndarray, b: np.ndarray) -> float:
    denom = (np.linalg.norm(a) * np.linalg.norm(b)) + 1e-8
    return 1.0 - float(np.dot(a, b) / denom)


def find_knn(target_embedding: np.ndarray, candidates: List[Dict[str, object]], k: int = 5) -> List[Dict[str, object]]:
    distances = []
    for candidate in candidates:
        emb = np.array(candidate["embedding"], dtype=np.float32)
        distances.append({"name": candidate.get("name", "unknown"), "distance": cosine_distance(target_embedding, emb)})

    distances.sort(key=lambda item: item["distance"])
    return distances[:k]
