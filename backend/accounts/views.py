import logging
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from config.celery import run
from .tasks import send_reset_email

log = logging.getLogger(__name__)
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
    email = serializers.EmailField(required=True)
    def validate_email(self, v):
        if User.objects.filter(email__iexact=v).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return v
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

class EmailOrUsernameSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        u = attrs.get("username", "")
        if "@" in u:
            m = User.objects.filter(email__iexact=u).first()
            if m: attrs["username"] = m.username
        return super().validate(attrs)

class LoginView(TokenObtainPairView):
    serializer_class = EmailOrUsernameSerializer
    throttle_classes = [ScopedRateThrottle]; throttle_scope = "auth"
    def post(self, request, *a, **kw):
        resp = super().post(request, *a, **kw)
        if resp.status_code == 200:
            ident = str(request.data.get("username", ""))
            u = User.objects.filter(Q(username=ident) | Q(email__iexact=ident)).first()
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

class PasswordResetRequestView(APIView):
    """Always answers the same way, so it can't be used to find out which emails have accounts."""
    permission_classes = []; authentication_classes = []
    throttle_classes = [ScopedRateThrottle]; throttle_scope = "auth"
    def post(self, request):
        email = str(request.data.get("email", "")).strip()
        if email:
            for u in User.objects.filter(email__iexact=email, is_active=True)[:3]:
                link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?uid={urlsafe_base64_encode(force_bytes(u.pk))}&token={default_token_generator.make_token(u)}"
                try:
                    run(send_reset_email, u.email, link)
                except Exception as e:
                    log.warning("Reset email failed: %s", type(e).__name__)
                audit(u, "password_reset_requested")
        return Response({"detail": "If an account with that email exists, a reset link has been sent."})

class PasswordResetConfirmView(APIView):
    permission_classes = []; authentication_classes = []
    throttle_classes = [ScopedRateThrottle]; throttle_scope = "auth"
    def post(self, request):
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(str(request.data.get("uid", "")))))
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None
        if not user or not default_token_generator.check_token(user, str(request.data.get("token", ""))):
            return Response({"detail": "This reset link is invalid or has expired."}, status=400)
        pw = str(request.data.get("password", ""))
        try:
            validate_password(pw, user)
        except DjangoValidationError as e:
            return Response({"detail": " ".join(e.messages)}, status=400)
        user.set_password(pw); user.save(); audit(user, "password_reset_done")
        return Response({"detail": "Password updated. You can now sign in."})
