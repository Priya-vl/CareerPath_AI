import random
from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.permissions import IsStudent
from accounts.models import audit
from .models import Question, Assessment
from .scoring import score_answers

SIZES = {"quick": (2, 1), "standard": (3, 2), "full": (999, 999)}   # (interest, aptitude) questions per dimension

class StartView(APIView):
    permission_classes = [IsStudent]
    def post(self, request):
        size = request.data.get("size", "standard")
        if size not in SIZES:
            return Response({"detail": "size must be quick, standard or full."}, status=400)
        groups = {}
        for q in Question.objects.all().order_by("id"):
            groups.setdefault((q.category, q.dimension), []).append(q)
        picked = []
        for (cat, _), qs in groups.items():
            picked += random.sample(qs, min(SIZES[size][0 if cat == "interest" else 1], len(qs)))
        picked.sort(key=lambda q: (q.category, q.id))
        return Response([{"id": q.id, "category": q.category, "dimension": q.dimension, "text": q.text,
                          "options": q.options} for q in picked])   # correct answers are never sent

class SubmitView(APIView):
    permission_classes = [IsStudent]
    def post(self, request):
        answers = request.data.get("answers")
        if not isinstance(answers, dict) or not answers:
            return Response({"detail": "answers must be a non-empty object {question_id: option_index}."}, status=400)
        try:
            answers = {str(int(k)): int(v) for k, v in answers.items()}
        except (TypeError, ValueError):
            return Response({"detail": "Invalid answer format."}, status=400)
        a = Assessment.objects.create(student=request.user, answers=answers,
                                      scores=score_answers(Question.objects.all(), answers))
        audit(request.user, "assessment_submit")
        return Response({"id": a.id, "scores": a.scores}, status=201)

class ResultsView(APIView):
    permission_classes = [IsStudent]
    def get(self, request):
        a = request.user.assessments.order_by("-created_at").first()
        if not a:
            return Response({"detail": "No assessment taken yet."}, status=404)
        return Response({"id": a.id, "scores": a.scores, "created_at": a.created_at,
                         "note": "Scores reflect your answers only. They are not a diagnosis or a validated test."})
