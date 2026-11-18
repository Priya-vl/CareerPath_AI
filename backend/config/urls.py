from django.contrib import admin
from django.urls import path, include
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("accounts.urls")),
    path("api/", include("careers.urls")),
    path("api/", include("assessments.urls")),
    path("api/", include("recommendations.urls")),
    path("api/", include("roadmaps.urls")),
    path("api/", include("assistant.urls")),
    path("api/", include("analytics.urls")),
]
