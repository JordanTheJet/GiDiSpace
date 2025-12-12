# 🌌 3D AI Social Space

**A revolutionary social networking platform that spatially embeds users based on interests, personality, and professional alignment**

## What was built in this repo
- Python FastAPI backend that runs the simplified multi‑modal embedding/matching pipeline described below.
- Lightweight, offline-friendly encoders for CV text, voice traits, and interests, fused into a 32d embedding.
- Spatial utilities to map embeddings into 3D coords, assign rooms, and find nearest neighbors.
- Demo data (5 personas) and a script to regenerate cached embeddings.
- Dockerfile and pytest coverage for determinism.
- Next.js (app router) frontend for GiDiSpace with profile creation, VRM avatars, PDF upload, chat (stubbed streaming API), and Supabase-backed lobby state.
- ElevenLabs voice cloning flow in the profile creator (record 1–2 mins, upload, preview via TTS) with voice IDs stored alongside profiles.

## 🎯 Vision

Imagine a world where meaningful connections happen automatically. No more endless scrolling through LinkedIn profiles or awkward networking events. Our 3D AI Social Space places you in virtual proximity to people who share your passions, complement your personality, and align with your professional interests.

## 🚀 Core Concept

Users are represented as entities in a 3D virtual space where physical distance reflects similarity in interests, personality, and professional alignment. When you "spawn" into our space, you're automatically placed near your tribe - the people you'd actually want to grab coffee with.

### Key Innovation
- **Beyond keyword matching**: We don't just match "data scientist" with "data scientist"
- **Personality-aware clustering**: Voice analysis captures communication style and personality traits
- **AI avatars**: When users are offline, their AI clones can maintain conversations using voice synthesis

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Onboarding                      │
├──────────────────┬────────────────┬────────────────────┤
│   CV/Profile     │  Voice Session  │   Interest Survey  │
│    Upload        │   (1-2 mins)    │    (Optional)      │
└──────────────────┴────────────────┴────────────────────┘
           │                │                 │
           ▼                ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                  Feature Extraction                       │
├──────────────────┬────────────────┬────────────────────┤
│  Text Analysis   │ Voice Analysis  │  Graph Building    │
│  - Skills        │ - Personality   │  - Connections     │
│  - Experience    │ - Energy level  │  - Communities     │
│  - Interests     │ - Speaking style│                    │
└──────────────────┴────────────────┴────────────────────┘
           │                │                 │
           ▼                ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│               Embedding Generation                        │
│         (Transformer-based Multi-Modal Model)            │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  3D Space Placement                      │
│              (K-NN Clustering & UMAP)                    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   3D Visualization                       │
│                  (Unity/Three.js)                        │
└─────────────────────────────────────────────────────────┘
```

## 🔧 Technical Stack

### Backend (User Profiling & Embedding)
- **Language**: Python 3.10+
- **ML Framework**: PyTorch / Transformers
- **Voice Processing**: ElevenLabs API
- **Embedding Models**: 
  - Sentence-BERT for text embeddings
  - OpenAI Whisper for voice transcription
  - Custom multi-modal fusion network
- **Vector Database**: Pinecone / Weaviate
- **API Framework**: FastAPI

### Frontend (3D Visualization)
- **Engine**: Unity or Three.js
- **Networking**: WebRTC for real-time communication
- **UI Framework**: React (for web interface)

## 📦 Repository Structure

```
3d-ai-social-space/
├── backend/
│   ├── profile_extraction/
│   │   ├── cv_parser.py          # Resume/LinkedIn parsing
│   │   ├── voice_analyzer.py     # Voice personality extraction
│   │   └── interest_mapper.py    # Interest taxonomy
│   ├── embedding/
│   │   ├── text_encoder.py       # BERT-based text embedding
│   │   ├── voice_encoder.py      # Voice feature extraction
│   │   ├── fusion_model.py       # Multi-modal fusion
│   │   └── user_embedder.py      # Final embedding generation
│   ├── voice_cloning/
│   │   ├── elevenlabs_client.py  # ElevenLabs API integration
│   │   └── avatar_manager.py     # AI avatar conversation logic
│   ├── spatial/
│   │   ├── knn_clustering.py     # K-nearest neighbors
│   │   ├── space_mapper.py       # 3D coordinate assignment
│   │   └── room_generator.py     # Dynamic room creation
│   └── api/
│       └── main.py               # FastAPI endpoints
├── frontend/
│   └── [3D visualization code - maintained separately]
├── data/
│   ├── sample_profiles/          # Demo user profiles
│   └── embeddings/               # Cached embeddings
├── tests/
│   └── test_embedding.py
├── docker/
│   └── Dockerfile
└── README.md
```

## 🚦 Getting Started

### Prerequisites
```bash
# Python environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Environment variables
cp .env.example .env
# Add your API keys:
# - ELEVENLABS_API_KEY
# - OPENAI_API_KEY (optional, for enhanced NLP)
```

### Installation
```bash
# Install dependencies
pip install -r requirements.txt

# Run the backend server
uvicorn backend.api.main:app --reload
```

### Frontend (Next.js) quickstart
```bash
# Install node deps
npm install

# Run the web client (expects Supabase env vars set; see .env.example)
npm run dev
```

Backend runs on :8000 by default; frontend on :3000. Keep both running for end-to-end testing.

### Quickstart (API)
```bash
uvicorn backend.api.main:app --reload
curl http://localhost:8000/health

# List preloaded demo users (loaded from data/sample_profiles/demo_profiles.json)
curl http://localhost:8000/profiles

