from django.urls import path
from . import views
urlpatterns = [path("recommendations/feedback", views.FeedbackView.as_view()),
               path("recommendations/generate", views.GenerateView.as_view()),
               path("recommendations", views.ListView.as_view())]
