from django.db import models
from django.conf import settings

class Question(models.Model):
    category = models.CharField(max_length=20)   # interest | aptitude
    dimension = models.CharField(max_length=40)
    text = models.TextField()
    options = models.JSONField(default=list)
    correct_index = models.IntegerField(null=True, blank=True)   # aptitude only

class Assessment(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assessments")
    answers = models.JSONField(default=dict)    # {question_id: chosen index}
    scores = models.JSONField(default=dict)     # {"interest": {...}, "aptitude": {...}}
    created_at = models.DateTimeField(auto_now_add=True)
