from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.models import StudentProfile
from accounts.permissions import IsStudent, IsParent, IsStaffRole
from accounts.views import get_profile

def summary(user, profile, detailed=True):
    a = user.assessments.order_by("-created_at").first()
    recs = list(user.recommendations.order_by("-match_score")[:5])
    maps = list(user.roadmaps.prefetch_related("items"))
    items = [i for r in maps for i in r.items.all()]
    done = sum(i.completed for i in items)
    skills = {}
    for i in items:
        skills.setdefault(i.skill, []).append(i.completed)
    out = {"name": user.first_name or user.username, "grade": profile.grade,
           "assessment": a.scores if a else None,
           "top_career": recs[0].career.name if recs else None,
           "career_match": recs[0].match_score if recs else None,
           "recommended_careers": [{"career": r.career.name, "match_score": r.match_score} for r in recs],
           "strengths": recs[0].detail.get("strengths", []) if recs else [],
           "skill_gaps": recs[0].detail.get("skill_gaps", []) if recs else [],
           "roadmap_progress": round(100 * done / len(items), 1) if items else 0,
           "skills_completed": sum(all(v) for v in skills.values()),
           "skills_total": len(skills)}
    if detailed:
        out["subject_performance"] = profile.marks
    return out

class DashboardView(APIView):
    permission_classes = [IsStudent]
    def get(self, request):
        p = get_profile(request.user)
        d = summary(request.user, p)
        scores = (d["assessment"] or {})
        flat = [v for g in scores.values() for v in g.values()]
        d["assessment_score"] = round(sum(flat) / len(flat), 1) if flat else None
        return Response(d)

class ParentChildren(APIView):
    """Parents see summaries only (no marks, email or chat history) for children linked by an admin."""
    permission_classes = [IsParent]
    def get(self, request):
        ps = StudentProfile.objects.filter(guardians=request.user).select_related("user")
        return Response([summary(p.user, p, detailed=False) for p in ps])

class TeacherStudents(APIView):
    permission_classes = [IsStaffRole]
    def get(self, request):
        ps = StudentProfile.objects.filter(counsellors=request.user).select_related("user")
        return Response([dict(summary(p.user, p), id=p.user_id) for p in ps])
