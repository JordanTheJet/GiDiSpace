from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from backend.embedding.user_embedder import UserProfile, embed_user
from backend.spatial.space_mapper import map_to_3d_space

DATA_PATH = Path("data/sample_profiles/demo_profiles.json")
OUTPUT_PATH = Path("data/embeddings/demo_embeddings.json")


def main() -> None:
    profiles = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    embedded = []

    for profile in profiles:
        created = embed_user(
            UserProfile(
                name=profile["name"],
                cv_text=profile.get("summary"),
                transcript=profile.get("transcript"),
                interests=profile.get("interests", []),
            )
        )
        coords = map_to_3d_space(np.array(created["embedding"])).tolist()
        created["coords"] = coords
        embedded.append(created)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(embedded, indent=2), encoding="utf-8")
    print(f"Wrote {len(embedded)} demo embeddings to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
