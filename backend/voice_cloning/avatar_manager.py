"""
Manages AI avatar lifecycle in a simplified, offline-friendly way.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

from .elevenlabs_client import ElevenLabsClient


@dataclass
class Avatar:
    user_name: str
    voice_id: str
    personality: Dict[str, float]
    knowledge_base: Dict[str, object]


class AvatarManager:
    def __init__(self, client: ElevenLabsClient | None = None) -> None:
        self.client = client or ElevenLabsClient()

    def create_avatar(self, user_name: str, audio_sample: str, personality: Dict[str, float], knowledge_base: Dict[str, object]) -> Avatar:
        voice_id = self.client.clone_voice(audio_sample)
        return Avatar(user_name=user_name, voice_id=voice_id, personality=personality, knowledge_base=knowledge_base)

    def respond(self, avatar: Avatar, prompt: str) -> Dict[str, object]:
        # Echo-style stub that mirrors the prompt with personality context.
        text = f"[{avatar.user_name} persona {avatar.personality}] {prompt}"
        speech = self.client.speak(avatar.voice_id, text)
        return {"text": text, "speech": speech}
