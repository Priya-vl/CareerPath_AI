from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle, UserRateThrottle
from rest_framework.views import APIView
from rag.retrieval import retrieve
from . import llm, tools
from .grounding import REFUSAL, build_messages, check_citations, student_context
from .llm import chat_completion
from .models import ChatSession, ChatMessage

NO_ANSWER = (f"{REFUSAL} I won't guess. Please check with your school counsellor or the official board/university website.")

def extractive_answer(hits):
    text = "Here is what my sources say:\n\n" + "\n\n".join(h["text"] for h in hits)
    return text, [{"title": h["title"], "source": h["source"], "score": h["score"]} for h in hits]

def grounded_answer(question, user, history=()):
    """Returns (answer, sources, mode). The LLM is only called when retrieval found sources, and its output is
    used only if it cites valid sources; otherwise we fall back to the extractive answer."""
    direct = tools.answer(question, user)
    if direct:
        return direct[0], direct[1], "tools"
    query = question if len(question.split()) > 5 or not history else f"{history[-2].content} {question}" if len(history) >= 2 else question
    hits = retrieve(query, k=4)
    if not hits:
        return NO_ANSWER, [], "no_sources"
    answer = chat_completion(build_messages(question, hits, history, student_context(user)))
    cited = check_citations(answer, len(hits)) if answer else None
    if cited is None:
        return (*extractive_answer(hits), "extractive")
    srcs = [{"n": i, "title": hits[i - 1]["title"], "source": hits[i - 1]["source"]} for i in sorted(cited)]
    return answer, srcs, "llm"

class RagQueryView(APIView):
    def post(self, request):
        q = str(request.data.get("query", "")).strip()[:500]
        if not q:
            return Response({"detail": "query is required."}, status=400)
        return Response({"results": retrieve(q)})

class ChatView(APIView):
    throttle_classes = [UserRateThrottle, ScopedRateThrottle]; throttle_scope = "llm"   # protects the free-tier quota
    def post(self, request):
        q = str(request.data.get("message", "")).strip()[:500]
        if not q:
            return Response({"detail": "message is required."}, status=400)
        session = ChatSession.objects.filter(pk=request.data.get("session_id"), user=request.user).first() \
            or ChatSession.objects.create(user=request.user)
        history = list(session.messages.order_by("-id")[:4])[::-1]
        answer, sources, mode = grounded_answer(q, request.user, history)
        ChatMessage.objects.create(session=session, role="user", content=q)
        ChatMessage.objects.create(session=session, role="assistant", content=answer, sources=sources)
        cfg = llm.config()
        return Response({"session_id": session.id, "answer": answer, "sources": sources, "mode": mode,
                         "model": cfg["model"] if mode == "llm" else None})
