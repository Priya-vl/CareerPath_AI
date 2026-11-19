"""Hybrid retrieval: TF-IDF keyword scores + (when configured) neural-embedding cosine scores, fused with reciprocal rank fusion.
Without an embeddings API key it is TF-IDF only."""
import os, re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from . import embeddings, vectorstore
from .models import DocumentChunk

STOP = {"the", "a", "an", "is", "are", "what", "which", "for", "of", "to", "in", "and", "i", "do", "how", "can", "be", "need", "needed", "should"}

def tokenize(t):
    # crude plural stripping so 'exam' matches 'exams'
    return [w[:-1] if len(w) > 3 and w.endswith("s") else w for w in re.findall(r"[a-z0-9]+", t.lower()) if w not in STOP]

def retrieve(query, k=3, min_score=0.08):
    chunks = list(DocumentChunk.objects.select_related("document"))
    if not chunks or not query.strip():
        return []
    vec = TfidfVectorizer(tokenizer=tokenize, lowercase=False, token_pattern=None)
    try:
        m = vec.fit_transform([c.text for c in chunks] + [query])
    except ValueError:
        return []
    tf = {c.id: float(s) for c, s in zip(chunks, cosine_similarity(m[-1], m[:-1])[0])}
    cos = {}
    if embeddings.config() and any(c.embedding_model for c in chunks):
        qv = embeddings.embed([query])
        if qv:
            cos = {c.id: s for s, c in vectorstore.search(qv[0], k=len(chunks))}
    if cos:
        rt = {cid: r for r, cid in enumerate(sorted(tf, key=lambda x: -tf[x]))}
        rc = {cid: r for r, cid in enumerate(sorted(cos, key=lambda x: -cos[x]))}
        fused = {c.id: 1 / (60 + rt[c.id]) + 1 / (60 + rc.get(c.id, len(chunks))) for c in chunks}
        cmin = float(os.environ.get("EMBED_MIN_SCORE", "0.6"))
        ordered = [c for c in sorted(chunks, key=lambda c: -fused[c.id]) if tf[c.id] >= min_score or cos.get(c.id, 0) >= cmin][:k]
    else:
        ordered = [c for c in sorted(chunks, key=lambda c: -tf[c.id]) if tf[c.id] >= min_score][:k]
    return [{"score": round(cos.get(c.id, tf[c.id]), 3), "tfidf": round(tf[c.id], 3), "cosine": round(cos[c.id], 3) if c.id in cos else None,
             "text": c.text, "title": c.document.title, "source": c.document.source, "chunk": c.position} for c in ordered]
