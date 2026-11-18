from django.db import models

class Career(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    required_subjects = models.JSONField(default=list)
    skills = models.JSONField(default=list)
    degree_options = models.JSONField(default=list)
    entrance_exams = models.JSONField(default=list)
    industries = models.JSONField(default=list)
    job_roles = models.JSONField(default=list)
    related_careers = models.JSONField(default=list)
    # {"academic": {"Mathematics": .4}, "interest": {"Technology": .4}, "aptitude": {"Logical reasoning": .2}}
    weights = models.JSONField(default=dict)
    extra = models.JSONField(default=dict, blank=True)   # extensibility hook
    def __str__(self): return self.name
