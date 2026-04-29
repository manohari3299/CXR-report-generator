import faiss
import json

# =========================
# LOAD FAISS INDEX
# =========================
def load_faiss(faiss_index_path: str, metadata_json_path: str):
    """Load FAISS index and retrieval metadata.

    Args:
        faiss_index_path: Path to the FAISS .index file.
        metadata_json_path: Path to JSON file with retrieval metadata.

    Returns:
        Tuple of (faiss.Index, list[dict]) — the index and metadata records.
    """
    index = faiss.read_index(faiss_index_path)
    with open(metadata_json_path, "r") as f:
        metadata = json.load(f)
    return index, metadata
