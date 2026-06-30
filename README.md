# 🎙️ SAMVAD V2.0 — Secure Offline AI Meeting Assistant

**SAMVAD V2.0** is a secure, production-quality, offline-first meeting assistant. It records meeting audio, transcribes speech with word-level timestamps, generates structured summaries (minutes of the meeting, task checkmarks, decisions), and provides a local Retrieval-Augmented Generation (RAG) assistant for querying discussions—all running locally on consumer hardware without sending data to the cloud.

---

## ✨ Features

- **🔴 Dual-Channel Audio Capture**:
  - **Browser Recording**: Capture microphone streams directly in the React frontend using the Web Audio API (MediaRecorder) and upload seamlessly. Works out-of-the-box inside Docker containers.
  - **Host Recording**: Reuses native sounddevice capture systems when running directly on the host machine.
- **📝 Speech-to-Text**: Offline transcription via `Faster-Whisper` with Voice Activity Detection (`Silero VAD`), GPU acceleration, CPU fallback, and word-level timestamps.
- **📄 Meeting Intelligence**: Automatic minutes generation (Executive Summary, Action Items checklists, Decisions logs, Key Highlights, Keywords) via local `distilbart` pipelines or custom Ollama endpoints.
- **🔮 Local RAG Q&A**: Question answering based on meeting transcripts using local extractive models (`distilbert-base-squad`) or local Ollama LLMs.
- **📊 Rich Analytics**: Dynamic data charts for speaking densities, duration trends, keywords, and model metrics built with `Recharts`.
- **📥 Clean Exports**: Export transcripts and summary memos to TXT, Markdown, CSV, and SRT.

---

## 🏗️ Architecture

```text
       ┌─────────────────────────────────────────────────────────┐
       │                    REACT SPA FRONTEND                   │
       │  (Vite + TypeScript + Tailwind CSS + Recharts + Framer) │
       └────────────────────────────┬────────────────────────────┘
                                    │ (REST API / static files)
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │                   FASTAPI API SERVER                    │
       │                   (Python 3.11+ ASGI)                   │
       └──────┬──────────────────────┬────────────────────┬──────┘
              │                      │                    │
              ▼                      ▼                    ▼
     ┌─────────────────┐    ┌─────────────────┐  ┌─────────────────┐
     │  SQLALCHMEY ORM │    │ FASTER-WHISPER  │  │ LOCAL NLP CACHE │
     │  (SQLite DB)    │    │ (STT / VAD)     │  │ (LLM / RAG / QA)│
     └─────────────────┘    └─────────────────┘  └─────────────────┘
```

---

## 🚀 Running Locally with Docker Compose

Ensure [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) are installed on your host system.

1. **Clone & Navigate** to the folder:
   ```bash
   cd C:\Users\priya\.gemini\antigravity\scratch\SAMVADv2
   ```

2. **Boot the Application**:
   ```bash
   docker compose up --build
   ```

3. **Open the Dashboard**:
   - Access the React Frontend at: `http://localhost:3000`
   - Access the FastAPI backend documentation at: `http://localhost:8000/docs`

---

## 🛠️ Folder Structure

```text
SAMVADv2/
├── backend/
│   ├── src/
│   │   ├── api/          # FastAPI routers (meetings, qa, analytics, settings)
│   │   ├── models/       # Pydantic Schemas
│   │   ├── services/     # Audio, database (db.py), export, STT, LLM services
│   │   ├── utils/        # Logger and configs
│   │   └── app.py        # FastAPI entrypoint
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # UI panels (Sidebar)
│   │   ├── pages/        # Dashboard, Recorder, Transcript, Summary, QA, History, Settings
│   │   ├── services/     # api.ts connection client
│   │   ├── types/        # TypeScript interfaces
│   │   ├── App.tsx       # Root coordinator
│   │   └── index.css     # Tailwind styling & animations
│   ├── index.html
│   └── package.json
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
└── README.md
```

---

## 🔒 Security & Privacy

All computations are processed strictly local. No audio recordings, transcript contents, summary items, or QA histories leave your machine. No telemetry data or cloud connections are active post-installation.
