# Getting Started with GiDiSpace Knowledge Network

> **Quick start guide** - go from 0 to running API in 5 minutes

## What Just Got Created?

I've built the complete foundation for transforming GiDiSpace into a knowledge-first social platform:

### 📄 Documentation
- **[PRD-KNOWLEDGE-NETWORK.md](./PRD-KNOWLEDGE-NETWORK.md)** - Complete product spec (14 sections, ~5000 words)
- **[README-KNOWLEDGE-NETWORK.md](./README-KNOWLEDGE-NETWORK.md)** - Developer guide
- **[FORK-SETUP-GUIDE.md](./FORK-SETUP-GUIDE.md)** - Detailed fork instructions
- **This file** - Quick start guide

### 🗄️ Database & Infrastructure
- **[prisma/schema.prisma](./prisma/schema.prisma)** - Full data model (9 models, relationships, indexes)
- **Supabase** - Managed PostgreSQL + pgvector + Auth + Storage
- **[.env.example](./.env.example)** - Environment variable template
- **[package-knowledge-network.json](./package-knowledge-network.json)** - Updated dependencies

### 🔧 Core Libraries (lib/)
- **[db.ts](./lib/db.ts)** - Prisma client singleton
- **[auth.ts](./lib/auth.ts)** - JWT authentication (hash, verify, generate tokens)
- **[llm-client.ts](./lib/llm-client.ts)** - LLM abstraction (OpenAI + Claude, streaming)
- **[vector-store.ts](./lib/vector-store.ts)** - pgvector similarity search
- **[rag-service.ts](./lib/rag-service.ts)** - RAG pipeline (retrieval + generation)
- **[middleware.ts](./lib/middleware.ts)** - Auth middleware, CORS, error handling
- **[validation.ts](./lib/validation.ts)** - Zod schemas for all endpoints

### 🚀 API Endpoints (app/api/)
- **[auth/register/route.ts](./app/api/auth/register/route.ts)** - User registration
- **[auth/login/route.ts](./app/api/auth/login/route.ts)** - User login
- **[auth/refresh/route.ts](./app/api/auth/refresh/route.ts)** - Refresh access token

---

## 🚀 Start Here (5 Minutes)

### 1. Install Dependencies

```bash
# Replace package.json with the knowledge network version
cp package-knowledge-network.json package.json

# Install
npm install
```

### 2. Set Up Environment

```bash
# Copy template
cp .env.example .env.local

# Edit these 3 keys in .env.local:
# 1. JWT_SECRET - run: openssl rand -base64 32
# 2. OPENAI_API_KEY - get from https://platform.openai.com/api-keys
# 3. ANTHROPIC_API_KEY - get from https://console.anthropic.com/
```

Example `.env.local`:
```bash
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
JWT_SECRET="your-generated-secret-here"
OPENAI_API_KEY="sk-proj-..."
ANTHROPIC_API_KEY="sk-ant-..."
ELEVENLABS_API_KEY="..." # Optional, for voice features
DEFAULT_LLM_PROVIDER="anthropic"
DEFAULT_LLM_MODEL="claude-3-5-sonnet-20241022"
```

### 3. Set Up Supabase Database

```bash
# 1. Create a project at https://supabase.com
# 2. In SQL Editor, enable pgvector:
#    CREATE EXTENSION IF NOT EXISTS vector;
# 3. Copy your connection string to .env.local

# Create tables
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate
```

### 4. Start Dev Server

```bash
npm run dev
```

### 5. Test the API

```bash
# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "displayName": "Test User",
    "role": "EXPERT"
  }'

# You should see:
# {
#   "user": { "id": "...", "email": "test@example.com", ... },
#   "accessToken": "eyJhbGc...",
#   "refreshToken": "eyJhbGc..."
# }
```

✅ **If you see tokens, it's working!**

---

## 📂 File Structure

