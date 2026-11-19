from .models import Document, DocumentChunk

def chunk_text(text, size=300):
    out, cur = [], ""
    for p in (p.strip() for p in text.split("\n\n") if p.strip()):
        if cur and len(cur) + len(p) > size:
            out.append(cur); cur = p
        else:
            cur = f"{cur}\n\n{p}".strip()
    if cur: out.append(cur)
    return out

def add_document(title, source, text):
    doc, _ = Document.objects.get_or_create(title=title, defaults={"source": source})
    chunks = chunk_text(text)
    if list(doc.chunks.order_by("position").values_list("text", flat=True)) == chunks:
        return doc   # unchanged: keep existing chunks and their embeddings
    doc.chunks.all().delete()
    DocumentChunk.objects.bulk_create([DocumentChunk(document=doc, position=i, text=t) for i, t in enumerate(chunks)])
    return doc

def ingest_careers():
    from careers.models import Career
    for c in Career.objects.all():
        text = (f"{c.name}: {c.description}\n\n"
                f"Subjects usually needed for {c.name}: {', '.join(c.required_subjects)}.\n\n"
                f"Degree options for {c.name}: {'; '.join(c.degree_options)}.\n\n"
                f"Entrance exams for {c.name}: {'; '.join(c.entrance_exams)}.\n\n"
                f"Key skills for {c.name}: {', '.join(c.skills)}. Typical roles: {', '.join(c.job_roles)}.")
        add_document(f"Career: {c.name}", "CareerPath starter career database (general guidance, not official)", text)

def ingest_pathways():
    from careers.pathways import STREAMS
    for st in STREAMS:
        degs = "\n\n".join(f"{d['name']} ({d['duration']}) leads to: {', '.join(d['careers'])}. {d['note']}" for d in st["degrees"])
        add_document(f"Pathway: {st['name']}", "CareerPath pathway data (general guidance, not official)",
                     f"{st['name']}: {st['summary']}\n\nSubjects: {', '.join(st['subjects'])}. {st['after10']}\n\n{degs}")
