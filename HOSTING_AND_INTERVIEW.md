# DocChat — Hosting & Interview Guide

---

## PART 4 — Hosting for Free (Live Demo Link)

### Strategy Overview

| Component | Free Tier | Notes |
|---|---|---|
| Frontend | **Vercel** | Static React build, zero config |
| Backend | **Render.com** | Free tier: 512MB RAM, sleeps after 15min |
| LLM | **Groq API** | Free tier: 14,400 req/day, no credit card |
| Vector Store | ChromaDB in-memory | Render's free disk is ephemeral — see note |

> **Important:** Render's free tier has ephemeral storage (resets on redeploy). For a portfolio demo, this is fine — use demo mode with pre-embedded documents loaded at startup. For persistence, use Render's $7/month plan with a disk, or Railway.

---

### Step 1: Get a Free Groq API Key

1. Go to **https://console.groq.com**
2. Sign up (no credit card needed)
3. Click **API Keys → Create API Key**
4. Copy your key: `gsk_xxxxxxxxxxxx`

---

### Step 2: Deploy Backend to Render.com

#### Option A: Deploy via GitHub (recommended)

1. Push your code to GitHub (see repo setup below)

2. Go to **https://render.com** → Sign up with GitHub

3. Click **New → Web Service**

4. Connect your GitHub repo → select `docchat-rag`

5. Configure:
   ```
   Name:           docchat-backend
   Branch:         main
   Root Directory: backend
   Runtime:        Docker
   Dockerfile:     ./Dockerfile
   Instance Type:  Free
   ```

6. Add **Environment Variables**:
   ```
   USE_GROQ=true
   GROQ_API_KEY=gsk_your_key_here
   GROQ_MODEL=llama3-8b-8192
   EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
   CHROMA_PERSIST_DIR=/tmp/chroma
   UPLOAD_DIR=/tmp/uploads
   DEMO_MODE=true
   CHUNK_SIZE=800
   CHUNK_OVERLAP=150
   RETRIEVAL_K=4
   FRONTEND_URL=https://YOUR-APP.vercel.app
   ```

7. Click **Create Web Service**

8. Wait for deploy (~5-8 min on free tier). Note your URL: `https://docchat-backend.onrender.com`

#### Option B: Railway (better free tier, no sleep)

1. Go to **https://railway.app** → Sign up with GitHub
2. New Project → Deploy from GitHub repo
3. Select `backend` folder as root
4. Railway auto-detects Docker
5. Add same env vars as above
6. Click Deploy
7. Go to Settings → Domains → Generate Domain

---

### Step 3: Deploy Frontend to Vercel

1. Go to **https://vercel.com** → Sign up with GitHub

2. Click **New Project** → Import your GitHub repo

3. Configure:
   ```
   Framework Preset: Vite
   Root Directory:   frontend
   Build Command:    npm run build
   Output Directory: dist
   ```

4. Add **Environment Variables**:
   ```
   VITE_API_URL=https://docchat-backend.onrender.com
   ```
   *(Use your actual Render URL)*

5. Click **Deploy**

6. Your app is live at: `https://docchat-xyz.vercel.app` 🎉

---

### Step 4: Update CORS on Backend

After getting your Vercel URL, update Render env vars:
```
FRONTEND_URL=https://your-actual-app.vercel.app
```

Trigger a redeploy on Render.

---

### Step 5: Prepare Demo PDFs for Production

Since Render free tier has ephemeral storage, pre-embed docs at startup:

```bash
# Add demo PDFs to your repo (small ones only <5MB)
cp your_demo.pdf backend/demo_pdfs/

# Ensure demo mode is on in Render env vars:
DEMO_MODE=true
```

The app will auto-embed these on each cold start (takes ~30 seconds).

---

### All Environment Variables Reference

#### Backend (Render/Railway)
```bash
# Required
USE_GROQ=true
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
GROQ_MODEL=llama3-8b-8192

# Paths (use /tmp for ephemeral Render free tier)
CHROMA_PERSIST_DIR=/tmp/chroma
UPLOAD_DIR=/tmp/uploads

# Embeddings
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# Demo
DEMO_MODE=true
DEMO_PDF_DIR=/app/demo_pdfs

# CORS - must match your Vercel URL exactly
FRONTEND_URL=https://your-app.vercel.app

# Chunking
CHUNK_SIZE=800
CHUNK_OVERLAP=150
RETRIEVAL_K=4
```

