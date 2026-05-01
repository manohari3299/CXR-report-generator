"""
CXR Report Generator — FastAPI Server

Endpoints:
    GET  /health    → Server health check
    POST /predict   → Upload X-ray image → Get prediction, report, evidence
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import asyncio
import io

from .pipeline import process_image
from .auth import router as auth_router

# =========================
# APP SETUP
# =========================
app = FastAPI(
    title="CXR Report Generator API",
    description="Evidence-Weighted, Disagreement-Aware Chest X-Ray Report Generation",
    version="1.0.0",
)

# CORS — allow React dev server and production domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, you might want to restrict this to ["https://chestxray.tech", "http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# ENDPOINTS
# =========================
app.include_router(auth_router, prefix="/auth", tags=["Auth"])

@app.get("/health")
async def health_check():
    """Server health check endpoint."""
    return {"status": "healthy", "message": "CXR Report Generator API is running"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """Analyze a chest X-ray image.

    Accepts a JPEG/PNG image file and runs the full pipeline:
    CNN inference → FAISS retrieval → evidence weighting →
    disagreement detection → Gemini report generation.

    Returns:
        JSON with prediction, confidence, generated report,
        disagreement flag, keywords, and evidence cases.
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload a JPEG or PNG image."
        )

    try:
        # Read and convert image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("L")

        # Run pipeline in a thread to avoid blocking the event loop
        result = await asyncio.to_thread(process_image, image)
        return result

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )
