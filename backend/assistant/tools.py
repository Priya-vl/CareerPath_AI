"""Deterministic assistant 'tools': answer common career questions directly from the career + pathway data.
Nothing here is generated, so nothing can be invented. Returns (text, sources) or None when no tool applies."""
import re
from careers.models import Career
from careers.pathways import STREAMS

SRC = [{"title": "CareerPath career & pathway database", "source": "Starter data: general guidance, not an official source"}]
ALIASES = {"data science": "Data Scientist", "ai engineering": "AI Engineer", "artificial intelligence": "AI Engineer",
           "machine learning": "Machine Learning Engineer", "ml engineer": "Machine Learning Engineer", "mbbs": "Doctor",
           "ca": "Chartered Accountant", "ias": "Civil Services Officer", "ips": "Civil Services Officer", "upsc": "Civil Services Officer",
           "ux": "UX Designer", "pilot": "Commercial Pilot", "software developer": "Software Engineer", "programmer": "Software Engineer"}
STREAM_WORDS = {"pcm": "pcm", "pcb": "pcb", "commerce": "commerce", "humanities": "humanities", "arts": "humanities"}

def find_careers(q):
    hits = []
    for c in Career.objects.all():
        m = re.search(rf"\b{re.escape(c.name.lower())}s?\b", q)
        if m: hits.append((m.start(), c))
    for alias, name in ALIASES.items():
        m = re.search(rf"\b{re.escape(alias)}\b", q)
        if m:
            c = Career.objects.filter(name=name).first()
            if c: hits.append((m.start(), c))
    seen, out = set(), []
    for _, c in sorted(hits, key=lambda x: x[0]):
        if c.id not in seen: seen.add(c.id); out.append(c)
    return out

def bullets(label, items): return f"• {label}: {', '.join(items)}" if items else ""
def join(lines): return "\n".join(l for l in lines if l)

def career_answer(c, user):
    lines = [f"{c.name}: {c.description}", "", bullets("Subjects usually needed", c.required_subjects), bullets("Degree options", c.degree_options),
             bullets("Entrance exams", c.entrance_exams), bullets("Key skills to build", c.skills), bullets("Typical roles", c.job_roles),
             bullets("Related careers", c.related_careers)]
    prof = getattr(user, "profile", None) if user.role == "student" else None
    if prof and prof.strengths:
        have = {s.lower() for s in prof.strengths}
        gaps = [s for s in c.skills if s.lower() not in have]
        lines += ["", f"For you: you listed {', '.join(prof.strengths[:5])}. Skills still to build: {', '.join(gaps) or 'none listed'}."]
    lines += ["", "Please confirm exams and eligibility with official sources or your school counsellor."]
    return join(lines), SRC

def compare(a, b):
    sa, sb = set(a.skills), set(b.skills)
    return join([f"{a.name} vs {b.name}", "", f"• {a.name}: {a.description}", f"• {b.name}: {b.description}", "",
                 bullets(f"Skills only for {a.name}", sorted(sa - sb)), bullets(f"Skills only for {b.name}", sorted(sb - sa)), bullets("Skills in both", sorted(sa & sb)), "",
                 bullets(f"Degrees for {a.name}", a.degree_options), bullets(f"Degrees for {b.name}", b.degree_options),
                 bullets(f"Typical roles for {a.name}", a.job_roles), bullets(f"Typical roles for {b.name}", b.job_roles)]), SRC

def stream_answer(s):
    careers = sorted({c for d in s["degrees"] for c in d["careers"]})
    return join([f"{s['name']} ({s['summary']})", "", f"• Subjects: {', '.join(s['subjects'])}", f"• Degree routes: {', '.join(d['name'] + ' (' + d['duration'] + ')' for d in s['degrees'])}",
                 f"• Careers you can aim for: {', '.join(careers)}", "", "Open the Careers & Pathways page to explore each degree and career."]), SRC

def after10():
    return join(["After Class 10 you usually choose a stream or a skills route:", ""] + [f"• {s['name']}: {s['after10']}" for s in STREAMS] +
                ["", "If you're unsure, take the assessment and talk to your school counsellor before deciding."]), SRC

def after12():
    return join(["After Class 12, your options depend on your stream:", ""] + [f"• {s['name']}: " + "; ".join(f"{d['name']} ({d['duration']})" for d in s["degrees"]) for s in STREAMS if s["id"] != "skills"]), SRC

def skills_answer(user):
    recs = list(user.recommendations.order_by("-match_score")[:3]) if user.role == "student" else []
    if not recs:
        return ("I can suggest skills once you've taken the assessment. Or ask about a specific career, for example "
                "\"skills for a data scientist\"."), []
    return join(["Skills to build for your top suggestions:", ""] + [f"• {r.career.name}: {', '.join(r.detail.get('skill_gaps', [])) or 'no gaps listed'}" for r in recs]), SRC

def answer(question, user):
    q = question.lower()
    cs = find_careers(q)
    if len(cs) >= 2 and re.search(r"differen|compare|\bvs\b|versus", q): return compare(cs[0], cs[1])
    if re.search(r"after (class |grade |the )?(10|10th|tenth)", q): return after10()
    if re.search(r"after (class |grade |the )?(12|12th|twelfth)", q): return after12()
    sw = next((v for k, v in STREAM_WORDS.items() if re.search(rf"\b{k}\b", q)), None)
    if sw and not cs: return stream_answer(next(s for s in STREAMS if s["id"] == sw))
    if re.search(r"\bskills?\b", q) and not cs: return skills_answer(user)
    if cs: return career_answer(cs[0], user)
    return None
