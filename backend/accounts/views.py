from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import User, StudentProfile, audit

PROFILE_FIELDS = ["grade", "board", "state", "subjects", "marks", "interests", "strengths", "weaknesses",
                  "activities", "learning_preferences", "career_interests"]

class RegisterSerializer(serializers.ModelSerializer):
    # Only students and parents can self-register. Teachers/counsellors are created by an admin.
    role = serializers.ChoiceField(choices=["student", "parent"], default="student")
    password = serializers.CharField(write_only=True, min_length=8)
    class Meta:
        model = User
        fields = ["username", "email", "first_name", "password", "role"]
    def create(self, data):
        user = User.objects.create_user(**data)
        if user.role == "student":
            StudentProfile.objects.create(user=user)
        return user

class ProfileSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="user.first_name", required=False)
    grade = serializers.IntegerField(min_value=5, max_value=16, required=False, allow_null=True)
    marks = serializers.DictField(child=serializers.FloatField(min_value=0, max_value=100), required=False)
    class Meta:
        model = StudentProfile
        fields = ["name"] + PROFILE_FIELDS
    def update(self, inst, data):
        user_data = data.pop("user", {})
        if "first_name" in user_data:
            inst.user.first_name = user_data["first_name"]; inst.user.save()
        return super().update(inst, data)

class RegisterView(APIView):
    permission_classes = []
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]; throttle_scope = "auth"
    def post(self, request):
        s = RegisterSerializer(data=request.data); s.is_valid(raise_exception=True)
        user = s.save(); audit(user, "register")
        return Response({"id": user.id, "username": user.username, "role": user.role}, status=201)

class LoginView(TokenObtainPairView):
    throttle_classes = [ScopedRateThrottle]; throttle_scope = "auth"
    def post(self, request, *a, **kw):
        resp = super().post(request, *a, **kw)
        if resp.status_code == 200:
            u = User.objects.filter(username=request.data.get("username")).first()
            if u: audit(u, "login")
        return resp

def get_profile(user):
    return StudentProfile.objects.get_or_create(user=user)[0]

class ProfileView(APIView):
    def get(self, request):
        if request.user.role != "student":
            return Response({"detail": "Only students have a profile."}, status=403)
        return Response(ProfileSerializer(get_profile(request.user)).data)
    def put(self, request):
        if request.user.role != "student":
            return Response({"detail": "Only students have a profile."}, status=403)
        s = ProfileSerializer(get_profile(request.user), data=request.data, partial=True)
        s.is_valid(raise_exception=True); s.save(); audit(request.user, "profile_update")
        return Response(s.data)

class MeView(APIView):
    def get(self, request):
        return Response({"id": request.user.id, "username": request.user.username, "role": request.user.role})
