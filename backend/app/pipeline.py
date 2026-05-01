# =========================
# IMPORTS
# =========================
from collections import Counter
import torch
import torch.nn.functional as F
import numpy as np
from PIL import Image
from google import genai
from dotenv import load_dotenv
import os

from .model_loader import load_model
from .faiss_loader import load_faiss
from .transforms import transform, apply_tta
from .report_generator import generate_report

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# =========================
# CONSTANTS
# =========================
MODEL_PATH = os.getenv('MODEL_PATH')
FAISS_INDEX_PATH = os.getenv('FAISS_INDEX_PATH')
RETRIEVAL_METADATA_JSON = os.getenv('RETRIEVAL_METADATA_JSON')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_API_KEY_2 = os.getenv('GEMINI_API_KEY_2')
TOP_K = int(os.getenv('TOP_K', '5'))
CNN_THRESHOLD = float(os.getenv('CNN_THRESHOLD', '0.2'))
LABELS = eval(os.getenv('LABELS', '["Atelectasis","Cardiomegaly","Effusion","Pneumonia","Pneumothorax","Edema","No Finding"]'))

# New confidence-improvement parameters
TEMPERATURE = float(os.getenv('TEMPERATURE', '0.3'))
TTA_ENABLED = os.getenv('TTA_ENABLED', 'true').lower() == 'true'
CNN_WEIGHT = float(os.getenv('CNN_WEIGHT', '0.85'))
EVIDENCE_WEIGHT = float(os.getenv('EVIDENCE_WEIGHT', '0.15'))
SECONDARY_THRESHOLD = float(os.getenv('SECONDARY_THRESHOLD', '0.3'))
FAISS_SIMILARITY_THRESHOLD = float(os.getenv('FAISS_SIMILARITY_THRESHOLD', '0.55'))
ENTROPY_THRESHOLD = float(os.getenv('ENTROPY_THRESHOLD', '1.8'))

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

print("[Pipeline] Initializing Gemini clients ...")
clients = []
if GEMINI_API_KEY:
    clients.append(genai.Client(api_key=GEMINI_API_KEY))
if GEMINI_API_KEY_2:
    clients.append(genai.Client(api_key=GEMINI_API_KEY_2))
print(f"[Pipeline] {len(clients)} Gemini client(s) ready.")

print(f"[Pipeline] Config — Temperature: {TEMPERATURE}, TTA: {TTA_ENABLED}, "
      f"CNN Weight: {CNN_WEIGHT}, Evidence Weight: {EVIDENCE_WEIGHT}")

# Disease keywords used for voting
KEYWORDS = ["pneumonia", "effusion", "pneumothorax", "cardiomegaly", "atelectasis", "edema"]

KEYWORD_SYNONYMS = {
    "pneumonia": ["pneumonia", "consolidation", "infiltrate", "airspace opacity", "airspace disease"],
    "effusion": ["effusion", "pleural fluid", "layering fluid", "meniscus sign"],
    "pneumothorax": ["pneumothorax", "collapsed lung", "lung collapse"],
    "cardiomegaly": ["cardiomegaly", "enlarged heart", "cardiac enlargement", "heart is enlarged",
                     "cardiac silhouette is enlarged", "heart size is enlarged", "enlarged cardiac silhouette"],
    "atelectasis": ["atelectasis", "volume loss", "linear opacity", "subsegmental"],
    "edema": ["edema", "pulmonary congestion", "vascular congestion", "cephalization",
              "interstitial thickening", "kerley"],
}

NEGATION_PATTERNS = [
    'no ', 'without ', 'not ', 'no evidence of ', 'absence of ',
    'negative for ', 'unremarkable', 'resolved', 'has cleared',
    'have cleared', 'has resolved', 'have resolved', 'improving',
    'no definite ', 'no acute ', 'no significant ',
]

def is_keyword_present(keyword: str, text: str) -> bool:
    """Check if a keyword (or any of its synonyms) is present and NOT negated."""
    synonyms = KEYWORD_SYNONYMS.get(keyword, [keyword])
    for term in synonyms:
        if term not in text:
            continue
        parts = text.split(term)
        for i in range(len(parts) - 1):
            before = parts[i][-60:]
            if any(neg in before for neg in NEGATION_PATTERNS):
                continue
            after = text[text.index(term) + len(term):text.index(term) + len(term) + 30]
            if any(neg in after for neg in [' resolved', ' cleared', ' has improved', ' improving']):
                continue
            return True
    return False


