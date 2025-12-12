# GiDiSpace — AI-Mediated Knowledge Network
## Product Requirements Document v1.0

---

## 1. Vision & Problem Statement

### The Problem
Traditional social platforms optimize for engagement over learning. Expert knowledge is scattered across threads, buried in noise, and hard to access at the right depth. Users either get surface-level takes or must dig through hours of content to learn from experts.

### The Solution
**GiDiSpace** is a knowledge-first social platform where every expert you follow has a GiDi (AI digital twin) trained on their knowledge base. The platform delivers:
- **Curated insights** from experts in your feed (human-authored)
- **Infinite depth** via GiDi conversations (machine-mediated)
- **Personalized learning paths** adapted to your knowledge level and interests

### Vision
Transform how people learn from experts by making knowledge both discoverable (feed) and explorable (AI chat) in one seamless experience.

---

## 2. User Personas

### Primary: The Knowledge Seeker (Sarah)
- **Profile:** 28, product manager, wants to stay current on AI/tech
- **Behavior:** Follows 20-30 experts, reads during commute, deep-dives on weekends
- **Pain:** Too much content, not enough time to find the signal
- **Goal:** Understand complex topics at her own pace

### Secondary: The Expert Creator (Dr. Alex)
- **Profile:** 42, AI researcher, wants to share knowledge at scale
- **Behavior:** Writes weekly insights, answers questions, builds following
- **Pain:** Can't respond to everyone, same questions repeatedly
- **Goal:** Amplify impact, help more people learn, build reputation

---

## 3. Core Features (MVP Scope)

### 3.1 User Authentication & Profiles
**As a user, I can:**
- ✅ Sign up with email/password (OAuth future)
- ✅ Create a profile (name, bio, avatar URL)
- ✅ Switch between "seeker" and "expert" roles

**Data Model:**
```typescript
User {
  id: string (UUID)
  email: string (unique)
  passwordHash: string
  displayName: string
  bio?: string
  avatarUrl?: string
  role: 'seeker' | 'expert' | 'both'
  createdAt: timestamp
  updatedAt: timestamp
}
```

### 3.2 Expert Following System
**As a seeker, I can:**
- ✅ Browse/search experts by name or topic
- ✅ Follow/unfollow experts
- ✅ See my following list

**Data Model:**
```typescript
Follow {
  id: string
  followerId: string (User.id)
  expertId: string (User.id)
  createdAt: timestamp
}
```

**API Endpoints:**
- `POST /api/follows` - Follow an expert
- `DELETE /api/follows/:expertId` - Unfollow
- `GET /api/users/:userId/following` - List following
- `GET /api/users/:userId/followers` - List followers

### 3.3 Expert Knowledge Bases
**As an expert, I can:**
- ✅ Upload knowledge sources (PDFs, text, URLs)
- ✅ See my knowledge base size and status
- ✅ Delete/update sources

**Data Model:**
```typescript
KnowledgeSource {
  id: string
  expertId: string (User.id)
  type: 'pdf' | 'text' | 'url' | 'markdown'
  title: string
  content?: string (for text type)
  url?: string (for pdf/url type)
  vectorized: boolean
  chunkCount: number
  uploadedAt: timestamp
}

KnowledgeChunk {
  id: string
  sourceId: string (KnowledgeSource.id)
  expertId: string
  content: string
  embedding: vector(1536) // or your chosen dimension
  metadata: json // {page, section, etc}
  createdAt: timestamp
}
```

**Background Processing:**
- On upload → chunk content → generate embeddings → store in vector DB
- Use job queue (BullMQ or pg-boss) for async processing

### 3.4 Insights Feed
**As a seeker, I can:**
- ✅ View a personalized feed of insights from experts I follow
- ✅ See newest insights first (chronological for MVP)
- ✅ React to insights (like/bookmark)
- ✅ Click "Ask GiDi" to start a deep-dive chat

