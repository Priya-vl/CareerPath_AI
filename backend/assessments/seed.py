from .bank import INTEREST, LIKERT, APTITUDE

def build_questions():
    out = [dict(category="interest", dimension=d, text=t, options=LIKERT) for d, ts in INTEREST.items() for t in ts]
    out += [dict(category="aptitude", dimension=d, text=t, options=o, correct_index=i) for d, t, o, i in APTITUDE]
    return out
