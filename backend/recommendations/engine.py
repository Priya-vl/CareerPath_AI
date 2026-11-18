"""Baseline weighted scoring model (heuristic, NOT scientifically validated).
For each career: match = weighted average over the features the student has data for.
Missing features are skipped (and reported via `coverage`), not treated as zero."""

def build_features(profile, assessment):
    scores = assessment.scores if assessment else {}
    return {"academic": {k: float(v) for k, v in (profile.marks or {}).items()},
            "interest": scores.get("interest", {}), "aptitude": scores.get("aptitude", {})}

def score_career(career, feats, profile):
    total = wsum = 0.0; contrib = []; avail = n = 0
    for grp, ws in career.weights.items():
        for key, w in ws.items():
            n += w
            v = feats.get(grp, {}).get(key)
            if v is None:
                continue
            total += w * v; wsum += w; avail += w; contrib.append((w * v, grp, key, v))
    if wsum == 0:
        return None
    contrib.sort(reverse=True)
    strengths = [f"{k} ({g}: {v:.0f}/100)" for _, g, k, v in contrib if v >= 65][:4]
    have = {s.lower() for s in (profile.strengths or [])}
    return {"career_id": career.id, "career": career.name, "match_score": round(total / wsum, 1),
            "coverage": round(avail / n, 2),
            "reasons": [f"{k} {g} score is {v:.0f}/100" for _, g, k, v in contrib[:3]],
            "strengths": strengths,
            "skill_gaps": [s for s in career.skills if s.lower() not in have],
            "recommended_subjects": career.required_subjects,
            "recommended_degrees": career.degree_options,
            "disclaimer": "Heuristic guidance based on your inputs, not a validated prediction."}

def generate(user, profile, top_n=5):
    from careers.models import Career
    feats = build_features(profile, user.assessments.order_by("-created_at").first())
    res = [r for r in (score_career(c, feats, profile) for c in Career.objects.all()) if r]
    return sorted(res, key=lambda r: -r["match_score"])[:top_n]
