from collections import defaultdict

def score_answers(questions, answers):
    """Interest: Likert index 0-4 -> 0-100. Aptitude: correct=100 / wrong=0. Averaged per dimension.
    Unanswered questions are ignored. Aptitude has very few items, so scores are coarse."""
    buckets = defaultdict(lambda: defaultdict(list))
    for q in questions:
        a = answers.get(str(q.id))
        if a is None:
            continue
        a = int(a)
        if q.category == "interest":
            v = max(0, min(4, a)) / 4 * 100
        else:
            v = 100.0 if a == q.correct_index else 0.0
        buckets[q.category][q.dimension].append(v)
    return {cat: {d: round(sum(v) / len(v), 1) for d, v in dims.items()} for cat, dims in buckets.items()}
