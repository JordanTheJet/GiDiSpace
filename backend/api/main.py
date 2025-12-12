from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Dict, List, Optional
from contextlib import asynccontextmanager

# Load .env file
from dotenv import load_dotenv
load_dotenv()

import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

from backend.embedding.user_embedder import UserProfile, embed_user
from backend.spatial.knn_clustering import find_knn
from backend.spatial.room_generator import assign_room
from backend.spatial.space_mapper import map_to_3d_space

# Supabase client
supabase_url = os.getenv("SUPABASE_URL", "")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
supabase: Client | None = None

if supabase_url and supabase_key:
    supabase = create_client(supabase_url, supabase_key)
    print(f"✓ Supabase connected: {supabase_url[:40]}...")
else:
    print("⚠ Supabase not configured - running in demo mode")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load demo profiles
    if not USER_EMBEDDINGS:
        _load_demo_profiles()
        await _sync_from_supabase()
    yield
    # Shutdown: nothing needed


app = FastAPI(title="GiDiSpace API", version="0.1.0", lifespan=lifespan)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

USER_EMBEDDINGS: List[Dict[str, object]] = []
ROOMS: Dict[str, List[List[float]]] = {}


class ProfileRequest(BaseModel):
    id: Optional[str] = None  # GiDi ID
    name: str
    cv_path: Optional[str] = None
    cv_text: Optional[str] = None
    transcript: Optional[str] = None
    interests: List[str] = []
    bio: Optional[str] = None
    avatar_model: Optional[str] = "/avatars/raiden.vrm"
    ai_personality_prompt: Optional[str] = None


class NeighborResponse(BaseModel):
    name: str
    distance: float
    id: Optional[str] = None
    coords: Optional[List[float]] = None


class GiDiProfile(BaseModel):
    id: str
    name: str
    embedding: List[float]
    coords: List[float]
    room: str
    bio: Optional[str] = None
    avatar_model: str
    interests: List[str]
    is_online: bool = False


def _load_demo_profiles() -> None:
    """Load demo profiles from JSON file."""
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
            )
        )
        coords = map_to_3d_space(np.array(created["embedding"], dtype=np.float32)).tolist()
        created["coords"] = coords
        created["id"] = f"demo-{profile['name'].lower().replace(' ', '-')}"
        created["avatar_model"] = "/avatars/raiden.vrm"
        created["bio"] = profile.get("summary", "")
        created["is_online"] = False
        room = assign_room(created["embedding"], ROOMS, threshold=0.6)
        created["room"] = room
        USER_EMBEDDINGS.append(created)


async def _sync_from_supabase() -> None:
    """Load existing profiles from Supabase on startup."""
    if not supabase:
        return
    try:
        result = supabase.table("profiles").select("*").execute()
        for profile in result.data:
            # Check if already loaded
            if any(u.get("id") == profile["id"] for u in USER_EMBEDDINGS):
                continue
            # Re-embed the profile
            created = embed_user(
                UserProfile(
                    name=profile["username"],
                    cv_text=profile.get("bio", ""),
                    interests=profile.get("interests", []),
                )
            )
            coords = map_to_3d_space(np.array(created["embedding"], dtype=np.float32)).tolist()
            created["coords"] = coords
            created["id"] = profile["id"]
            created["avatar_model"] = profile.get("selected_avatar_model", "/avatars/raiden.vrm")
            created["bio"] = profile.get("bio", "")
            created["is_online"] = False
            room = assign_room(created["embedding"], ROOMS, threshold=0.6)
            created["room"] = room
            USER_EMBEDDINGS.append(created)
    except Exception as e:
        print(f"Warning: Could not sync from Supabase: {e}")


async def _save_to_supabase(profile_data: Dict) -> None:
    """Persist profile to Supabase."""
    if not supabase:
        return
    try:
        supabase.table("profiles").upsert({
            "id": profile_data["id"],
            "username": profile_data["name"],
            "selected_avatar_model": profile_data.get("avatar_model", "/avatars/raiden.vrm"),
            "ai_personality_prompt": profile_data.get("ai_personality_prompt"),
            "bio": profile_data.get("bio"),
            "interests": profile_data.get("interests", []),
        }).execute()

        # Also save avatar state with 3D coords
        supabase.table("avatar_states").upsert({
            "profile_id": profile_data["id"],
            "position": {
                "x": profile_data["coords"][0] * 20,  # Scale for 3D space
                "y": 0,
                "z": profile_data["coords"][2] * 20 if len(profile_data["coords"]) > 2 else 0,
            },
            "is_online": profile_data.get("is_online", False),
        }).execute()
    except Exception as e:
        print(f"Warning: Could not save to Supabase: {e}")


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "supabase": "connected" if supabase else "not configured"}