```
PlotTwist-RPG/
├── 📘 PRD-KNOWLEDGE-NETWORK.md      (Product spec - READ THIS)
├── 📗 README-KNOWLEDGE-NETWORK.md   (Developer guide)
├── 📙 FORK-SETUP-GUIDE.md           (Fork instructions)
├── 📕 GETTING-STARTED.md            (This file)
│
├── lib/                              (Core utilities - ALL DONE ✅)
│   ├── db.ts                        (Database client)
│   ├── auth.ts                      (JWT auth)
│   ├── llm-client.ts                (OpenAI + Claude)
│   ├── vector-store.ts              (Vector search)
│   ├── rag-service.ts               (RAG pipeline)
│   ├── middleware.ts                (API middleware)
│   └── validation.ts                (Zod schemas)
│
├── app/api/                          (API routes)
│   └── auth/                        (✅ DONE)
│       ├── register/route.ts
│       ├── login/route.ts
│       └── refresh/route.ts
│
├── prisma/
│   └── schema.prisma                (✅ DONE - 9 models)
│
├── Supabase                         (Managed PostgreSQL + pgvector)
├── .env.example                     (✅ DONE)
└── package-knowledge-network.json   (✅ DONE)
```

---

## 🎯 What's Next? (Your Choice)

You have options on how to proceed:

### Option A: Build Knowledge Upload (Recommended Next)

**What:** Let experts upload PDFs/text, process them into vector embeddings

**Why:** This is the core value - GiDis need knowledge to work

**Tasks:**
1. Create `app/api/knowledge/sources/route.ts` (upload endpoint)
2. Create knowledge processing job queue
3. Implement chunking (500 tokens, 50 overlap)
4. Generate embeddings with OpenAI
5. Store in pgvector

**See:** PRD Section 3.3 for spec

### Option B: Build Insights Feed

**What:** Let experts post insights, seekers see a feed

**Why:** Gives users something to do before chat is built

**Tasks:**
1. Create `app/api/insights/route.ts` (CRUD endpoints)
2. Create `app/api/feed/route.ts` (personalized feed)
3. Create follow system (`app/api/follows/route.ts`)
4. Build simple React components for feed

**See:** PRD Section 3.4 for spec

### Option C: Build AI Chat (Most Exciting)

**What:** Chat with expert GiDis, streaming responses

**Why:** This is the killer feature

**Tasks:**
1. Create `app/api/chat/sessions/route.ts`
2. Create `app/api/chat/sessions/[id]/messages/route.ts` (streaming)
3. Wire up RAG service (already built!)
4. Build chat UI with streaming

**See:** PRD Sections 3.5 & Appendix for code examples

### Option D: Build Frontend First

**What:** Create UI components, wire up with mock data

**Why:** See the vision come to life faster

**Tasks:**
1. Create Next.js pages (`app/(auth)`, `app/(app)`)
2. Reuse existing `components/ui` from original GiDiSpace
3. Build feed, chat, profile components
4. Add React Query for data fetching

---

## 🧪 Testing What's Built

### Manual API Testing

Use the scripts in `scripts/test-api.sh` (you can create this):

```bash
#!/bin/bash

API_URL="http://localhost:3000"

echo "Testing registration..."
REGISTER_RESPONSE=$(curl -s -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "expert@test.com",
    "password": "Expert123",
    "displayName": "Dr. Test Expert",
    "bio": "AI researcher",
    "role": "EXPERT"
  }')

echo $REGISTER_RESPONSE | jq

ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.accessToken')

echo "\nTesting authenticated request..."
curl -s $API_URL/api/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

### Database Inspection

```bash
# Open Prisma Studio (GUI)
npx prisma studio

