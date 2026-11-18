"""Keyword retrieval with TF-IDF + cosine similarity, computed in memory over all chunks.
No neural embeddings or external vector DB yet (see README)."""
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re
from .models import DocumentChunk

STOP = {"the","a","an","is","are","what","which","for","of","to","in","and","i","do","how","can","be","need","needed","should"}

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
    sims = cosine_similarity(m[-1], m[:-1])[0]
    ranked = sorted(zip(sims, chunks), key=lambda x: -x[0])[:k]
    return [{"score": round(float(s), 3), "text": c.text, "title": c.document.title,
             "source": c.document.source, "chunk": c.position} for s, c in ranked if s >= min_score]
