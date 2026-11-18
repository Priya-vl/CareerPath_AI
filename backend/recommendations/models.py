from django.db import models
from django.conf import settings

class Recommendation(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="recommendations")
    career = models.ForeignKey("careers.Career", on_delete=models.CASCADE)
    match_score = models.FloatField()
    detail = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
