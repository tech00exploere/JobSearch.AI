# KrishiLM 🌾

> A domain-specific AI assistant for Indian agriculture — built from scratch with a custom PyTorch Transformer.

[![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green?logo=fastapi)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.x-red?logo=pytorch)](https://pytorch.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 🎯 Goal

KrishiLM is a **learning-focused ML/DL project**. The goal is to:

1. Build a full-stack scaffold with a clean, modular architecture
2. Implement a custom PyTorch Transformer from scratch
3. Train it on Indian agricultural text data
4. Deploy it as a domain-specific assistant for farmers and researchers

> **Note:** This repo currently contains the **project scaffold only**. The PyTorch model is a placeholder. No model has been trained or downloaded.

---

## 📁 Project Structure

```
krishilm/
├── frontend/               # Next.js 14 + TypeScript + Tailwind + shadcn/ui
│   ├── app/
│   │   ├── page.tsx        # Landing page
│   │   ├── chat/           # Chat interface (mock response for now)
│   │   ├── lab/            # AI Lab — model status
│   │   └── about/          # About page
│   ├── components/         # Shared UI components
│   └── lib/api.ts          # Typed API client
│
├── backend/                # Python FastAPI
│   ├── app/
│   │   ├── main.py         # App entry point + CORS
│   │   ├── routes/         # chat.py, health.py, model.py
│   │   ├── services/       # ml_service.py (bridges backend ↔ ML)
│   │   └── models/         # Pydantic schemas
│   └── requirements.txt
│
├── ml/                     # PyTorch ML pipeline (stubs)
│   ├── tokenizer/          # KrishiTokenizer (TODO: BPE/WordPiece)
│   ├── model/              # KrishiLMModel — Transformer architecture (TODO)
│   ├── data/               # AgricultureDataset (TODO: data loading)
│   ├── training/           # Trainer (TODO: training loop)
│   ├── evaluation/         # Evaluator (TODO: metrics)
│   └── inference/          # KrishiInference — mock now, real later
│
├── docker-compose.yml
├── README.md
└── .gitignore
```

---

## 🏗️ Architecture

```
Browser (Next.js UI)
        │
        │  HTTP REST  (POST /api/chat, GET /api/model/status)
        ▼
FastAPI Backend  (backend/app/main.py)
        │
        │  Python call
        ▼
ML Service Layer  (backend/app/services/ml_service.py)
        │
        │  calls
        ▼
KrishiInference  (ml/inference/inference.py)
        │
        │  model.generate()  ← you will implement this
        ▼
KrishiLMModel  (ml/model/transformer.py)  ← your PyTorch Transformer
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker + Docker Compose (optional)

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend runs at: http://localhost:8000
API docs at: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:3000

### 3. Docker (both together)

```bash
docker-compose up --build
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Backend liveness check |
| GET | `/api/model/status` | KrishiLM model metadata |
| POST | `/api/chat` | Send message, get response |

### Example: POST /api/chat

```json
// Request
{ "message": "What is the best fertilizer for wheat?" }

// Response
{
  "response": "This is a placeholder response. KrishiLM will answer this after training.",
  "model": "KrishiLM",
  "status": "mock"
}
```

---

## 🧠 ML Roadmap

The `ml/` folder contains skeleton classes with clear `TODO` comments. Here's what needs to be implemented:

| Step | File | Status |
|------|------|--------|
| 1. Tokenizer | `ml/tokenizer/tokenizer.py` | 🔲 Placeholder |
| 2. Dataset | `ml/data/dataset.py` | 🔲 Placeholder |
| 3. Embeddings + Positional Encoding | `ml/model/transformer.py` | 🔲 Placeholder |
| 4. Multi-Head Self-Attention | `ml/model/transformer.py` | 🔲 Placeholder |
| 5. Feed-Forward Network | `ml/model/transformer.py` | 🔲 Placeholder |
| 6. Transformer Blocks | `ml/model/transformer.py` | 🔲 Placeholder |
| 7. Language Model Head | `ml/model/transformer.py` | 🔲 Placeholder |
| 8. Training Loop | `ml/training/trainer.py` | 🔲 Placeholder |
| 9. Loss Calculation | `ml/training/trainer.py` | 🔲 Placeholder |
| 10. Text Generation | `ml/inference/inference.py` | 🔲 Placeholder |

---

## 🔄 How to Plug In Your Real Model

Once you implement the PyTorch model, only **one file changes** in the backend:

**`backend/app/services/ml_service.py`** — swap `mock_response()` with your real `KrishiInference.generate()` call.

The frontend requires **zero changes**.

---

## 📊 Frontend Pages

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Hero + feature overview |
| Chat | `/chat` | AI chat interface |
| AI Lab | `/lab` | Model status & architecture |
| About | `/about` | Project info & tech stack |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Python 3.11, FastAPI, Uvicorn, Pydantic |
| ML/DL | PyTorch 2.x, NumPy (custom Transformer — no pretrained models) |
| Database | PostgreSQL (minimal, future use) |
| Container | Docker, Docker Compose |

---

## 📜 License

MIT — see [LICENSE](LICENSE)

---

*Built with ❤️ for Indian agriculture*