# Or use Supabase Dashboard
# https://supabase.com/dashboard/project/[YOUR-PROJECT]/editor
```

---

## 🐛 Common Issues

### "Can't connect to database"

```bash
# Verify your Supabase connection string in .env.local
# Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Check if Supabase project is active at https://supabase.com/dashboard
```

### "Prisma client is not generated"

```bash
npx prisma generate
```

### "Module not found: @/lib/..."

TypeScript paths not configured. Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### "pgvector extension not found"

```sql
-- Run in Supabase SQL Editor (https://supabase.com/dashboard/project/[YOUR-PROJECT]/sql):
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 📚 Key Concepts to Understand

### 1. RAG (Retrieval-Augmented Generation)

```
User question
    ↓
Embed question (OpenAI)
    ↓
Vector search (pgvector)
    ↓
Find top 5 similar knowledge chunks
    ↓
Build context prompt with sources
    ↓
Send to LLM (Claude/GPT-4)
    ↓
Stream response back
```

**Code:** See `lib/rag-service.ts`

### 2. JWT Authentication

```
User registers
    ↓
Hash password (bcrypt)
    ↓
Generate access token (7d expiry)
Generate refresh token (30d expiry)
    ↓
User stores tokens in localStorage
    ↓
Subsequent requests include:
Authorization: Bearer {accessToken}
    ↓
Middleware verifies token
    ↓
Request proceeds with user ID
```

**Code:** See `lib/auth.ts`, `lib/middleware.ts`

### 3. Vector Similarity Search

```sql
-- Find similar chunks to a question
SELECT
  id,
  content,
  1 - (embedding <=> 'question-embedding'::vector) as similarity
FROM knowledge_chunks
WHERE expert_id = 'expert-uuid'
ORDER BY embedding <=> 'question-embedding'::vector
LIMIT 5;
```

**Code:** See `lib/vector-store.ts`

---

## 📖 Recommended Reading Order

1. **[GETTING-STARTED.md](./GETTING-STARTED.md)** (this file) ← You are here
2. **[PRD-KNOWLEDGE-NETWORK.md](./PRD-KNOWLEDGE-NETWORK.md)** - Understand the vision
3. **[README-KNOWLEDGE-NETWORK.md](./README-KNOWLEDGE-NETWORK.md)** - Developer reference
4. **Code examples in PRD Appendix** - See RAG service, feed service

---

## 🎓 Learning Resources

### RAG & Vector Search
- [Pinecone RAG Guide](https://www.pinecone.io/learn/retrieval-augmented-generation/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [LangChain Chunking](https://js.langchain.com/docs/modules/data_connection/document_transformers/)

### Next.js App Router
- [Next.js 15 Docs](https://nextjs.org/docs)
- [App Router Patterns](https://nextjs.org/docs/app/building-your-application)

### Prisma
- [Prisma Quickstart](https://www.prisma.io/docs/getting-started)
- [Prisma Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)

---

## 🤔 Decision Points

### Forking vs. Branching

You chose: **Fork entirely** ✅

**Pros:**
- Clean separation from 3D metaverse code
- Independent evolution
- Easier to manage different visions

**Next step:** Create GitHub repo, push code

### What to Build First

You chose: **Auth + basic data models** ✅

**Status:** DONE! Now choose next:
- [ ] Knowledge upload pipeline
- [ ] Insights feed
- [ ] AI chat
- [ ] Frontend

---

## 🚀 Deploy to Production (Later)

When ready to deploy:

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# - DATABASE_URL (use Vercel Postgres or Supabase)
# - JWT_SECRET
# - OPENAI_API_KEY
# - ANTHROPIC_API_KEY
```

### Option 2: Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway up

# Add PostgreSQL service in Railway dashboard
railway add -d postgres
```

---

## 📞 Get Help

- **Technical questions:** Open issue on GitHub
- **PRD clarifications:** See [PRD Section 13](./PRD-KNOWLEDGE-NETWORK.md#13-open-questions-for-team)
- **Original GiDiSpace code:** See [CLAUDE.md](./CLAUDE.md)

---

## 🎉 You're Ready!

Everything is set up. The foundation is solid. Time to build!

**Recommended next step:**
1. Get the dev environment running (follow steps above)
2. Test the auth endpoints
3. Read the PRD to understand the full vision
4. Pick one of the "What's Next" options
5. Start building! 🚀

**Built with Claude Code** 🤖
