from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.permissions import IsStudent
from accounts.views import get_profile
from django.shortcuts import get_object_or_404
from careers.models import Career
from .engine import generate, build_features
from . import ml
from .models import Recommendation, RecommendationFeedback

class GenerateView(APIView):
    permission_classes = [IsStudent]
    def post(self, request):
        results = generate(request.user, get_profile(request.user))
        if not results:
            return Response({"detail": "Add subject marks or take the assessment first."}, status=400)
        request.user.recommendations.all().delete()   # keep only the latest generation
        for r in results:
            Recommendation.objects.create(student=request.user, career_id=r["career_id"],
                                          match_score=r["match_score"], detail=r)
        return Response(results, status=201)

class ListView(APIView):
    permission_classes = [IsStudent]
    def get(self, request):
        qs = request.user.recommendations.order_by("-match_score")
        return Response([r.detail for r in qs])

class FeedbackView(APIView):
    permission_classes = [IsStudent]
    def post(self, request):
        liked = request.data.get("liked")
        if not isinstance(liked, bool):
            return Response({"detail": "liked must be true or false."}, status=400)
        career = get_object_or_404(Career, pk=request.data.get("career_id"))
        feats = ml.vectorize(build_features(get_profile(request.user), request.user.assessments.order_by("-created_at").first()))
        RecommendationFeedback.objects.update_or_create(student=request.user, career=career, defaults={"liked": liked, "features": feats})
        return Response({"saved": True})
