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

def chat_raw(messages, tools=None, max_tokens=700):
    """Returns the assistant message dict (may contain tool_calls) or None on any failure."""
    cfg = config()
    if not cfg:
        return None
    body = {"model": cfg["model"], "messages": messages, "temperature": 0.2, "max_tokens": max_tokens}
    if tools:
        body["tools"] = tools; body["tool_choice"] = "auto"
    req = urllib.request.Request(cfg["base"] + "/chat/completions", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "Authorization": "Bearer " + cfg["key"], "User-Agent": "careerpath-ai/0.1"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return json.load(r)["choices"][0]["message"]
    except Exception as e:   # network error, 429 quota, bad model id, malformed JSON...
        log.warning("LLM call failed: %s", type(e).__name__)
        return None

def chat_completion(messages, max_tokens=600):
    m = chat_raw(messages, None, max_tokens)
    return ((m.get("content") or "").strip() or None) if m else None