**As an expert, I can:**
- ✅ Create a new insight (title, body, optional media)
- ✅ Edit/delete my insights
- ✅ See engagement metrics (views, likes, GiDi chat sessions started)

**Data Model:**
```typescript
Insight {
  id: string
  authorId: string (User.id)
  title: string
  body: string (markdown)
  mediaUrls?: string[]
  published: boolean
  publishedAt?: timestamp
  viewCount: number
  likeCount: number
  chatCount: number // # of GiDi chats spawned from this
  createdAt: timestamp
  updatedAt: timestamp
}

InsightReaction {
  id: string
  insightId: string
  userId: string
  type: 'like' | 'bookmark'
  createdAt: timestamp
}
```

**API Endpoints:**
- `GET /api/feed` - Get personalized feed (paginated)
- `POST /api/insights` - Create insight (expert only)
- `GET /api/insights/:id` - Get single insight
- `PUT /api/insights/:id` - Update insight
- `DELETE /api/insights/:id` - Delete insight
- `POST /api/insights/:id/reactions` - React to insight

### 3.5 GiDi Chat (Deep Dive)
**As a seeker, I can:**
- ✅ Click "Chat with GiDi" on any insight
- ✅ Ask follow-up questions in natural language
- ✅ Get responses grounded in the expert's knowledge base
- ✅ See sources/citations for GiDi responses
- ✅ Continue conversation across multiple messages

**Data Model:**
```typescript
ChatSession {
  id: string
  userId: string (seeker)
  expertId: string (the GiDi)
  insightId?: string // if spawned from an insight
  title: string // auto-generated from first message
  createdAt: timestamp
  updatedAt: timestamp
}

ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  sources?: CitedSource[] // knowledge chunks used
  createdAt: timestamp
}

CitedSource {
  chunkId: string
  sourceTitle: string
  excerpt: string
  relevanceScore: number
}
```

**RAG Pipeline (Retrieval-Augmented Generation):**
```
1. User asks question
2. Embed question with same model as knowledge base
3. Vector search expertId's chunks (cosine similarity, top-k=5)
4. Build prompt:
   - System: "You are [Expert Name]'s GiDi. Answer based only on these sources..."
   - Context: [top chunks]
   - User message
5. Stream LLM response
6. Save message + sources
```

**API Endpoints:**
- `POST /api/chat/sessions` - Start new chat session
- `GET /api/chat/sessions/:id` - Get session history
- `POST /api/chat/sessions/:id/messages` - Send message (streaming response)
- `GET /api/users/:userId/chats` - List user's chat sessions

### 3.6 Search & Discovery
**As a seeker, I can:**
- ✅ Search for experts by name/bio
- ✅ Browse experts by topic/tag (future: AI-suggested)
- ✅ See trending insights (future: algorithmic)

**For MVP:**
- Simple text search on User.displayName, User.bio
- Order by follower count

---

## 4. Tech Stack

### Backend
- **Runtime:** Node.js 20+ with TypeScript
- **Framework:** Express or Fastify
- **Auth:** JWT-based (access + refresh tokens)
- **Validation:** Zod for request/response schemas
- **Job Queue:** pg-boss (Postgres-based, simpler for MVP)

### Database
- **Primary DB:** Supabase (PostgreSQL)
- **ORM:** Prisma (or Supabase client)
- **Vector Extension:** pgvector via Supabase
- **Migrations:** Prisma Migrate or Supabase migrations

### AI/ML
- **Embeddings:** OpenAI `text-embedding-3-small` (1536 dim) or similar
- **LLM:** Claude 3.5 Sonnet or GPT-4 (via abstracted `llmClient`)
- **Chunking:** LangChain or custom splitter (500 tokens, 50 overlap)

### Frontend (Reuse existing GiDiSpace components where possible)
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** React Query for server state, Zustand for UI state
- **Markdown:** react-markdown for insight rendering
- **Streaming:** Vercel AI SDK or custom SSE for chat responses

