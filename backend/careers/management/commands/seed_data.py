from django.core.management.base import BaseCommand
from careers.models import Career
from careers.seed import CAREERS
from careers.seed_more import MORE
from careers.seed_extra import EXTRA
from assessments.models import Question
from assessments.seed import build_questions
from rag.ingest import ingest_careers, ingest_pathways

class Command(BaseCommand):
    help = "Load starter careers, assessment questions and RAG documents (idempotent)."
    def handle(self, *a, **kw):
        for c in CAREERS + MORE + EXTRA:
            Career.objects.update_or_create(name=c["name"], defaults={k: v for k, v in c.items() if k != "name"})
        bank = build_questions()
        for q in bank:   # sync by text so re-running updates the bank instead of duplicating it
            Question.objects.update_or_create(text=q["text"], defaults={k: v for k, v in q.items() if k != "text"})
        Question.objects.exclude(text__in=[q["text"] for q in bank]).delete()
        ingest_careers()
        ingest_pathways()
        self.stdout.write(self.style.SUCCESS("Seeded."))
