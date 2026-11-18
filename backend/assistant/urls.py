from django.urls import path
from . import views
urlpatterns = [path("assistant/chat", views.ChatView.as_view()), path("rag/query", views.RagQueryView.as_view())]