### Infrastructure
- **Hosting:** Vercel (frontend + API routes) or Railway
- **Database:** Supabase (managed PostgreSQL + pgvector)
- **Blob Storage:** Supabase Storage or Vercel Blob for PDFs/media
- **Voice:** ElevenLabs for text-to-speech (GiDi voice responses)
- **Monitoring:** Sentry for errors, PostHog for analytics (optional)

---

## 5. Data Architecture

### Database Schema (Prisma)
```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String
  displayName   String
  bio           String?
  avatarUrl     String?
  role          Role     @default(SEEKER)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  insights       Insight[]
  knowledgeSources KnowledgeSource[]
  following      Follow[]   @relation("UserFollowing")
  followers      Follow[]   @relation("UserFollowers")
  chatSessions   ChatSession[]
  reactions      InsightReaction[]
}

enum Role {
  SEEKER
  EXPERT
  BOTH
}

model Follow {
  id         String   @id @default(uuid())
  followerId String
  expertId   String
  createdAt  DateTime @default(now())

  follower   User     @relation("UserFollowing", fields: [followerId], references: [id], onDelete: Cascade)
  expert     User     @relation("UserFollowers", fields: [expertId], references: [id], onDelete: Cascade)

  @@unique([followerId, expertId])
  @@index([followerId])
  @@index([expertId])
}

model KnowledgeSource {
  id         String   @id @default(uuid())
  expertId   String
  type       SourceType
  title      String
  content    String?  @db.Text
  url        String?
  vectorized Boolean  @default(false)
  chunkCount Int      @default(0)
  uploadedAt DateTime @default(now())

  expert     User     @relation(fields: [expertId], references: [id], onDelete: Cascade)
  chunks     KnowledgeChunk[]

  @@index([expertId])
}

enum SourceType {
  PDF
  TEXT
  URL
  MARKDOWN
}

model KnowledgeChunk {
  id        String   @id @default(uuid())
  sourceId  String
  expertId  String
  content   String   @db.Text
  embedding Unsupported("vector(1536)")? // pgvector
  metadata  Json?
  createdAt DateTime @default(now())

  source    KnowledgeSource @relation(fields: [sourceId], references: [id], onDelete: Cascade)

  @@index([expertId])
  @@index([sourceId])
}

model Insight {
  id          String   @id @default(uuid())
  authorId    String
  title       String
  body        String   @db.Text
  mediaUrls   String[]
  published   Boolean  @default(false)
  publishedAt DateTime?
  viewCount   Int      @default(0)
  likeCount   Int      @default(0)
  chatCount   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  author      User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  reactions   InsightReaction[]
  chatSessions ChatSession[]

  @@index([authorId])
  @@index([publishedAt])
}

model InsightReaction {
  id        String   @id @default(uuid())
  insightId String
  userId    String
  type      ReactionType
  createdAt DateTime @default(now())

  insight   Insight  @relation(fields: [insightId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([insightId, userId, type])
  @@index([insightId])
  @@index([userId])
}

enum ReactionType {
  LIKE
  BOOKMARK
}

model ChatSession {
  id        String   @id @default(uuid())
  userId    String
  expertId  String
  insightId String?
  title     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  insight   Insight? @relation(fields: [insightId], references: [id], onDelete: SetNull)
  messages  ChatMessage[]

  @@index([userId])
  @@index([expertId])
  @@index([insightId])
}

model ChatMessage {
  id        String   @id @default(uuid())
  sessionId String
  role      MessageRole
  content   String   @db.Text
  sources   Json?    // CitedSource[]
  createdAt DateTime @default(now())

  session   ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}

enum MessageRole {
  USER
  ASSISTANT
}
```

### Vector Search Strategy
```sql
-- Create pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Similarity search query
SELECT
  kc.id,
  kc.content,
  ks.title as source_title,
  kc.metadata,
  1 - (kc.embedding <=> $1::vector) AS similarity
FROM knowledge_chunks kc
JOIN knowledge_sources ks ON kc.source_id = ks.id
WHERE kc.expert_id = $2
ORDER BY kc.embedding <=> $1::vector
LIMIT $3;
```