@app.post("/profiles")
async def create_profile(profile: ProfileRequest) -> Dict[str, object]:
    """Create a new GiDi profile with embedding and 3D coordinates."""
    import uuid

    created = embed_user(
        UserProfile(
            name=profile.name,
            cv_path=profile.cv_path,
            cv_text=profile.cv_text or profile.bio,
            transcript=profile.transcript,
            interests=profile.interests,
        )
    )
    coords = map_to_3d_space(np.array(created["embedding"], dtype=np.float32)).tolist()
    created["coords"] = coords
    created["id"] = profile.id or str(uuid.uuid4())
    created["avatar_model"] = profile.avatar_model or "/avatars/raiden.vrm"
    created["bio"] = profile.bio
    created["ai_personality_prompt"] = profile.ai_personality_prompt
    created["is_online"] = True

    room = assign_room(created["embedding"], ROOMS, threshold=0.6)
    created["room"] = room

    # Remove existing profile with same ID if exists
    global USER_EMBEDDINGS
    USER_EMBEDDINGS = [u for u in USER_EMBEDDINGS if u.get("id") != created["id"]]
    USER_EMBEDDINGS.append(created)

    # Persist to Supabase
    await _save_to_supabase(created)

    return created


@app.get("/profiles")
def list_profiles() -> Dict[str, List[Dict]]:
    """List all GiDi profiles with their 3D coordinates."""
    return {
        "profiles": [
            {
                "id": user.get("id"),
                "name": user["name"],
                "coords": user.get("coords", [0, 0, 0]),
                "room": user.get("room"),
                "avatar_model": user.get("avatar_model", "/avatars/raiden.vrm"),
                "bio": user.get("bio"),
                "interests": user.get("interests", []),
                "is_online": user.get("is_online", False),
            }
            for user in USER_EMBEDDINGS
        ]
    }


@app.get("/profiles/{profile_id}")
def get_profile(profile_id: str) -> Dict[str, object]:
    """Get a specific GiDi profile by ID."""
    target = next((item for item in USER_EMBEDDINGS if item.get("id") == profile_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="GiDi not found")
    return target


@app.get("/neighbors/{name}")
def neighbors(name: str, k: int = 5) -> Dict[str, List[NeighborResponse]]:
    """Find nearest GiDis by name."""
    target = next((item for item in USER_EMBEDDINGS if item["name"] == name), None)
    if not target:
        raise HTTPException(status_code=404, detail="GiDi not found")
    results = find_knn(np.array(target["embedding"], dtype=np.float32), USER_EMBEDDINGS, k=k)
    # Enrich with coords
    for r in results:
        match = next((u for u in USER_EMBEDDINGS if u["name"] == r["name"]), None)
        if match:
            r["id"] = match.get("id")
            r["coords"] = match.get("coords")
    return {"neighbors": results}


@app.get("/neighbors/id/{profile_id}")
def neighbors_by_id(profile_id: str, k: int = 5) -> Dict[str, List[NeighborResponse]]:
    """Find nearest GiDis by profile ID."""
    target = next((item for item in USER_EMBEDDINGS if item.get("id") == profile_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="GiDi not found")
    results = find_knn(np.array(target["embedding"], dtype=np.float32), USER_EMBEDDINGS, k=k)
    for r in results:
        match = next((u for u in USER_EMBEDDINGS if u["name"] == r["name"]), None)
        if match:
            r["id"] = match.get("id")
            r["coords"] = match.get("coords")
    return {"neighbors": results}


@app.put("/profiles/{profile_id}/online")
async def set_online_status(profile_id: str, is_online: bool = True) -> Dict[str, str]:
    """Update a GiDi's online status."""
    target = next((item for item in USER_EMBEDDINGS if item.get("id") == profile_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="GiDi not found")
    target["is_online"] = is_online

    if supabase:
        try:
            supabase.table("avatar_states").update({
                "is_online": is_online
            }).eq("profile_id", profile_id).execute()
        except Exception as e:
            print(f"Warning: Could not update online status: {e}")

    return {"status": "ok", "is_online": is_online}


@app.get("/rooms")
def rooms() -> Dict[str, List[List[float]]]:
    """Get all rooms and their member coordinates."""
    return ROOMS


@app.post("/extract-pdf")
async def extract_pdf(file: UploadFile = File(...)) -> Dict[str, object]:
    """Extract text from uploaded PDF for profile creation."""
    if not file.filename or not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    try:
        import PyPDF2
        import io

        contents = await file.read()
        pdf_file = io.BytesIO(contents)
        pdf_reader = PyPDF2.PdfReader(pdf_file)

        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() or ""

        # Clean up the text
        text = " ".join(text.split())

        return {
            "text": text[:10000],  # Limit to 10k chars
            "filename": file.filename,
            "page_count": len(pdf_reader.pages),
            "char_count": len(text)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {str(e)}")
