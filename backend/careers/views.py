from rest_framework import serializers, generics, filters
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Career
from .pathways import STREAMS

class CareerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Career
        exclude = ["weights"]

class CareerList(generics.ListAPIView):
    queryset = Career.objects.all().order_by("name")
    serializer_class = CareerSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "description", "industries"]

class CareerDetail(generics.RetrieveAPIView):
    queryset = Career.objects.all()
    serializer_class = CareerSerializer

class PathwaysView(APIView):
    """Public: students can explore stream -> degree -> career before signing up."""
    permission_classes = [AllowAny]; authentication_classes = []
    def get(self, request):
        ids = dict(Career.objects.values_list("name", "id"))
        out = []
        for st in STREAMS:
            degs = [dict(d, careers=[{"id": ids[c], "name": c} for c in d["careers"] if c in ids]) for d in st["degrees"]]
            out.append(dict(st, degrees=degs))
        return Response(out)
