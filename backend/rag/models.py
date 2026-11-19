from django.db import models

class Document(models.Model):
    title = models.CharField(max_length=200)
    source = models.CharField(max_length=300)    # shown to users with every grounded answer
    created_at = models.DateTimeField(auto_now_add=True)

class DocumentChunk(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="chunks")
    position = models.PositiveIntegerField()
    text = models.TextField()
    embedding = models.JSONField(null=True, blank=True)       # L2-normalised vector
    embedding_model = models.CharField(max_length=120, blank=True, default="")

