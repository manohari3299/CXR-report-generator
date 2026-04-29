# =========================
# IMPORTS
# =========================
from collections import Counter
import torch
import numpy as np
from PIL import Image
from google import genai
from dotenv import load_dotenv
import os

from .model_loader import load_model
from .faiss_loader import load_faiss
from .transforms import transform
from .report_generator import generate_report

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# =========================
# CONSTANTS
# =========================
MODEL_PATH = os.getenv('MODEL_PATH')
FAISS_INDEX_PATH = os.getenv('FAISS_INDEX_PATH')
RETRIEVAL_METADATA_JSON = os.getenv('RETRIEVAL_METADATA_JSON')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
TOP_K = int(os.getenv('TOP_K', '5'))
CNN_THRESHOLD = float(os.getenv('CNN_THRESHOLD', '0.2'))
LABELS = eval(os.getenv('LABELS', '["Atelectasis","Cardiomegaly","Effusion","Pneumonia","Pneumothorax","Edema","No Finding"]'))

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# =========================
# RESOLVE PATHS (relative to backend/)
# =========================
BACKEND_DIR = os.path.dirname(os.path.dirname(__file__))

def _resolve(path: str) -> str:
    """Resolve a path relative to the backend/ directory."""
    if os.path.isabs(path):
        return path
    return os.path.join(BACKEND_DIR, path)

# =========================
# LOADING MODELS (one-time at startup)
# =========================
print(f"[Pipeline] Loading CNN model from {MODEL_PATH} ...")
model = load_model(_resolve(MODEL_PATH), device)
print("[Pipeline] CNN model loaded.")

print(f"[Pipeline] Loading FAISS index from {FAISS_INDEX_PATH} ...")
index, retrieval_metadata = load_faiss(_resolve(FAISS_INDEX_PATH), _resolve(RETRIEVAL_METADATA_JSON))
print(f"[Pipeline] FAISS index loaded ({index.ntotal} vectors).")

print("[Pipeline] Initializing Gemini client ...")
client = genai.Client(api_key=GEMINI_API_KEY)
print("[Pipeline] Gemini client ready.")

# Disease keywords used for voting
KEYWORDS = ["pneumonia", "effusion", "pneumothorax", "cardiomegaly", "atelectasis", "edema"]


# =========================
# PIPELINE
# =========================
def process_image(image: Image.Image) -> dict:
    """Run the full analysis pipeline on a chest X-ray image.

    Pipeline:
        image → CNN → embedding → FAISS search → retrieve metadata →
        keyword voting → disagreement check → Gemini report generation

    Args:
        image: PIL Image of a chest X-ray.

    Returns:
        dict with prediction, confidence, report, disagreement, keywords,
        and per-case evidence data.

    Raises:
        ValueError: If CNN confidence is below threshold.
    """
    # Preprocess and run CNN
    img = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        output = model(img)
        probs = torch.sigmoid(output)[0].cpu().numpy()
        emb = model.get_embedding(img).cpu().numpy().astype("float32")

    pred = LABELS[np.argmax(probs)]
    conf = float(np.max(probs))

    # Confidence check
    if conf < CNN_THRESHOLD:
        raise ValueError(f"Low CNN confidence ({conf:.2f}). Unable to generate reliable report.")

    # FAISS retrieval
    D, I = index.search(emb, TOP_K)
    distances = D[0]

    # Build evidence cases with full metadata
    reports = []
    evidence_cases = []

    for rank, (idx, dist) in enumerate(zip(I[0], distances)):
        if idx < len(retrieval_metadata):
            meta = retrieval_metadata[idx]
            report_text = meta.get("report", "")
            reports.append(report_text)

            # Compute weight: inverse distance (higher = more similar)
            weight = 1.0 / (dist + 1e-6)

            # Detect label from report content
            detected_label = "Unknown"
            report_lower = report_text.lower()
            for kw in KEYWORDS:
                if kw in report_lower:
                    detected_label = kw.capitalize()
                    break
            if detected_label == "Unknown" and ("normal" in report_lower or "no acute" in report_lower):
                detected_label = "Normal"

            # Snippet: first 150 chars of report
            snippet = report_text[:150].strip()
            if len(report_text) > 150:
                snippet += "..."

            evidence_cases.append({
                "rank": rank + 1,
                "similarity": round(float(1.0 - dist) if dist <= 1 else float(1.0 / (1.0 + dist)), 4),
                "distance": round(float(dist), 6),
                "weight": round(float(weight), 4),
                "report_snippet": snippet,
                "label": detected_label,
            })

    # Normalize weights to [0, 1] range
    if evidence_cases:
        max_weight = max(e["weight"] for e in evidence_cases)
        if max_weight > 0:
            for e in evidence_cases:
                e["weight"] = round(e["weight"] / max_weight, 4)

    # Keyword voting
    votes = []
    for r in reports:
        r_lower = r.lower()
        for k in KEYWORDS:
            if k in r_lower:
                votes.append(k)

    vote_counts = Counter(votes)
    common = vote_counts.most_common(2)

    # Disagreement detection
    disagreement = False
    if len(common) > 1 and common[0][1] - common[1][1] <= 1:
        disagreement = True

    # Compute per-case disagreement scores
    majority_label = common[0][0] if common else ""
    for e in evidence_cases:
        if e["label"].lower() == majority_label:
            e["disagreement_score"] = 0.1
        elif e["label"] == "Normal":
            e["disagreement_score"] = 0.3
        elif e["label"] == "Unknown":
            e["disagreement_score"] = 0.5
        else:
            e["disagreement_score"] = 0.7

    # Build pipeline data for report generation
    pipeline_data = {
        "prediction": pred,
        "confidence": conf,
        "reports": reports,
        "disagreement": disagreement,
        "keywords": [c[0] for c in common],
    }

    # Generate report via Gemini
    report = generate_report(client, pipeline_data)

    return {
        "prediction": pred,
        "confidence": round(conf, 4),
        "report": report,
        "disagreement": disagreement,
        "keywords": [c[0] for c in common],
        "evidence": evidence_cases,
    }