#### Frontend (Vercel)
```bash
VITE_API_URL=https://your-backend.onrender.com
```

---

### Free Tier Limitations & Workarounds

| Issue | Cause | Workaround |
|---|---|---|
| Backend sleeps after 15min | Render free tier | Add "UptimeRobot" free pinger to keep alive |
| ~30s cold start | Docker container spins up | Add loading screen, mention in demo |
| 512MB RAM | Render free | MiniLM is small (90MB). Avoid large embedding models |
| Ephemeral disk | Render free | Use demo mode + in-memory Chroma |

**Keep backend alive (free):**
1. Go to https://uptimerobot.com → Free account
2. New Monitor → HTTP → `https://your-backend.onrender.com/health`
3. Interval: every 5 minutes

---

---

## PART 5 — Interview Talking Points

### 5 Interview Questions + Strong Answers

---

#### Q1: "Walk me through how RAG works in your project."

**Strong answer:**

"RAG has two phases: ingestion and inference.

During **ingestion**, I use PyMuPDF to parse the PDF, then LangChain's `RecursiveCharacterTextSplitter` to split the text into 800-token chunks with 150-token overlap. The overlap is important — without it you can split sentences across chunk boundaries and lose semantic meaning. Each chunk is embedded using `sentence-transformers/all-MiniLM-L6-v2`, which produces 384-dimension vectors. These go into ChromaDB with metadata like filename and page number.

At **query time**, the user's question is embedded with the same model, and ChromaDB does cosine similarity search to find the top-4 most relevant chunks. Those chunks get injected into Mistral's prompt as context. The LLM is instructed to only answer from that context — which grounds the response in the actual document and prevents hallucination.

The key insight is that the retrieval step happens in embedding space, not keyword space. 'How does attention work?' will correctly surface chunks about 'the self-attention mechanism' even without exact keyword overlap."

---

#### Q2: "Why ChromaDB over Pinecone or Weaviate?"

**Strong answer:**

"Three reasons: it runs locally, it's embedded (no separate server process), and it persists to disk with zero config.

For this project the constraint was full local operation. Pinecone is fully managed cloud — great for production, but means your documents leave your machine. ChromaDB runs in-process and persists to a local directory.

Technically, ChromaDB uses HNSW (Hierarchical Navigable Small World) graphs for approximate nearest neighbor search, which gives O(log n) query time — fast enough for the document scale this targets.

If the use case scaled to millions of documents, I'd look at Weaviate or Qdrant for their multi-tenancy and filtering capabilities. ChromaDB's `filter` parameter on `similarity_search` handles per-document isolation fine at this scale, though — I use it to scope queries to a single uploaded document when the user selects one."

---

#### Q3: "How did you handle streaming? Why SSE over WebSockets?"

**Strong answer:**

"I used Server-Sent Events over WebSockets for a few reasons. SSE is unidirectional — server to client — which is exactly what we need for token streaming. WebSockets are bidirectional and require a persistent connection, which adds complexity without benefit here.

On the backend, the FastAPI endpoint returns a `StreamingResponse` with `text/event-stream` MIME type. LangChain's `ChatOllama` supports `astream()` which yields tokens asynchronously as Mistral produces them. Each token gets serialized as `data: {"token": "...", "done": false}\n\n` and flushed immediately.

On the frontend, I use the native `fetch` API with a `ReadableStream` reader — not EventSource, because EventSource doesn't support POST requests. I buffer partial lines, parse `data:` prefixes, and append each token to the message state. The cursor blink is just a CSS animation on a conditionally rendered span.

One gotcha: nginx needs `proxy_buffering off` for SSE to work — otherwise nginx buffers the entire response before forwarding it to the browser. That's in my nginx.conf."

---

#### Q4: "What are the failure modes of this RAG system? How would you improve retrieval quality?"

**Strong answer:**

"The main failure modes are:

**Retrieval failures** — the right chunk exists but isn't in the top-4. This happens when the query phrasing doesn't match the document's phrasing semantically. Mitigation: use HyDE (Hypothetical Document Embeddings) — generate a hypothetical answer first, embed that, then search with it.

**Chunk boundary issues** — an answer is split across two chunks and neither alone contains enough context. Mitigation: increase overlap, or use a 'parent document retriever' pattern where you store small chunks for retrieval but return larger parent chunks for context.

