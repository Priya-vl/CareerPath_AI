from django.urls import path
from . import views
urlpatterns = [path("pathways", views.PathwaysView.as_view()), path("careers", views.CareerList.as_view()), path("careers/<int:pk>", views.CareerDetail.as_view())]
