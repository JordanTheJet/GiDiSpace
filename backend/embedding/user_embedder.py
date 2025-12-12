"""
End-to-end embedding builder combining CV, voice, and interest inputs.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

import numpy as np

from backend.profile_extraction.cv_parser import parse_cv
from backend.profile_extraction.interest_mapper import normalize_interests
from backend.profile_extraction.voice_analyzer import analyze_voice

from .fusion_model import fuse_embeddings
from .text_encoder import encode_text_features
from .voice_encoder import encode_voice_features


@dataclass
class UserProfile:
    name: str
    cv_path: Optional[str] = None
    cv_text: Optional[str] = None
    audio_path: Optional[str] = None
    transcript: Optional[str] = None
    interests: Optional[List[str]] = None
    voice_id: Optional[str] = None


def embed_user(profile: UserProfile) -> Dict[str, object]:
    if profile.cv_path:
        cv_data = parse_cv(profile.cv_path)
    elif profile.cv_text:
        from backend.profile_extraction.cv_parser import parse_cv_text

        cv_data = parse_cv_text(profile.cv_text)
    else:
        cv_data = {"summary": "", "skills": [], "experience": []}
    # If a voice_id is present, include it in the hash to seed deterministic traits
    voice_seed = profile.transcript or profile.voice_id or profile.audio_path or "audio_placeholder"
    voice_features = analyze_voice(profile.audio_path or "audio_placeholder", transcript=voice_seed)
    interest_scores = normalize_interests(profile.interests or [])

    text_features = {
        "summary": cv_data.get("summary", ""),
        "skills": cv_data.get("skills", []),
        "experience": cv_data.get("experience", []),
        "interests": profile.interests or [],
    }

    text_embedding = encode_text_features(text_features)
    voice_embedding = encode_voice_features(voice_features)
    final_embedding = fuse_embeddings(text_embedding, voice_embedding, interest_scores)

    return {
        "name": profile.name,
        "embedding": final_embedding.tolist(),
        "text_embedding": text_embedding.tolist(),
        "voice_embedding": voice_embedding.tolist(),
        "interest_scores": interest_scores,
        "cv": cv_data,
        "voice": voice_features,
    }


def batch_embed(profiles: List[UserProfile]) -> List[Dict[str, object]]:
    return [embed_user(profile) for profile in profiles]