**Context window overflow** — if retrieved chunks are too large relative to the LLM's context window. Mitigation: tune chunk size, use re-ranking to select the top-2 most relevant chunks from the top-10 retrieved.

**To improve retrieval quality** I'd add: (1) a re-ranker using `cross-encoder/ms-marco-MiniLM-L-6-v2` to score retrieved chunks against the query, (2) hybrid search combining BM25 keyword search with semantic search, and (3) query decomposition for multi-part questions."

---

#### Q5: "Why Mistral 7B? How would this scale to a production system?"

**Strong answer:**

"Mistral 7B hits a sweet spot for local deployment — it runs on a MacBook Pro with 16GB RAM, produces high-quality technical responses, and has an 8K context window that's large enough for 4 × 800-token chunks plus chat history.

For **production scaling**, I'd make several changes:

*Inference:* Move from Ollama to vLLM or TGI (Text Generation Inference) which support continuous batching and tensor parallelism. A 70B model on an A100 would dramatically improve answer quality for complex technical documents.

*Embeddings:* Swap MiniLM for `text-embedding-3-large` (OpenAI) or `bge-large-en-v1.5` for better retrieval quality, at the cost of needing a GPU or API.

*Vector store:* Move to Qdrant or Weaviate for better filtering, multi-tenancy, and horizontal scaling. Add a metadata store (PostgreSQL) for document management separate from the vector store.

*Infrastructure:* Add a job queue (Celery + Redis) for async PDF processing, since embedding large PDFs can take 30+ seconds. Use S3 for PDF storage. Add auth (JWT/OAuth) for multi-user isolation.

The current architecture is clean enough to evolve — the `get_llm()` factory pattern means swapping the LLM is one env var change, and the vector store abstraction means ChromaDB can be replaced without touching the RAG service."

---

### RAG Pipeline in Simple Terms (for non-technical interviewers)

> "Imagine you have a technical manual, and I need to answer questions about it. I could read the entire 500-page manual every time someone asks a question — that's too slow. Instead, I first split the manual into sticky note-sized pieces and organize them in a filing cabinet by topic. When someone asks a question, I find the 4 most relevant sticky notes and hand them to a writing assistant (the LLM) along with the question. The assistant writes an answer using only those sticky notes — not from memory, not from the internet. That's RAG: Retrieve the relevant pieces, then Generate an answer from them."

---

### What Makes This Project Stand Out

Most RAG demos are:
- Jupyter notebooks, not deployed apps
- Using only OpenAI (no local/privacy story)
- No streaming UI
- No source attribution
- Single document, no document management

This project has:
- **Full-stack deployment** with Docker Compose — one command, runs on any machine
- **100% local inference** — genuine privacy-first architecture
- **Real streaming UI** — SSE implementation with stop button
- **Source attribution** — shows exactly which document chunks backed each answer
- **Multi-document management** — upload, select, delete PDFs
- **Production architecture patterns** — service layer, config management, health checks
- **Two deployment targets** — local (Ollama) and cloud (Groq) with one env var toggle
- **Live demo** — shareable URL, not just a GitHub repo

---

## Repo Name & Description for GitHub

**Recommended repo name:** `docchat-rag`

**GitHub description:**
> Local RAG chatbot for technical PDFs. FastAPI + LangChain + ChromaDB + Mistral (Ollama) + React. One-command Docker Compose setup. Full streaming UI with source citations.

**Topics to add on GitHub:**
`rag`, `langchain`, `chromadb`, `ollama`, `mistral`, `fastapi`, `react`, `docker`, `llm`, `vector-database`, `pdf`, `chatbot`, `local-llm`, `generative-ai`

---

## LinkedIn Featured Section — Project Description

> **DocChat — Local RAG Chatbot**
>
> Built a production-grade Retrieval-Augmented Generation (RAG) system that lets you chat with technical PDFs using a fully local LLM stack — no API keys, no data leaving your machine.
>
> **Tech:** Python · FastAPI · LangChain · ChromaDB · HuggingFace sentence-transformers · Ollama (Mistral 7B) · React · TypeScript · Docker Compose
>
> **Highlights:**
> → Full RAG pipeline: PDF parsing → chunking → embedding → semantic retrieval → streaming generation
> → Real-time token streaming via SSE with stop/resume
> → Source attribution — every answer shows which document chunks were used
> → Groq cloud fallback for hosted deployment
> → One-command Docker Compose setup
>
> [GitHub link] | [Live Demo link]
