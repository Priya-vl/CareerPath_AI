from django.urls import path
from . import views
urlpatterns = [path("dashboard", views.DashboardView.as_view()),
               path("parent/children", views.ParentChildren.as_view()),
               path("teacher/students", views.TeacherStudents.as_view())]
