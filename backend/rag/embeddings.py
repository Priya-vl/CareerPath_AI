"""Neural text embeddings through any OpenAI-compatible /embeddings API (default: Gemini's free tier).
Returns None on any failure so callers fall back to keyword (TF-IDF) retrieval."""
import json, logging, os, urllib.request

log = logging.getLogger(__name__)
PRESETS = {"gemini": ("https://generativelanguage.googleapis.com/v1beta/openai", "gemini-embedding-001"),
           "openai": ("https://api.openai.com/v1", "text-embedding-3-small")}

def config():
    prov = os.environ.get("EMBED_PROVIDER", "gemini").lower()
    base, model = PRESETS.get(prov, ("", ""))
    base, model = os.environ.get("EMBED_BASE_URL", base), os.environ.get("EMBED_MODEL", model)
    key = os.environ.get("EMBED_API_KEY", "")
    return {"base": base.rstrip("/"), "model": model, "key": key, "dims": os.environ.get("EMBED_DIMENSIONS", "")} if (base and model and key) else None

def model_tag():
    c = config()
    return f"{c['model']}:{c['dims'] or 'default'}" if c else ""

def normalize(v):
    n = sum(x * x for x in v) ** 0.5 or 1.0
    return [x / n for x in v]

def embed(texts, batch=32):
    cfg = config()
    if not cfg or not texts:
        return None
    out = []
    for i in range(0, len(texts), batch):
        body = {"model": cfg["model"], "input": texts[i:i + batch]}
        if cfg["dims"]: body["dimensions"] = int(cfg["dims"])
        req = urllib.request.Request(cfg["base"] + "/embeddings", data=json.dumps(body).encode(),
                                     headers={"Content-Type": "application/json", "Authorization": "Bearer " + cfg["key"], "User-Agent": "careerpath-ai/0.1"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = sorted(json.load(r)["data"], key=lambda d: d.get("index", 0))
            out += [normalize(d["embedding"]) for d in data]
        except Exception as e:
            log.warning("Embedding call failed: %s", type(e).__name__)
            return None
    return out if len(out) == len(texts) else None
