# Evidence-Weighted, Disagreement-Aware Chest X-Ray Report Generator

An AI-powered system that generates evidence-grounded radiology reports from chest X-ray images, with intelligent handling of conflicting evidence.

> **What makes this unique:** Not all evidence is equal. Our system **weights evidence** by similarity × CNN confidence, **detects disagreement** among retrieved cases, and **prunes weak/conflicting evidence** before generating uncertainty-aware reports.

## 🏗️ Architecture

```
project/
├── frontend/                    # React + Vite + TypeScript + TailwindCSS
│   ├── src/
│   │   ├── components/layout/   # Layout, Sidebar, Topbar
│   │   ├── pages/               # Overview, Upload, Evidence, Disagreement, Reports, About
│   │   ├── services/api.ts      # Backend API integration
│   │   ├── context/             # Shared analysis state
│   │   └── types/               # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI server (/predict, /health)
│   │   ├── pipeline.py          # Full analysis pipeline
│   │   ├── model_loader.py      # DenseNet-121 CNN loader
│   │   ├── faiss_loader.py      # FAISS index + metadata loader
│   │   ├── report_generator.py  # Gemini report generation
│   │   └── transforms.py       # Image preprocessing
│   ├── model/                   # Place CNN model here (not in git)
│   ├── index/                   # Place FAISS index + metadata here (not in git)
│   ├── .env.example
│   └── requirements.txt
├── .gitignore
└── README.md
```

## 🔬 Pipeline

```
Uploaded Chest X-Ray
        │
        ▼
PIL + TorchVision Preprocessing
        │
        ▼
Fine-tuned DenseNet-121 CNN
  ├─ 7-label disease prediction
  └─ 1024-d normalized embedding
        │
        ▼
FAISS Similarity Retrieval (Top-K)
        │
        ▼
Evidence Weighting (similarity × confidence)
        │
        ▼
Keyword Voting + Disagreement Detection
        │
        ▼
Gemini 2.5 Flash Report Generation
        │
        ▼
Structured Report (FINDINGS + IMPRESSION)
```

## ✨ Features

| Page | Description |
|------|-------------|
| **📊 Overview** | Dashboard with real-time metrics and pipeline visualization |
| **📤 Upload & Analysis** | Drag-and-drop X-ray upload with live pipeline animation |
| **🔍 Evidence Explorer** | Browse retrieved cases with weights, similarity, and labels |
| **⚠️ Disagreement Resolution** | Interactive threshold pruning of conflicting evidence |
| **📝 Report Viewer** | Generated report with print/export functionality |
| **ℹ️ About** | Project information and team details |

## 🚀 Quick Start

### 1. Download Model & Index Files

Download the following files and place them in the specified directories:

| File | Download | Place in |
|------|----------|----------|
| CNN Model (`densenet121_mimic_finetuned.pt`) | [Google Drive](https://drive.google.com/file/d/1uLwLBXwsGsCCWVGSLNQ94wmmnBb989xo/view?usp=drivesdk) | `backend/model/` |
| FAISS Index + Metadata | [Google Drive](https://drive.google.com/file/d/1G_PDZY8FLj1jslYSTZJsqY6C19rqUwy5/view?usp=drivesdk) | `backend/index/` |

After downloading the index archive, extract it so that `faiss.index`, `metadata.json`, and `embeddings.npy` are directly inside `backend/index/`.

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Run the Application

**Terminal 1 — Backend:**
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

## 🔌 API Documentation

### `GET /health`
Health check endpoint.

**Response:**
```json
{ "status": "healthy", "message": "CXR Report Generator API is running" }
```

### `POST /predict`
Analyze a chest X-ray image.

**Request:** Multipart form data with `file` field (JPEG/PNG image).

**Response:**
```json
{
  "prediction": "Cardiomegaly",
  "confidence": 0.94,
  "report": "FINDINGS: ... IMPRESSION: ...",
  "disagreement": true,
  "keywords": ["cardiomegaly", "effusion"],
  "evidence": [
    {
      "rank": 1,
      "similarity": 0.92,
      "distance": 0.08,
      "weight": 1.0,
      "report_snippet": "Cardiac silhouette is enlarged...",
      "label": "Cardiomegaly",
      "disagreement_score": 0.1
    }
  ]
}
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, TailwindCSS v4, Framer Motion |
| Backend | Python 3.11, FastAPI, Uvicorn |
| ML Model | DenseNet-121 (TorchXRayVision), PyTorch |
| Retrieval | FAISS (cosine similarity) |
| Report Gen | Google Gemini 2.5 Flash API |

## 📋 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MODEL_PATH` | Path to CNN checkpoint | `model/densenet121_mimic_finetuned.pt` |
| `FAISS_INDEX_PATH` | Path to FAISS index | `index/faiss.index` |
| `RETRIEVAL_METADATA_JSON` | Path to metadata JSON | `index/metadata.json` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIzaSy...` |
| `TOP_K` | Number of cases to retrieve | `5` |
| `CNN_THRESHOLD` | Minimum confidence threshold | `0.2` |
| `LABELS` | Disease classification labels | `["Atelectasis", ...]` |

## 👥 Team

- **Kiran Krishna** — ML & Backend
- **Aryan Aligeti** — Frontend & UI
- **Renuka Manohari** — Research & Data

## 📄 License

This project is for educational and research purposes only.
Generated reports must not be used as a substitute for a qualified radiologist.

---

> *"Evidence is not equal. Confidence becomes weight. Disagreement is detected, not hidden."*
