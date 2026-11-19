"""The six tools used by the career planning agent. All are read-only: nothing is saved until the student chooses to save a roadmap."""
from django.db.models import Q
from accounts.views import get_profile
from careers.models import Career
from careers.pathways import STREAMS
from rag.retrieval import retrieve
from recommendations import engine
from roadmaps.generator import PLANS, build_items
from . import tools as direct

def _career(ref):
    if isinstance(ref, int) or str(ref).isdigit():
        return Career.objects.filter(pk=int(ref)).first()
    hits = direct.find_careers(str(ref).lower())
    return hits[0] if hits else Career.objects.filter(name__iexact=str(ref)).first()

def _card(c):
    return {"id": c.id, "name": c.name, "description": c.description, "required_subjects": c.required_subjects, "skills": c.skills,
            "degree_options": c.degree_options, "entrance_exams": c.entrance_exams, "job_roles": c.job_roles}

def career_search(user, query):
    q = str(query)[:100]
    found = direct.find_careers(q.lower()) or list(Career.objects.filter(Q(name__icontains=q) | Q(description__icontains=q))[:5])
    return {"careers": [_card(c) for c in found[:5]], "passages": [{"title": h["title"], "text": h["text"]} for h in retrieve(q, k=2)]}

def course_search(user, query):
    ql, out = str(query).lower()[:100], []
    words = [w for w in ql.replace("/", " ").split() if len(w) > 2]
    for s in STREAMS:
        for d in s["degrees"]:
            hay = (d["name"] + " " + " ".join(d["careers"]) + " " + d["note"]).lower()
            if ql in hay or (words and all(w in hay for w in words)):
                out.append({"stream": s["name"], "degree": d["name"], "duration": d["duration"], "note": d["note"], "careers": d["careers"]})
    return {"courses": out[:8]}

def skill_gap_analyzer(user, career):
    c = _career(career)
    if not c: return {"error": "career not found"}
    have = {s.lower() for s in (get_profile(user).strengths or [])}
    return {"career": c.name, "skills_you_have": [s for s in c.skills if s.lower() in have], "skill_gaps": [s for s in c.skills if s.lower() not in have]}

def assessment_analyzer(user):
    a, p = user.assessments.order_by("-created_at").first(), get_profile(user)
    top = lambda d, n: [k for k, _ in sorted((d or {}).items(), key=lambda x: -x[1])[:n]]
    return {"assessment_taken": bool(a), "top_interests": top((a.scores if a else {}).get("interest"), 3), "top_aptitudes": top((a.scores if a else {}).get("aptitude"), 2),
            "strongest_subjects": top(p.marks, 3), "marks": p.marks or {}}

def recommendation_engine(user):
    res = engine.generate(user, get_profile(user), top_n=5)
    return {"recommendations": [{"career_id": r["career_id"], "career": r["career"], "match_score": r["match_score"], "reasons": r["reasons"], "skill_gaps": r["skill_gaps"]} for r in res]}

def roadmap_generator(user, career, weeks=12):
    c, weeks = _career(career), int(weeks)
    if not c: return {"error": "career not found"}
    if weeks not in PLANS: return {"error": "weeks must be 12, 24 or 52"}
    return {"career_id": c.id, "career": c.name, "weeks": weeks, "saved": False, "items": build_items(c, weeks, get_profile(user).strengths)}

def _schema(name, desc, props=None, req=()):
    return {"type": "function", "function": {"name": name, "description": desc, "parameters": {"type": "object", "properties": props or {}, "required": list(req)}}}
S = {"type": "string"}
REGISTRY = {
    "career_search": (career_search, _schema("career_search", "Find careers and reference passages matching a name or topic.", {"query": S}, ["query"])),
    "course_search": (course_search, _schema("course_search", "Find degree/course routes (with durations and exams) matching a degree, career or keyword.", {"query": S}, ["query"])),
    "skill_gap_analyzer": (skill_gap_analyzer, _schema("skill_gap_analyzer", "Compare the student's listed skills with a career's required skills.", {"career": S}, ["career"])),
    "assessment_analyzer": (assessment_analyzer, _schema("assessment_analyzer", "Summarise the student's latest assessment and marks.")),
    "recommendation_engine": (recommendation_engine, _schema("recommendation_engine", "Get the student's current top career matches with scores.")),
    "roadmap_generator": (roadmap_generator, _schema("roadmap_generator", "Preview a week-by-week roadmap for a career (not saved).", {"career": S, "weeks": {"type": "integer", "enum": [12, 24, 52]}}, ["career"])),
}
