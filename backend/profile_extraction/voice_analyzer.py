"""
Voice analysis stub that derives lightweight personality signals.

In production this would use acoustic features; here we stay deterministic
using transcript text so demo data is stable and testable.
"""

from __future__ import annotations

import hashlib
from typing import Dict


def _score_from_text(text: str) -> float:
    digest = hashlib.md5(text.encode("utf-8")).hexdigest()
    return int(digest[:6], 16) / 0xFFFFFF


def analyze_voice(audio_path: str, transcript: str | None = None) -> Dict[str, float]:
    """
    Return pseudo voice traits in [0, 1].
    If transcript is provided we base scores on it for determinism.
    """
    base_text = transcript or audio_path
    energy = _score_from_text(base_text + "energy")
    warmth = _score_from_text(base_text + "warmth")
    confidence = _score_from_text(base_text + "confidence")
    articulation = _score_from_text(base_text + "articulation")

    return {
        "energy": round(energy, 3),
        "warmth": round(warmth, 3),
        "confidence": round(confidence, 3),
        "articulation": round(articulation, 3),
        "transcript_hint": transcript or "audio_only",
    }
