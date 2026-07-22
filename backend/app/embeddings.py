import logging
import hashlib
from typing import List
from app.config import settings

logger = logging.getLogger(__name__)

_model = None

def get_embedding_model():
    global _model
    if settings.MOCK_EMBEDDINGS:
        return None
    if _model is None:
        try:
            from fastembed import TextEmbedding
            logger.info(f"Loading fastembed ONNX model: {settings.EMBEDDING_MODEL_NAME}")
            # fastembed downloads and caches the ONNX model (~25MB, no PyTorch needed)
            _model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
            logger.info("Embedding model loaded successfully.")
        except Exception as e:
            logger.warning(f"Failed to load fastembed model ({e}). Falling back to deterministic pseudo-embeddings.")
            _model = None
    return _model

def generate_embedding(text: str) -> List[float]:
    """Generates a 384-dimensional dense float vector for text."""
    if not text:
        return [0.0] * 384

    model = get_embedding_model()
    if model is not None:
        try:
            # fastembed returns a generator — consume the first result
            embeddings = list(model.embed([text]))
            return [float(x) for x in embeddings[0].tolist()]
        except Exception as e:
            logger.error(f"Error producing fastembed embedding: {e}")

    # Fallback: deterministic pseudo-embedding (fast, no deps, 384-dim normalized)
    seed = text.encode("utf-8")
    floats = []
    for i in range(384):
        h = hashlib.sha256(seed + i.to_bytes(4, "big")).digest()
        val = (int.from_bytes(h[:4], "big") / 4294967295.0) * 2.0 - 1.0
        floats.append(val)

    norm = sum(x * x for x in floats) ** 0.5
    if norm > 0:
        floats = [x / norm for x in floats]
    return floats