---

## 6. API Design

### Authentication
```typescript
POST /api/auth/register
  Body: { email, password, displayName }
  Returns: { user, accessToken, refreshToken }

POST /api/auth/login
  Body: { email, password }
  Returns: { user, accessToken, refreshToken }

POST /api/auth/refresh
  Body: { refreshToken }
  Returns: { accessToken }

POST /api/auth/logout
  Body: { refreshToken }
  Returns: { success: true }
```

### Users
```typescript
GET /api/users/:id
  Returns: { user, followerCount, followingCount, insightCount }

PUT /api/users/:id
  Body: { displayName?, bio?, avatarUrl? }
  Returns: { user }

GET /api/users
  Query: { search?, role?, limit=20, offset=0 }
  Returns: { users, total }
```

### Follows
```typescript
POST /api/follows
  Body: { expertId }
  Returns: { follow }

DELETE /api/follows/:expertId
  Returns: { success: true }

GET /api/users/:userId/following
  Query: { limit=50, offset=0 }
  Returns: { experts, total }

GET /api/users/:userId/followers
  Returns: { followers, total }
```

### Knowledge Sources
```typescript
POST /api/knowledge/sources
  Headers: { Authorization: "Bearer {token}" }
  Body: FormData { file: File, title: string, type: SourceType }
  Returns: { source, jobId } // async processing

GET /api/knowledge/sources
  Query: { expertId }
  Returns: { sources }

DELETE /api/knowledge/sources/:id
  Returns: { success: true }

GET /api/knowledge/sources/:id/status
  Returns: { source, vectorized, chunkCount, progress }
```

### Insights
```typescript
GET /api/feed
  Headers: { Authorization: "Bearer {token}" }
  Query: { limit=20, cursor? }
  Returns: { insights, nextCursor }

POST /api/insights
  Body: { title, body, mediaUrls?, published=false }
  Returns: { insight }

GET /api/insights/:id
  Returns: { insight, author, isFollowing }

PUT /api/insights/:id
  Body: { title?, body?, mediaUrls?, published? }
  Returns: { insight }

DELETE /api/insights/:id
  Returns: { success: true }

POST /api/insights/:id/reactions
  Body: { type: 'like' | 'bookmark' }
  Returns: { reaction }

DELETE /api/insights/:id/reactions/:type
  Returns: { success: true }
```

### Chat
```typescript
POST /api/chat/sessions
  Body: { expertId, insightId?, initialMessage }
  Returns: { session, firstResponse } // streaming

GET /api/chat/sessions/:id
  Returns: { session, messages }

POST /api/chat/sessions/:id/messages
  Body: { message }
  Returns: SSE stream of tokens + sources at end

GET /api/users/:userId/chats
  Query: { limit=20, offset=0 }
  Returns: { sessions, total }

DELETE /api/chat/sessions/:id
  Returns: { success: true }
```

---

## 7. User Flows

### Flow 1: Seeker Onboarding
1. Land on homepage → "Sign Up" CTA
2. Register (email/password) → verify email (future)
3. Onboarding: "Follow 3+ experts to get started"
   - Browse suggested experts (top by followers)
   - Click "Follow" on 3 experts
4. Redirect to `/feed` → see first insights

### Flow 2: Expert Setup
1. Sign up → toggle "I'm an expert" in profile
2. Navigate to `/knowledge` dashboard
3. Upload first source:
   - Click "Add Knowledge Source"
   - Upload PDF or paste text/URL
   - See processing status (spinner → ✓ Vectorized)
4. Create first insight:
   - `/insights/new`
   - Write title + body in markdown editor
   - Preview → Publish
5. See insight in feed, watch engagement metrics

