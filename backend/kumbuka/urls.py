from django.conf import settings
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from graphene_django.views import GraphQLView


def health(_request):
    return JsonResponse({"status": "ok", "app": "kumbuka"})


urlpatterns = [
    path("admin/", admin.site.urls),
    # Token auth (Authorization: Bearer <token>) is used, not cookies, so CSRF is not needed here.
    path("graphql/", csrf_exempt(GraphQLView.as_view(graphiql=settings.DEBUG))),
    path("health/", health),
]
