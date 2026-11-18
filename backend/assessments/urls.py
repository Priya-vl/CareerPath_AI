from django.urls import path
from . import views
urlpatterns = [
    path("assessment/start", views.StartView.as_view()),
    path("assessment/submit", views.SubmitView.as_view()),
    path("assessment/results", views.ResultsView.as_view()),
]
