"""
Map user-provided interests into a compact taxonomy.
"""

from __future__ import annotations

from typing import Dict, List, Set

TAXONOMY = {
    "ai": {"ai", "artificial intelligence", "machine learning", "ml"},
    "llm": {"llm", "large language model", "chatgpt", "gpt"},
    "nlp": {"nlp", "language", "text"},
    "audio": {"voice", "audio", "speech"},
    "web": {"frontend", "javascript", "three.js", "react", "webrtc"},
    "gaming": {"unity", "unreal", "game"},
    "product": {"product", "pm"},
    "data": {"data", "analytics"},
}


def normalize_interests(raw_interests: List[str]) -> Dict[str, float]:
    """
    Assign a soft score per taxonomy bucket based on matched interests.
    """
    scores: Dict[str, float] = {bucket: 0.0 for bucket in TAXONOMY.keys()}
    lowered: Set[str] = {item.lower() for item in raw_interests}

    for bucket, keywords in TAXONOMY.items():
        hits = lowered.intersection(keywords)
        if hits:
            scores[bucket] = min(1.0, len(hits) / len(keywords) + 0.2)

    # Soft fallback: boost AI if nothing else
    if all(value == 0.0 for value in scores.values()):
        scores["ai"] = 0.5

    return scores
