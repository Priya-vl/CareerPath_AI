from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLES = [("student", "Student"), ("parent", "Parent"), ("teacher", "Teacher"), ("counsellor", "Counsellor")]
    role = models.CharField(max_length=12, choices=ROLES, default="student")

class StudentProfile(models.Model):
    BOARDS = [(b, b) for b in ["Karnataka", "Tamil Nadu", "CBSE", "ICSE", "IGCSE"]]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    grade = models.PositiveSmallIntegerField(null=True, blank=True)
    board = models.CharField(max_length=20, choices=BOARDS, blank=True)
    state = models.CharField(max_length=60, blank=True)
    subjects = models.JSONField(default=list, blank=True)
    marks = models.JSONField(default=dict, blank=True)          # {"Mathematics": 82, ...} percentages
    interests = models.JSONField(default=list, blank=True)
    strengths = models.JSONField(default=list, blank=True)      # also used as self-reported skills
    weaknesses = models.JSONField(default=list, blank=True)
    activities = models.JSONField(default=list, blank=True)
    learning_preferences = models.JSONField(default=list, blank=True)
    career_interests = models.JSONField(default=list, blank=True)
    # Access is granted by an admin; students cannot self-assign guardians/counsellors.
    guardians = models.ManyToManyField(User, related_name="children_profiles", blank=True)
    counsellors = models.ManyToManyField(User, related_name="assigned_profiles", blank=True)

class AuditLog(models.Model):
    actor = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=80)
    detail = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

def audit(actor, action, detail=""):
    AuditLog.objects.create(actor=actor if getattr(actor, "pk", None) else None, action=action, detail=detail[:255])
