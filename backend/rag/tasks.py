from celery import shared_task
from .vectorstore import embed_missing

@shared_task
def embed_chunks_task():
    return embed_missing()
