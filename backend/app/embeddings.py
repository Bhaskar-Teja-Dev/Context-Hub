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
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL_NAME}")
            _model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
            logger.info("Embedding model loaded successfully.")
        except Exception as e:
            logger.warning(f"Failed to load sentence-transformers model ({e}). Fallback to deterministic pseudo-embedding.")
            _model = None
    return _model

def generate_embedding(text: str) -> List[float]:
    """Generates a 384-dimensional dense float vector for text."""
    if not text:
        return [0.0] * 384

    model = get_embedding_model()
    if model is not None:
        try:
            embedding = model.encode(text, convert_to_numpy=True).tolist()
            return [float(x) for x in embedding]
        except Exception as e:
            logger.error(f"Error producing sentence-transformers embedding: {e}")

    # Fallback deterministic pseudo-embedding generator (384-dim normalized vector)
    seed = text.encode("utf-8")
    floats = []
    for i in range(384):
        h = hashlib.sha256(seed + i.to_bytes(4, "big")).digest()
        val = (int.from_bytes(h[:4], "big") / 4294967295.0) * 2.0 - 1.0
        floats.append(val)
    
    # Normalize length
    norm = sum(x * x for x in floats) ** 0.5
    if norm > 0:
        floats = [x / norm for x in floats]
    return floats
