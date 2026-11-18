from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.permissions import IsStudent
from accounts.views import get_profile
from careers.models import Career
from .generator import build_items, PLANS
from .models import Roadmap, RoadmapItem

def ser(r):
    items = list(r.items.all())
    done = sum(i.completed for i in items)
    return {"id": r.id, "career": r.career.name, "goal": r.goal, "weeks": r.weeks,
            "progress": round(100 * done / len(items), 1) if items else 0,
            "items": [{"id": i.id, "week": i.week, "topic": i.topic, "resources": i.resources, "practice": i.practice,
                       "project": i.project, "expected_outcome": i.expected_outcome, "completed": i.completed}
                      for i in items]}

class GenerateView(APIView):
    permission_classes = [IsStudent]
    def post(self, request):
        weeks = int(request.data.get("weeks", 12))
        if weeks not in PLANS:
            return Response({"detail": "weeks must be 12, 24 or 52."}, status=400)
        career = get_object_or_404(Career, pk=request.data.get("career_id"))
        profile = get_profile(request.user)
        r = Roadmap.objects.create(student=request.user, career=career, weeks=weeks,
                                   goal=f"Build foundations for a career as a {career.name}")
        RoadmapItem.objects.bulk_create([RoadmapItem(roadmap=r, **d)
                                         for d in build_items(career, weeks, profile.strengths)])
        return Response(ser(r), status=201)

class ListView(APIView):
    permission_classes = [IsStudent]
    def get(self, request):
        return Response([ser(r) for r in request.user.roadmaps.prefetch_related("items").order_by("-created_at")])

class ProgressView(APIView):
    permission_classes = [IsStudent]
    def put(self, request, pk):
        r = get_object_or_404(Roadmap, pk=pk, student=request.user)     # ownership enforced
        item = get_object_or_404(RoadmapItem, pk=request.data.get("item_id"), roadmap=r)
        item.completed = bool(request.data.get("completed", True)); item.save()
        return Response(ser(r))
