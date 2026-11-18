"""Template-based roadmap: spreads the career's skills evenly across the chosen number of weeks.
Resources are search suggestions, not curated links - a teacher/counsellor should choose real ones."""
PLANS = {12, 24, 52}

def build_items(career, weeks, known_skills=()):
    known = {s.lower() for s in known_skills}
    skills = [s for s in career.skills if s.lower() not in known] or list(career.skills)
    k, items = len(skills), []
    for w in range(1, weeks + 1):
        i = (w - 1) * k // weeks
        block = [x for x in range(1, weeks + 1) if (x - 1) * k // weeks == i]
        part, last = block.index(w) + 1, (w == block[-1])
        s = skills[i]
        items.append(dict(
            week=w, skill=s, topic=f"{s} (part {part} of {len(block)})",
            resources=f"Search for a beginner-friendly {s} course or textbook; ask your teacher to confirm one.",
            practice=f"Practise {s} for 3-4 short sessions this week and note what you found hard.",
            project=f"Build a small project that uses {s}." if last else "",
            expected_outcome=f"Can explain and use the basics of {s}." if last else f"Progress on {s}."))
    return items
