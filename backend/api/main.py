from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from backend.embedding.user_embedder import UserProfile, embed_user
from backend.spatial.knn_clustering import find_knn
from backend.spatial.room_generator import assign_room
from backend.spatial.space_mapper import map_to_3d_space

app = FastAPI(title="3D AI Social Space", version="0.1.0")

USER_EMBEDDINGS: List[Dict[str, object]] = []
ROOMS: Dict[str, List[List[float]]] = {}


class ProfileRequest(BaseModel):
    name: str
    cv_path: Optional[str] = None
    cv_text: Optional[str] = None
    transcript: Optional[str] = None
    interests: List[str] = []
    voice_id: Optional[str] = None


class NeighborResponse(BaseModel):
    name: str
    distance: float


def _load_demo_profiles() -> None:
    demo_path = Path("data/sample_profiles/demo_profiles.json")
    if not demo_path.exists():
        return
    with demo_path.open("r", encoding="utf-8") as f:
        profiles = json.load(f)
    for profile in profiles:
        created = embed_user(
            UserProfile(
                name=profile["name"],
                cv_text=profile.get("summary"),
                transcript=profile.get("transcript"),
                interests=profile.get("interests", []),
                voice_id=profile.get("voice_id"),
            )
        )
        coords = map_to_3d_space(np.array(created["embedding"], dtype=np.float32)).tolist()
        created["coords"] = coords
        room = assign_room(created["embedding"], ROOMS, threshold=0.6)
        created["room"] = room
        USER_EMBEDDINGS.append(created)


@app.on_event("startup")
def preload() -> None:
    if not USER_EMBEDDINGS:
        _load_demo_profiles()


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/profiles")
def create_profile(profile: ProfileRequest) -> Dict[str, object]:
    created = embed_user(
        UserProfile(
            name=profile.name,
            cv_path=profile.cv_path,
            cv_text=profile.cv_text,
            transcript=profile.transcript,
            interests=profile.interests,
            voice_id=profile.voice_id,
        )
    )
    coords = map_to_3d_space(np.array(created["embedding"], dtype=np.float32)).tolist()
    created["coords"] = coords
    room = assign_room(created["embedding"], ROOMS, threshold=0.6)
    created["room"] = room
    USER_EMBEDDINGS.append(created)
    return created


@app.get("/profiles")
def list_profiles() -> Dict[str, List[str]]:
    return {"profiles": [user["name"] for user in USER_EMBEDDINGS]}


@app.get("/neighbors/{name}")
def neighbors(name: str, k: int = 5) -> Dict[str, List[NeighborResponse]]:
    target = next((item for item in USER_EMBEDDINGS if item["name"] == name), None)
    if not target:
        raise HTTPException(status_code=404, detail="Profile not found")
    results = find_knn(np.array(target["embedding"], dtype=np.float32), USER_EMBEDDINGS, k=k)
    return {"neighbors": results}


@app.get("/rooms")
def rooms() -> Dict[str, List[List[float]]]:
    return ROOMS