### Flow 3: Deep Dive Chat
1. Seeker scrolling feed → sees interesting insight
2. Click "Chat with GiDi" button
3. Modal/page opens with:
   - Insight context at top
   - Chat interface below
4. Type question → stream response with citations
5. Continue conversation → see sources expand inline
6. Bookmark session for later → return via "My Chats"

---

## 8. Success Metrics (MVP)

### Engagement
- **DAU/MAU ratio** > 0.3 (users return frequently)
- **Avg insights read per session** > 5
- **% of insights that spawn GiDi chats** > 20%
- **Avg chat messages per session** > 4

### Quality
- **User thumbs up on GiDi responses** > 70%
- **Expert satisfaction score** (survey) > 8/10
- **Knowledge base upload rate** (experts adding sources) increasing

### Growth
- **Expert signups** > 50 in first month
- **Seeker signups** > 500 in first month
- **Follows per seeker** avg > 5

---

## 9. Non-Goals (Out of Scope for MVP)

❌ **NPC/3D world** - Future phase, not MVP
❌ **Algorithmic feed** - Chronological only for MVP
❌ **Direct expert messaging** - GiDi only
❌ **Paid subscriptions** - Monetization v2
❌ **Mobile apps** - Web-first, responsive design
❌ **Video/audio content** - Text/images only
❌ **Community/groups** - 1:1 expert-follower model only
❌ **Real-time notifications** - Email digests ok, push later

---

## 10. Implementation Phases

### Phase 0: Setup (Week 1)
- [ ] Initialize new branch `feature/knowledge-network`
- [ ] Set up Prisma + PostgreSQL with pgvector
- [ ] Create authentication system (JWT)
- [ ] Build base API structure (Express/Fastify)
- [ ] Set up dev environment with Docker Compose

### Phase 1: Core Data Models (Week 2)
- [ ] Implement User, Follow, KnowledgeSource schemas
- [ ] Build auth endpoints (register/login/refresh)
- [ ] Create follow/unfollow API
- [ ] Add user profile CRUD

### Phase 2: Knowledge Processing (Week 3)
- [ ] Build upload endpoint for knowledge sources
- [ ] Implement chunking pipeline (LangChain)
- [ ] Integrate embedding API (OpenAI)
- [ ] Set up pg-boss job queue for async processing
- [ ] Build vector search function

### Phase 3: Insights Feed (Week 4)
- [ ] Create Insight schema + API
- [ ] Build feed endpoint (chronological, paginated)
- [ ] Add reactions (like/bookmark)
- [ ] Create insight authoring UI
- [ ] Build feed viewer UI

### Phase 4: GiDi Chat (Week 5-6)
- [ ] Implement RAG pipeline (retrieve + generate)
- [ ] Build chat session management
- [ ] Create streaming response endpoint
- [ ] Add citation tracking
- [ ] Build chat UI with streaming + sources

### Phase 5: Polish & Launch (Week 7-8)
- [ ] Add search/discovery for experts
- [ ] Build expert profile pages
- [ ] Add analytics dashboard for experts
- [ ] Performance optimization (caching, indexes)
- [ ] Security audit (SQL injection, XSS, rate limiting)
- [ ] Write API documentation
- [ ] Deploy to production

---

## 11. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Vector search too slow** | High | Add HNSW index, cache common queries, limit knowledge base size |
| **LLM costs too high** | Medium | Rate limit, cache responses, use cheaper models for simple queries |
| **Hallucinations in GiDi responses** | High | Strong system prompts, citation requirements, user feedback loop |
| **Knowledge upload abuse** | Medium | File size limits, rate limiting, content moderation (future) |
| **Cold start (no experts)** | High | Seed with 10-20 demo experts, manual outreach, incentive program |

---

## 12. Future Enhancements (Post-MVP)

### V2: Social Features
- Comments on insights (human-to-human)
- Expert verification badges
- Trending insights algorithm
- Notifications system

### V3: Monetization
- Premium expert subscriptions
- Priority GiDi responses for paid users
- Expert payouts based on engagement
- Sponsored insights

