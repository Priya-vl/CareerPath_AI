"""Vector store inside the main database: vectors are saved on DocumentChunk and searched with exact cosine similarity (numpy).
Fine for thousands of chunks. For much larger corpora, move to pgvector (see README)."""
import numpy as np
from . import embeddings
from .models import DocumentChunk

def embed_missing():
    if not embeddings.config():
        return 0
    tag = embeddings.model_tag()
    todo = list(DocumentChunk.objects.exclude(embedding_model=tag))
    if not todo:
        return 0
    vecs = embeddings.embed([c.text for c in todo])
    if vecs is None:
        return 0
    for c, v in zip(todo, vecs):
        c.embedding, c.embedding_model = v, tag
    DocumentChunk.objects.bulk_update(todo, ["embedding", "embedding_model"], batch_size=50)
    return len(todo)

def search(query_vec, k=5):
    rows = list(DocumentChunk.objects.filter(embedding_model=embeddings.model_tag()).select_related("document"))
    if not rows:
        return []
    sims = np.array([r.embedding for r in rows], dtype=np.float32) @ np.array(query_vec, dtype=np.float32)
    return [(float(sims[i]), rows[i]) for i in np.argsort(-sims)[:k]]
