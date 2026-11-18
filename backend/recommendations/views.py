from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.permissions import IsStudent
from accounts.views import get_profile
from .engine import generate
from .models import Recommendation

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
