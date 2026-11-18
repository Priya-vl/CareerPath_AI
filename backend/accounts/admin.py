from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, StudentProfile, AuditLog
admin.site.register(User, UserAdmin)
admin.site.register(StudentProfile)
admin.site.register(AuditLog)
