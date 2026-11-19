"""Optional ML re-ranker. Trained ONLY on real student feedback ("this suggestion was useful"). With too little data, or if it
doesn't beat a trivial baseline in cross-validation, no model is saved and recommendations stay purely rule-based."""
import io, os
from collections import Counter
import joblib, numpy as np
from sklearn.dummy import DummyClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score, permutation_test_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from assessments.bank import INTEREST
from .models import MLModel, RecommendationFeedback

ACADEMIC = ["Mathematics", "Science", "English", "Social Science", "Commerce"]
APTITUDE = ["Logical reasoning", "Numerical reasoning", "Verbal reasoning", "Problem solving"]
NAMES = ACADEMIC + list(INTEREST) + APTITUDE
_cache = {}

def vectorize(feats):
    """feats = {"academic": {...}, "interest": {...}, "aptitude": {...}} -> fixed-order list with None for missing."""
    return [feats.get(g, {}).get(k) for g, ks in (("academic", ACADEMIC), ("interest", list(INTEREST)), ("aptitude", APTITUDE)) for k in ks]

def _arr(rows):
    return np.array([[np.nan if v is None else float(v) for v in r] for r in rows], dtype=float)

def train():
    min_samples = int(os.environ.get("ML_MIN_SAMPLES", "50"))
    rows = list(RecommendationFeedback.objects.filter(liked=True).values_list("features", "career_id"))
    counts = Counter(c for _, c in rows)
    rows = [(f, c) for f, c in rows if counts[c] >= 3 and len(f) == len(NAMES)]
    X, y = [f for f, _ in rows], [c for _, c in rows]
    if len(X) < min_samples or len(set(y)) < 3:
        return {"trained": False, "reason": f"need at least {min_samples} 'useful' ratings over at least 3 careers (have {len(X)} over {len(set(y))})"}
    X = _arr(X); cv = StratifiedKFold(n_splits=min(3, min(Counter(y).values())), shuffle=True, random_state=0)
    pipe = make_pipeline(SimpleImputer(strategy="mean", keep_empty_features=True), StandardScaler(), LogisticRegression(max_iter=1000))
    base = float(cross_val_score(DummyClassifier(strategy="most_frequent"), X, y, cv=cv).mean())
    # permutation test: is the cross-validated accuracy better than what shuffled labels give by luck?
    acc, _, pval = permutation_test_score(pipe, X, y, cv=cv, n_permutations=100, random_state=0, scoring="accuracy"); acc, pval = float(acc), float(pval)
    if acc < base + 0.10 or pval > 0.01:
        return {"trained": False, "reason": f"not better than chance: cross-validated accuracy {acc:.2f}, majority baseline {base:.2f}, permutation p-value {pval:.3f}",
                "cv_accuracy": round(acc, 3), "baseline": round(base, 3), "p_value": round(pval, 3)}
    pipe.fit(X, y); buf = io.BytesIO(); joblib.dump(pipe, buf)
    meta = {"trained": True, "samples": len(y), "careers": len(set(y)), "cv_accuracy": round(acc, 3), "baseline": round(base, 3), "p_value": round(pval, 3)}
    MLModel.objects.create(blob=buf.getvalue(), meta=meta)
    _cache.clear()
    return meta

def load():
    m = MLModel.objects.order_by("-id").first()
    if not m:
        return None
    if _cache.get("id") != m.id:
        _cache.update(id=m.id, model=joblib.load(io.BytesIO(bytes(m.blob))), meta=m.meta)
    return _cache["model"]

def predict(model, feats):
    probs = model.predict_proba(_arr([vectorize(feats)]))[0]
    return {int(c): float(p) for c, p in zip(model.classes_, probs)}
