"""
Lightweight CV/LinkedIn parsing for demo users.

This keeps dependencies minimal by using keyword spotting instead of heavy NLP.
The output is a simple profile dictionary consumed by the embedding pipeline.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Dict, List

SKILL_KEYWORDS = {
    "python",
    "pytorch",
    "tensorflow",
    "nlp",
    "ml",
    "llm",
    "react",
    "webrtc",
    "unity",
    "three.js",
    "product",
    "design",
    "data",
    "cloud",
    "aws",
    "gcp",
    "azure",
    "leadership",
    "manager",
    "research",
}


def _read_text(path: Path) -> str:
    if path.suffix.lower() == ".json":
        with path.open("r", encoding="utf-8") as f:
            payload = json.load(f)
        if isinstance(payload, dict):
            return " ".join(str(v) for v in payload.values())
        if isinstance(payload, list):
            return " ".join(str(item) for item in payload)
    return path.read_text(encoding="utf-8")


def _extract_skills(text: str) -> List[str]:
    lowered = text.lower()
    return sorted({skill for skill in SKILL_KEYWORDS if skill in lowered})


def _extract_experience(text: str) -> List[str]:
    experience_lines = []
    for line in text.splitlines():
        if re.search(r"\b(20\d{2}|19\d{2})\b", line):
            experience_lines.append(line.strip())
        elif "experience" in line.lower():
            experience_lines.append(line.strip())
    return experience_lines[:5]


def parse_cv_text(raw_text: str) -> Dict[str, object]:
    """
    Parse raw text into structured fields.
    """
    skills = _extract_skills(raw_text)
    experience = _extract_experience(raw_text)

    summary = raw_text[:280].replace("\n", " ") + ("..." if len(raw_text) > 280 else "")

    return {
        "summary": summary,
        "skills": skills,
        "experience": experience,
        "raw_text": raw_text,
    }


def parse_cv(cv_path: str) -> Dict[str, object]:
    """
    Parse a resume or LinkedIn export into structured fields.

    Returns a dict with keys: summary, skills, experience, raw_text.
    """
    path = Path(cv_path)
    if not path.exists():
        raise FileNotFoundError(f"CV path not found: {cv_path}")

    raw_text = _read_text(path)
    return parse_cv_text(raw_text)
