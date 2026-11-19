import json
from django.core.management.base import BaseCommand
from recommendations import ml

class Command(BaseCommand):
    help = "Train the optional re-ranking model from real student feedback (does nothing if there is too little data)."
    def handle(self, *a, **kw):
        self.stdout.write(json.dumps(ml.train(), indent=2))