# Add a new profile on the fly
curl -X POST http://localhost:8000/profiles \
  -H "Content-Type: application/json" \
  -d '{"name":"You","cv_text":"Python + LLM apps","interests":["llm","ai"],"transcript":"Excited about social discovery."}'

# Fetch neighbors for a user
curl "http://localhost:8000/neighbors/Ava%20the%20RecSys%20Scientist?k=3"
```

### Demo data + embeddings
```bash
python scripts/create_demo_users.py  # writes data/embeddings/demo_embeddings.json
```

### Tests
```bash
pytest
```

### Supabase setup (for the frontend)
- Create a Supabase project and add `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env` (see `.env.example`).
- Run the SQL in `supabase/schema.sql` in the Supabase SQL editor to provision tables/policies.
- The frontend uses Supabase for profile and lobby persistence; the backend remains API/embedding oriented.
- If your project already has the base schema, add voice fields with:
  ```
  ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS voice_id TEXT,
    ADD COLUMN IF NOT EXISTS voice_preview_url TEXT,
    ADD COLUMN IF NOT EXISTS voice_ready BOOLEAN DEFAULT false;
  ```

### Frontend API helpers
- `/api/extract-pdf` — accepts a PDF file upload (FormData) and returns extracted text (falls back to a placeholder if extraction unavailable).
- `/api/chat` — SSE-style endpoint returning a quick stubbed reply in OpenAI-stream format for NPC/digital-twin chat.
- `/api/voice/clone` — uploads recorded audio to ElevenLabs and returns a `voice_id`.
- `/api/voice/preview` — generates a short TTS clip for a cloned voice.

### Demo Setup
```bash
# Generate demo users
python scripts/create_demo_users.py

# This will create 5-10 demo profiles with varying interests:
# - Data Scientists interested in RecSys
# - ML Engineers focused on LLMs
# - Product Managers in AI
# - Researchers in NLP
# - Startup founders in AI/ML
```

## 🎮 Demo Workflow

### Phase 1: User Profile Creation
1. **CV Upload**: Parse LinkedIn PDF or resume
2. **Voice Recording**: 1-2 minute introduction
   - "Tell us about yourself and what you're passionate about"
   - System extracts: tone, pace, energy, personality markers
3. **Interest Calibration**: Quick quiz or tag selection

### Phase 2: Embedding Generation
```python
# Example embedding pipeline
user_profile = {
    "text_features": extract_from_cv(cv_path),
    "voice_features": analyze_voice(audio_path),
    "interests": parse_interests(user_input)
}

# Generate multi-modal embedding
embedding = model.encode(user_profile)  # Returns 768-dim vector
```

### Phase 3: Spatial Placement
```python
# Find nearest neighbors
neighbors = find_knn(embedding, k=10)

# Assign 3D coordinates
coords = map_to_3d_space(embedding, neighbors)

# Create/join room
room = assign_room(coords, threshold=0.8)
```

### Phase 4: AI Avatar Creation
```python
# Clone voice with ElevenLabs
voice_id = elevenlabs.clone_voice(audio_sample)

# Create conversational AI
avatar = create_avatar(
    voice_id=voice_id,
    personality=extracted_personality,
    knowledge_base=user_profile
)
```

## 📊 Embedding Strategy

### Multi-Modal Fusion Architecture
```
Text Features (384d) ──┐
                       ├─> Fusion Layer ──> Final Embedding (768d)
Voice Features (384d) ──┘
```

### Feature Extraction
- **Text**: Skills, experience level, domain expertise, writing style
- **Voice**: Energy level, confidence, warmth, articulation
- **Behavioral**: Response patterns, availability, engagement level

### Distance Metrics
- Cosine similarity for interest alignment
- Euclidean distance for personality matching
- Custom weighted metric combining both

## 🧪 Testing

### Demo Scenarios
1. **Technical Cluster**: Place 3 data scientists with RecSys interest
   - Expected: Tight cluster formation
   - Validation: Average distance < 0.3

2. **Cross-functional Room**: PM + Designer + Engineer
   - Expected: Triangle formation with moderate distances
   - Validation: Distances between 0.4-0.6

3. **Personality Matching**: Similar interests, different personalities
   - Expected: Moderate clustering with personality-based sub-groups

## 🎯 Success Metrics

- **Clustering Quality**: Silhouette score > 0.6
- **User Satisfaction**: Relevance of suggested connections > 80%
- **Engagement**: Average conversation length > 5 minutes
- **Retention**: Users returning after first match > 70%

## 🚀 Roadmap

### MVP (Current Sprint)
- [x] CV parsing pipeline
- [x] Voice personality extraction
- [x] Basic embedding model
- [ ] Integration with 3D frontend
- [ ] 5 demo users
- [ ] Basic matching algorithm

### V1.0
- [ ] Real-time voice cloning
- [ ] Advanced personality analysis
- [ ] Dynamic room generation
- [ ] WebRTC integration
- [ ] 50 beta users

### V2.0
- [ ] AI-powered conversation starters
- [ ] Skill verification system
- [ ] Professional networking features
- [ ] Mobile app

## 🤝 Contributing

This project is currently in stealth mode. For collaboration inquiries, please reach out directly.

## 📄 License

Proprietary - All Rights Reserved

## 🏆 Acknowledgments

- ElevenLabs for voice synthesis technology
- Hugging Face for transformer models
- The open-source ML community

---

*"In the future, your network won't be who you know, but who the algorithm knows you should know."*