### V4: 3D Integration (Return to GiDiSpace roots)
- Expert lobbies as 3D spaces
- VRM avatars for GiDis
- Walk up to GiDi to start chat
- Spatial audio for multi-person chats

### V5: Advanced AI
- Multi-expert synthesis (ask multiple GiDis at once)
- Debate mode (two GiDis discuss)
- Learning paths (AI generates curriculum)
- Voice chat with GiDis (via ElevenLabs)

---

## 13. Open Questions for Team

1. **Authentication:** Start with email/password or prioritize OAuth (Google/GitHub)?
2. **Monetization timing:** Free during beta or charge from day 1?
3. **Expert incentives:** How do we attract first 50 experts?
4. **Content moderation:** Manual review or automated? What's the policy?
5. **Mobile strategy:** When do we build native apps vs staying web-only?
6. **Branding:** Does "GiDiSpace" still fit this pivot? Consider rename?

---

## 14. Appendix: Code Examples

### Example: RAG Pipeline Service
```typescript
// services/ragService.ts
import { openai } from './llmClient';
import { prisma } from './db';
import { pgVector } from './vectorStore';

interface RAGResponse {
  answer: string;
  sources: CitedSource[];
}

export async function answerQuestion(
  question: string,
  expertId: string,
  conversationHistory: ChatMessage[] = []
): Promise<RAGResponse> {
  // 1. Embed the question
  const questionEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question,
  });

  // 2. Vector search for relevant chunks
  const relevantChunks = await pgVector.search({
    embedding: questionEmbedding.data[0].embedding,
    expertId,
    limit: 5,
    threshold: 0.7,
  });

  if (relevantChunks.length === 0) {
    return {
      answer: "I don't have enough information to answer that question based on my knowledge base.",
      sources: [],
    };
  }

  // 3. Build context from chunks
  const context = relevantChunks
    .map((chunk, i) => `[Source ${i + 1}] ${chunk.content}`)
    .join('\n\n');

  // 4. Build messages for LLM
  const expert = await prisma.user.findUnique({ where: { id: expertId } });

  const messages = [
    {
      role: 'system',
      content: `You are ${expert.displayName}'s GiDi. Answer questions based ONLY on the provided sources. If the sources don't contain the answer, say so. Always cite your sources using [Source N] notation.`,
    },
    {
      role: 'user',
      content: `Context:\n${context}\n\nQuestion: ${question}`,
    },
  ];

  // 5. Get LLM response
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages,
    temperature: 0.7,
    max_tokens: 500,
  });

  const answer = completion.choices[0].message.content;

  // 6. Extract cited sources
  const citedSources = relevantChunks.map((chunk, i) => ({
    chunkId: chunk.id,
    sourceTitle: chunk.sourceTitle,
    excerpt: chunk.content.slice(0, 200),
    relevanceScore: chunk.similarity,
  }));

  return { answer, sources: citedSources };
}
```

### Example: Feed Generation
```typescript
// services/feedService.ts
export async function getPersonalizedFeed(
  userId: string,
  limit: number = 20,
  cursor?: string
) {
  // Get experts the user follows
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { expertId: true },
  });

  const expertIds = following.map(f => f.expertId);

  if (expertIds.length === 0) {
    return { insights: [], nextCursor: null };
  }

  // Get insights from followed experts (chronological for MVP)
  const insights = await prisma.insight.findMany({
    where: {
      authorId: { in: expertIds },
      published: true,
    },
    include: {
      author: {
        select: { id: true, displayName: true, avatarUrl: true },
      },
      reactions: {
        where: { userId },
      },
    },
    orderBy: { publishedAt: 'desc' },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
  });

  const hasMore = insights.length > limit;
  const items = hasMore ? insights.slice(0, -1) : insights;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return { insights: items, nextCursor };
}
```

---

**Last Updated:** 2025-12-11
**Version:** 1.0
**Status:** Draft for Review