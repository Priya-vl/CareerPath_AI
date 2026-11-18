from django.db import models
from django.conf import settings

class Roadmap(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="roadmaps")
    career = models.ForeignKey("careers.Career", on_delete=models.CASCADE)
    weeks = models.PositiveSmallIntegerField()
    goal = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

class RoadmapItem(models.Model):
    roadmap = models.ForeignKey(Roadmap, on_delete=models.CASCADE, related_name="items")
    week = models.PositiveSmallIntegerField()
    skill = models.CharField(max_length=100)
    topic = models.CharField(max_length=200)
    resources = models.TextField()
    practice = models.TextField()
    project = models.TextField(blank=True)
    expected_outcome = models.TextField()
    completed = models.BooleanField(default=False)
    class Meta:
        ordering = ["week"]