# =========================
# PIPELINE
# =========================
def process_image(image: Image.Image) -> dict:
    """Run the full analysis pipeline on a chest X-ray image.

    Pipeline:
        image → TTA (5 augmented views) → CNN → averaged logits →
        temperature scaling → softmax (prediction) + sigmoid (multi-label) →
        embedding → FAISS search → retrieve metadata →
        keyword voting → disagreement check →
        CNN + evidence fusion → Gemini report generation

    Args:
        image: PIL Image of a chest X-ray.

    Returns:
        dict with prediction, confidence, report, disagreement, keywords,
        secondary_findings, and per-case evidence data.

    Raises:
        ValueError: If CNN confidence is below threshold.
    """
    # ---------------------------------------------------
    # Step 1: CNN Inference (with optional TTA)
    # ---------------------------------------------------
    if TTA_ENABLED:
        print("[Pipeline] Running TTA with 5 augmented views...")
        avg_logits, emb = apply_tta(model, image, device)
    else:
        img = transform(image).unsqueeze(0).to(device)
        with torch.no_grad():
            avg_logits = model(img)
            emb = model.get_embedding(img).cpu().numpy().astype("float32")

    # ---------------------------------------------------
    # Step 2: Temperature Scaling
    # ---------------------------------------------------
    scaled_logits = avg_logits / TEMPERATURE

    # ---------------------------------------------------
    # Step 3: Softmax for prediction selection (competitive)
    # ---------------------------------------------------
    softmax_probs = F.softmax(scaled_logits, dim=1)[0].cpu().numpy()

    # Sigmoid for multi-label detection (independent per-label)
    sigmoid_probs = torch.sigmoid(scaled_logits)[0].cpu().numpy()

    # Primary prediction = argmax of softmax (competitive selection)
    pred_idx = np.argmax(softmax_probs)
    pred = LABELS[pred_idx]
    cnn_confidence = float(softmax_probs[pred_idx])

    print(f"[Pipeline] CNN prediction: {pred} (softmax: {cnn_confidence:.4f})")
    print(f"[Pipeline] Sigmoid probs: {dict(zip(LABELS, [f'{p:.3f}' for p in sigmoid_probs]))}")

    # ---------------------------------------------------
    # Step 4: Secondary findings (multi-label, sigmoid > threshold)
    # ---------------------------------------------------
    secondary_findings = []
    for i, label in enumerate(LABELS):
        if i != pred_idx and sigmoid_probs[i] >= SECONDARY_THRESHOLD:
            secondary_findings.append({
                "label": label,
                "probability": round(float(sigmoid_probs[i]), 4),
            })
    # Sort by probability descending
    secondary_findings.sort(key=lambda x: x["probability"], reverse=True)

    # Confidence check (using raw sigmoid max for threshold comparison)
    raw_sigmoid = torch.sigmoid(avg_logits)[0].cpu().numpy()
    raw_max_conf = float(np.max(raw_sigmoid))
    if raw_max_conf < CNN_THRESHOLD:
        raise ValueError(f"Low CNN confidence ({raw_max_conf:.2f}). Unable to generate reliable report.")

    # ---------------------------------------------------
    # Step 5: FAISS retrieval
    # ---------------------------------------------------
    D, I = index.search(emb, TOP_K)
    distances = D[0]

    # ---------------------------------------------------
    # Step 5b: Image validation — reject non-chest-X-ray images
    # ---------------------------------------------------
    avg_similarity = float(np.mean(distances))
    entropy = -float(np.sum(softmax_probs * np.log(softmax_probs + 1e-9)))
    print(f"[Pipeline] Validation — avg FAISS similarity: {avg_similarity:.4f}, softmax entropy: {entropy:.4f}")

    if avg_similarity < FAISS_SIMILARITY_THRESHOLD:
        raise ValueError(
            "The uploaded image does not appear to be a chest X-ray. "
            f"Similarity to known X-rays is too low ({avg_similarity:.2f})."
        )
    if entropy > ENTROPY_THRESHOLD:
        raise ValueError(
            "The uploaded image does not appear to be a chest X-ray. "
            "The model could not identify any clear pathology pattern."
        )

    # Build evidence cases with full metadata
    reports = []
    evidence_cases = []

    for rank, (idx, dist) in enumerate(zip(I[0], distances)):
        if idx < len(retrieval_metadata):
            meta = retrieval_metadata[idx]
            report_text = meta.get("report", "")
            reports.append(report_text)

            # Since FAISS index is IndexFlatIP (Inner Product), dist is already cosine similarity (higher is better).
            # Clip between 0 and 1 for safety.
            sim = min(max(float(dist), 0.0), 1.0)
            weight = sim

            # Detect label from report content — find all mentioned keywords,
            # count synonym matches per disease, pick the one with most evidence
            report_lower = report_text.lower()
            found_keywords = {}
            for kw in KEYWORDS:
                synonyms = KEYWORD_SYNONYMS.get(kw, [kw])
                total_count = 0
                earliest_pos = len(report_lower)
                for syn in synonyms:
                    if syn in report_lower and is_keyword_present(kw, report_lower):
                        total_count += report_lower.count(syn)
                        earliest_pos = min(earliest_pos, report_lower.index(syn))
                if total_count > 0:
                    found_keywords[kw] = (total_count, -earliest_pos)

            if found_keywords:
                detected_label = max(found_keywords, key=lambda k: found_keywords[k]).capitalize()
            elif any(p in report_lower for p in [
                "normal", "no acute", "unremarkable", "clear lungs",
                "lungs are clear", "no active disease", "within normal limits",
                "no cardiopulmonary", "no radiographic abnormality",
            ]):
                detected_label = "Normal"
            else:
                detected_label = "Unknown"

            # Tag alignment relative to CNN prediction
            pred_lower = pred.lower()
            if detected_label.lower() == pred_lower:
                alignment = "supports"
            elif detected_label in ("Normal", "Unknown"):
                alignment = "neutral"
            else:
                alignment = "conflicts"

            # Snippet: first 150 chars of report
            snippet = report_text[:150].strip()
            if len(report_text) > 150:
                snippet += "..."

            evidence_cases.append({
                "rank": rank + 1,
                "similarity": round(sim, 4),
                "distance": round(float(dist), 6),
                "weight": round(float(weight), 4),
                "report_snippet": snippet,
                "label": detected_label,
                "alignment": alignment,
            })

    # Normalize weights to [0, 1] range
    if evidence_cases:
        max_weight = max(e["weight"] for e in evidence_cases)
        if max_weight > 0:
            for e in evidence_cases:
                e["weight"] = round(e["weight"] / max_weight, 4)

    # ---------------------------------------------------
    # Step 6: Keyword voting & disagreement detection
    # ---------------------------------------------------
    votes = []
    for r in reports:
        r_lower = r.lower()
        for k in KEYWORDS:
            if is_keyword_present(k, r_lower):
                votes.append(k)

    vote_counts = Counter(votes)
    common = vote_counts.most_common(2)

    # Disagreement detection
    disagreement = False
    if len(common) > 1 and common[0][1] - common[1][1] <= 1:
        disagreement = True

    # Compute per-case disagreement scores anchored to CNN prediction
    for e in evidence_cases:
        if e["alignment"] == "supports":
            e["disagreement_score"] = 0.1
        elif e["alignment"] == "neutral":
            e["disagreement_score"] = 0.3
        else:
            e["disagreement_score"] = 0.7

    # ---------------------------------------------------
    # Step 7: CNN + Evidence Fusion (similarity-weighted)
    # ---------------------------------------------------
    # Use FAISS distances directly as evidence agreement signal.
    # Close neighbors (low distance) = high agreement because the
    # embedding space was trained to cluster similar conditions.
    if evidence_cases:
        # Convert distances to similarity scores in [0, 1]
        similarities = []
        for e in evidence_cases:
            d = e["distance"]
            # Since distance is already inner product (similarity), use it directly
            sim = min(max(float(d), 0.0), 1.0)
            similarities.append(sim)
        # Weighted average: closer neighbors count more
        total_sim = sum(similarities)
        if total_sim > 0:
            evidence_agreement = total_sim / len(similarities)
        else:
            evidence_agreement = 0.0
    else:
        evidence_agreement = 0.0

    # Also factor in keyword-based agreement as a secondary signal
    pred_lower = pred.lower()
    keyword_matches = sum(
        1 for e in evidence_cases if e["label"].lower() == pred_lower
    )
    keyword_agreement = keyword_matches / max(len(evidence_cases), 1)

    # Blend: 70% similarity-based + 30% keyword-based
    blended_agreement = 0.7 * evidence_agreement + 0.3 * keyword_agreement

    # Fused confidence = weighted combination
    fused_confidence = (CNN_WEIGHT * cnn_confidence) + (EVIDENCE_WEIGHT * blended_agreement)

    # Clamp to [0, 1]
    fused_confidence = min(max(fused_confidence, 0.0), 1.0)

    print(f"[Pipeline] Evidence similarity: {evidence_agreement:.2f}, "
          f"keyword match: {keyword_matches}/{len(evidence_cases)}, "
          f"blended agreement: {blended_agreement:.2f}")
    print(f"[Pipeline] Fused confidence: {fused_confidence:.4f} "
          f"(CNN: {cnn_confidence:.4f} x {CNN_WEIGHT} + Evidence: {blended_agreement:.2f} x {EVIDENCE_WEIGHT})")

    # ---------------------------------------------------
    # Step 8: Build pipeline data & generate report
    # ---------------------------------------------------
    pipeline_data = {
        "prediction": pred,
        "confidence": fused_confidence,
        "reports": reports,
        "disagreement": disagreement,
        "keywords": [c[0] for c in common],
        "secondary_findings": secondary_findings,
    }

    # Generate report via Gemini
    report = generate_report(clients, pipeline_data)

    return {
        "prediction": pred,
        "confidence": round(fused_confidence, 4),
        "report": report,
        "disagreement": disagreement,
        "keywords": [c[0] for c in common],
        "evidence": evidence_cases,
        "secondary_findings": secondary_findings,
    }
