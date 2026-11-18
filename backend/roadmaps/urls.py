from django.urls import path
from . import views
urlpatterns = [
    path("roadmaps/generate", views.GenerateView.as_view()),
    path("roadmaps", views.ListView.as_view()),
    path("roadmaps/<int:pk>/progress", views.ProgressView.as_view()),
]
