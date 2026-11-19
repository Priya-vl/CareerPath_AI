from django.db import models
from django.conf import settings

class Recommendation(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="recommendations")
    career = models.ForeignKey("careers.Career", on_delete=models.CASCADE)
    match_score = models.FloatField()
    detail = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

class RecommendationFeedback(models.Model):
    """A student's real reaction to a suggestion. This is the only training data the ML model uses."""
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="rec_feedback")
    career = models.ForeignKey("careers.Career", on_delete=models.CASCADE)
    liked = models.BooleanField()
    features = models.JSONField(default=list)     # feature vector at the time of feedback
    created_at = models.DateTimeField(auto_now=True)
    class Meta:
        unique_together = ("student", "career")

class MLModel(models.Model):
    blob = models.BinaryField()
    meta = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
