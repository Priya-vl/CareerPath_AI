import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
app = Celery("careerpath")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

def run(task, *args):
    """Queue a task. If the broker is unreachable, run it inline so the request still works."""
    try:
        return task.delay(*args)
    except Exception:
        return task(*args)
