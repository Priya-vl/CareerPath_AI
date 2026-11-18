"""Minimal client for any OpenAI-compatible /chat/completions endpoint (Groq, Gemini, OpenRouter, ...).
Standard library only. Returns None on ANY failure so callers can fall back to extractive answers."""
import json, logging, os, urllib.request

log = logging.getLogger(__name__)
# Free-tier providers with OpenAI-compatible APIs. Model ids and free limits change; override with LLM_MODEL / LLM_BASE_URL.
PRESETS = {
    "groq": ("https://api.groq.com/openai/v1", "llama-3.3-70b-versatile"),
    "gemini": ("https://generativelanguage.googleapis.com/v1beta/openai", "gemini-2.5-flash"),
    "openrouter": ("https://openrouter.ai/api/v1", ""),   # set LLM_MODEL to a model id ending in :free
}

def config():
    base, model = PRESETS.get(os.environ.get("LLM_PROVIDER", "groq").lower(), ("", ""))
    base, model = os.environ.get("LLM_BASE_URL", base), os.environ.get("LLM_MODEL", model)
    key = os.environ.get("LLM_API_KEY", "")
    return {"base": base.rstrip("/"), "key": key, "model": model} if (base and key and model) else None

def chat_completion(messages, max_tokens=600):
    cfg = config()
    if not cfg:
        return None
    req = urllib.request.Request(
        cfg["base"] + "/chat/completions",
        data=json.dumps({"model": cfg["model"], "messages": messages, "temperature": 0.2, "max_tokens": max_tokens}).encode(),
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + cfg["key"], "User-Agent": "careerpath-ai/0.1"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)["choices"][0]["message"]["content"].strip() or None
    except Exception as e:   # network error, 429 quota, bad model id, malformed JSON...
        log.warning("LLM call failed: %s", type(e).__name__)
        return None
