from .models import AuthToken


def get_bearer(request):
    header = request.META.get("HTTP_AUTHORIZATION", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    return None


class BearerTokenMiddleware:
    """Sets request.user from an `Authorization: Bearer <token>` header."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        raw = get_bearer(request)
        if raw:
            user = AuthToken.authenticate(raw)
            if user:
                request.user = user
        return self.get_response(request)
