"""
Stubbed ElevenLabs client.

This keeps the interface but avoids network calls so demos run offline.
"""

from __future__ import annotations

import os
import uuid
from typing import Dict


class ElevenLabsClient:
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or os.getenv("ELEVENLABS_API_KEY", "demo-key")

    def clone_voice(self, audio_sample_path: str) -> str:
        # In real life this would upload audio and return a server voice id.
        return f"voice-{uuid.uuid4().hex[:8]}"

    def speak(self, voice_id: str, text: str) -> Dict[str, str]:
        # Returning a text payload to stay offline-friendly.
        return {"voice_id": voice_id, "text": text, "status": "synthesized (mock)"}
