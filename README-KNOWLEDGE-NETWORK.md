# GiDiSpace Knowledge Network

> AI-mediated knowledge platform where experts have GiDis (AI digital twins) powered by their knowledge base.

## 🎯 What is This?

GiDiSpace Knowledge Network transforms how people learn from experts by combining:

- **Human-curated insights** (feed posts from experts you follow)
- **AI-powered deep dives** (chat with an expert's GiDi for unlimited Q&A)
- **Knowledge-first design** (no engagement farming, just learning)

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Supabase account (for database + pgvector)
- OpenAI API key (for embeddings)
- Anthropic API key (for Claude) or OpenAI (for GPT-4)
- ElevenLabs API key (optional, for voice features)

### 1. Clone and Install

```bash
# Fork the repo on GitHub first, then:
git clone https://github.com/YOUR-USERNAME/gidispace-knowledge-network.git
cd gidispace-knowledge-network

# Copy the new package.json
cp package-knowledge-network.json package.json

# Install dependencies
npm install
```

### 2. Set Up Environment

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your API keys:
# - DATABASE_URL
# - JWT_SECRET (generate with: openssl rand -base64 32)
# - OPENAI_API_KEY
# - ANTHROPIC_API_KEY
```

### 3. Set Up Supabase Database

```bash
# Create a new project at https://supabase.com
# Enable pgvector extension in SQL Editor:
# CREATE EXTENSION IF NOT EXISTS vector;

# Copy your Supabase connection string to .env.local:
# DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run Prisma migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate
```

### 4. Seed Demo Data (Optional)

```bash
# Create demo expert accounts with sample knowledge
npm run db:seed
```

### 5. Start Development Server

```bash
# Start Next.js dev server
npm run dev

# Open http://localhost:3000
```

## 📁 Project Structure

```
gidispace-knowledge-network/
├── app/
│   ├── api/                  # API routes (Next.js)
│   │   ├── auth/            # Authentication endpoints
│   │   │   ├── register/
│   │   │   ├── login/
│   │   │   └── refresh/
│   │   ├── users/           # User management (coming soon)
│   │   ├── follows/         # Follow system (coming soon)
│   │   ├── insights/        # Feed posts (coming soon)
│   │   ├── chat/            # GiDi chat (coming soon)
│   │   └── knowledge/       # Knowledge base (coming soon)
│   ├── (auth)/              # Auth pages (coming soon)
│   └── (app)/               # Main app pages (coming soon)
│
├── lib/                      # Core utilities
│   ├── db.ts                # Prisma client
│   ├── auth.ts              # JWT utilities
│   ├── llm-client.ts        # LLM abstraction (OpenAI/Claude)
│   ├── vector-store.ts      # Vector similarity search
│   ├── rag-service.ts       # RAG pipeline
│   ├── middleware.ts        # API middleware
│   └── validation.ts        # Zod schemas
│
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── migrations/          # Migration history
│   └── seed.ts              # Demo data (coming soon)
│
├── components/              # React components
│   └── ui/                  # shadcn/ui (reused from original)
│
├── .env.example             # Environment variables template
├── PRD-KNOWLEDGE-NETWORK.md # Product requirements
└── FORK-SETUP-GUIDE.md      # Detailed fork instructions
```

## 🔑 API Endpoints (Current Status)

### Authentication ✅

- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token

### Coming Soon 🚧

- Users (`/api/users`)
- Follows (`/api/follows`)
- Insights (`/api/insights`)
- Feed (`/api/feed`)
- Chat (`/api/chat`)
- Knowledge (`/api/knowledge`)

## 🧪 Testing the API

### Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "expert@example.com",
    "password": "SecurePass123",
    "displayName": "Dr. AI Expert",
    "bio": "AI researcher and educator",
    "role": "EXPERT"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "expert@example.com",
    "password": "SecurePass123"
  }'
```

Response:
```json
{
  "user": {
    "id": "uuid",
    "email": "expert@example.com",
    "displayName": "Dr. AI Expert",
    "role": "EXPERT"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### Use Access Token

```bash
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🏗️ What's Been Built

### Phase 0-1: Foundation ✅

- [x] Prisma schema with full data models
- [x] PostgreSQL + pgvector setup
- [x] Docker Compose for local dev
- [x] JWT authentication system
- [x] LLM client abstraction (OpenAI + Claude)
- [x] Vector store utilities
- [x] RAG service for Q&A
- [x] API middleware (auth, CORS, errors)
- [x] Zod validation schemas
- [x] Auth endpoints (register, login, refresh)

### Next Steps (Your Turn!)

- [ ] **Phase 2:** Knowledge source upload & processing
- [ ] **Phase 3:** Insights feed (create, read, react)
- [ ] **Phase 4:** GiDi chat with streaming
- [ ] **Phase 5:** Frontend UI components
- [ ] **Phase 6:** Polish & deploy

## 📚 Key Technologies

| Component | Technology | Why? |
|-----------|-----------|------|
| **Database** | Supabase (PostgreSQL + pgvector) | Managed DB + vector search + auth + storage |
| **ORM** | Prisma | Type-safe, great DX, handles migrations |
| **Auth** | JWT | Stateless, works across services |
| **LLM** | Claude 3.5 Sonnet / GPT-4 | Best-in-class reasoning |
| **Embeddings** | OpenAI `text-embedding-3-small` | Fast, cheap, good quality |
| **Voice** | ElevenLabs | High-quality text-to-speech for GiDi voices |
| **Frontend** | Next.js 15 (App Router) | Server components, API routes, streaming |
| **Styling** | Tailwind + shadcn/ui | Rapid UI development |
| **Validation** | Zod | Runtime type safety |

## 🔐 Security

- **Passwords:** Bcrypt hashed (10 rounds)
- **Tokens:** JWT with expiry (access: 7d, refresh: 30d)
- **API:** Rate limiting (coming soon)
- **Input:** Zod validation on all endpoints
- **SQL:** Parameterized queries via Prisma (SQL injection safe)

## 📊 Database Schema Highlights

### User Model
```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  displayName  String
  bio          String?
  role         Role     @default(SEEKER) // SEEKER | EXPERT | BOTH

  insights         Insight[]
  knowledgeSources KnowledgeSource[]
  following        Follow[]
  chatSessions     ChatSession[]
}
```

### Knowledge Chunk (Vector Search)
```prisma
model KnowledgeChunk {
  id        String @id @default(uuid())
  content   String @db.Text
  embedding Unsupported("vector(1536)") // pgvector
  expertId  String

  @@index([expertId])
}
```

### Insight (Feed Post)
```prisma
model Insight {
  id          String    @id @default(uuid())
  title       String
  body        String    @db.Text
  authorId    String
  publishedAt DateTime?
  likeCount   Int       @default(0)
  chatCount   Int       @default(0) // AI chats spawned from this

  reactions    InsightReaction[]
  chatSessions ChatSession[]
}
```

## 🎓 How RAG Works

```
1. User asks: "What is retrieval-augmented generation?"

2. System embeds question → [0.123, 0.456, ...] (1536D vector)

3. Vector search in expert's knowledge base:
   SELECT * FROM knowledge_chunks
   WHERE expert_id = 'expert-uuid'
   ORDER BY embedding <=> 'question-embedding'
   LIMIT 5

4. Build context from top 5 chunks:
   [Source 1] RAG is a technique...
   [Source 2] It combines retrieval...

5. Send to LLM:
   System: "You are Dr. AI Expert. Answer based on these sources:"
   Context: [sources]
   User: "What is RAG?"

6. Stream response with citations:
   "RAG combines retrieval with generation [Source 1]..."

7. Save message + sources to database
```

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Start Next.js
npm run type-check       # TypeScript check

# Database
npm run db:migrate       # Create migration
npm run db:generate      # Generate Prisma client
npm run db:studio        # Open Prisma Studio (GUI)
npm run db:seed          # Seed demo data

# Docker
npm run docker:up        # Start all services
npm run docker:down      # Stop all services

# Testing (coming soon)
npm run test             # Run tests
npm run test:watch       # Watch mode
```

## 🐛 Troubleshooting

**pgvector not found:**
```sql
-- Run in Supabase SQL Editor:
CREATE EXTENSION IF NOT EXISTS vector;
```

**Prisma client out of sync:**
```bash
npx prisma generate
```

**Port 3000 in use:**
```bash
lsof -ti:3000 | xargs kill -9
```

**Migration fails:**
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

## 📖 Documentation

- **Product Spec:** See [PRD-KNOWLEDGE-NETWORK.md](./PRD-KNOWLEDGE-NETWORK.md)
- **Setup Guide:** See [FORK-SETUP-GUIDE.md](./FORK-SETUP-GUIDE.md)
- **API Docs:** (Coming soon - OpenAPI spec)

## 🎯 Success Metrics

From [PRD Section 8](./PRD-KNOWLEDGE-NETWORK.md#8-success-metrics-mvp):

- **Engagement:** 30% DAU/MAU, 5+ insights read/session, 20%+ insights spawn chats
- **Quality:** 70%+ thumbs up on AI responses, 8/10 expert satisfaction
- **Growth:** 50 experts, 500 seekers in month 1

## 🚧 Roadmap

- [x] **Week 1-2:** Foundation (auth, DB, core utils)
- [ ] **Week 3:** Knowledge processing pipeline
- [ ] **Week 4:** Insights feed
- [ ] **Week 5-6:** AI chat with streaming
- [ ] **Week 7:** Frontend UI
- [ ] **Week 8:** Polish & deploy

## 💡 Future Ideas

From [PRD Section 12](./PRD-KNOWLEDGE-NETWORK.md#12-future-enhancements-post-mvp):

- **V2:** Comments, trending, notifications
- **V3:** Monetization (subscriptions, payouts)
- **V4:** 3D integration (VRM avatars, lobbies) - return to GiDiSpace roots!
- **V5:** Multi-expert debates, voice chat

## 🤝 Contributing

This is a fork/pivot of the original GiDiSpace metaverse project. See:
- Original repo: [PlotTwist-RPG](https://github.com/ORIGINAL-USERNAME/PlotTwist-RPG)
- Original features: VRM avatars, Three.js 3D world, NPC interactions

## 📄 License

MIT (same as original GiDiSpace project)

---

**Built with Claude Code** 🤖

Questions? See [FORK-SETUP-GUIDE.md](./FORK-SETUP-GUIDE.md) or open an issue.
