"""
Simple room assignment based on distance thresholds.
"""

from __future__ import annotations

from typing import Dict, List

import numpy as np

from .knn_clustering import cosine_distance


def assign_room(user_embedding: List[float], existing_rooms: Dict[str, List[List[float]]], threshold: float = 0.8) -> str:
    for room_id, embeddings in existing_rooms.items():
        for emb in embeddings:
            if cosine_distance(np.array(user_embedding), np.array(emb)) < threshold:
                embeddings.append(user_embedding)
                return room_id

    room_name = f"room-{len(existing_rooms)+1}"
    existing_rooms[room_name] = [user_embedding]
    return room_name
