# GiDiSpace Knowledge Network - Setup Guide

This guide will help you set up the GiDiSpace knowledge network project.

## Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR-USERNAME/gidispace-knowledge-network.git
cd gidispace-knowledge-network

# Install dependencies
npm install
```

## Step 2: Set Up Supabase

1. Create a new project at https://supabase.com
2. In the SQL Editor, enable pgvector:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Copy your connection string from Settings > Database

## Step 3: Set Up Environment Variables

```bash
# Copy example env file
cp .env.example .env.local

# Edit .env.local with your values:
# DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
# JWT_SECRET="your-secret-key-min-32-chars"
# OPENAI_API_KEY="sk-..."
# ANTHROPIC_API_KEY="sk-ant-..." (for Claude)
# ELEVENLABS_API_KEY="..." (optional, for voice features)
```

## Step 4: Initialize Database

```bash
# Run Prisma migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# (Optional) Seed with demo data
npm run db:seed
```

## Step 5: Run Development Server

```bash
npm run dev

# Open http://localhost:3000
```

## Project Structure (New)

```
gidispace-knowledge-network/
├── app/                      # Next.js app directory
│   ├── (auth)/              # Auth pages (login, register)
│   ├── (app)/               # Main app pages (feed, chat, profile)
│   │   ├── feed/
│   │   ├── chat/
│   │   ├── experts/
│   │   └── knowledge/
│   ├── api/                 # API routes
│   │   ├── auth/
│   │   ├── users/
│   │   ├── insights/
│   │   ├── chat/
│   │   └── knowledge/
│   └── layout.tsx
├── components/              # React components
│   ├── ui/                  # shadcn/ui components (keep from original)
│   ├── feed/
│   ├── chat/
│   └── knowledge/
├── lib/                     # Utilities
│   ├── db.ts               # Prisma client
│   ├── auth.ts             # JWT utilities
│   ├── rag/                # RAG pipeline
│   │   ├── embeddings.ts
│   │   ├── vectorStore.ts
│   │   └── llmClient.ts
│   └── api/                # API helpers
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── docker-compose.yml       # Local dev environment
├── PRD-KNOWLEDGE-NETWORK.md # Product requirements
└── README.md
```

## What's Included

- ✅ Prisma ORM with Supabase (PostgreSQL)
- ✅ pgvector for embeddings (via Supabase)
- ✅ JWT authentication system
- ✅ RAG pipeline (retrieval-augmented generation)
- ✅ LLM client abstraction (Claude/GPT-4)
- ✅ ElevenLabs integration for GiDi voice
- ✅ Streaming chat API
- ✅ Vector search utilities

## Development Workflow

1. **Make changes** to code
2. **Update Prisma schema** if needed → `npx prisma migrate dev`
3. **Test API endpoints** → `npm run test:api` (coming soon)
4. **Test frontend** → `npm run test` (Jest + RTL)
5. **Commit** → automated hooks run type-check + lint
6. **Push** → CI runs full test suite

## Troubleshooting

**Issue: pgvector not found**
```sql
-- Run in Supabase SQL Editor:
CREATE EXTENSION IF NOT EXISTS vector;
```

**Issue: Prisma client out of sync**
```bash
npx prisma generate
```

**Issue: Port 3000 already in use**
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9
```

## Next Steps

After setup:
1. ✅ Read through `PRD-KNOWLEDGE-NETWORK.md`
2. ✅ Run through user flows manually
3. ✅ Set up demo expert accounts
4. ✅ Upload sample knowledge bases
5. ✅ Test RAG chat responses
6. 🚀 Launch!

---

**Questions?** See [CONTRIBUTING.md](./CONTRIBUTING.md) or open an issue.
