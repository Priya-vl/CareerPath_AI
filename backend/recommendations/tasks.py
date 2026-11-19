from celery import shared_task
from . import ml

@shared_task
def train_model_task():
    return ml.train()
