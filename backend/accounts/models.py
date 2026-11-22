import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


def _hash(raw):
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class AuthToken(models.Model):
    """API token for one signed-in device. Only the SHA-256 hash is stored."""

    key_hash = models.CharField(max_length=64, unique=True, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="auth_tokens")
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Token for {self.user} ({self.created_at:%Y-%m-%d})"

    @classmethod
    def issue(cls, user):
        raw = secrets.token_urlsafe(40)
        cls.objects.create(user=user, key_hash=_hash(raw))
        return raw

    @classmethod
    def authenticate(cls, raw):
        if not raw:
            return None
        token = cls.objects.select_related("user").filter(key_hash=_hash(raw)).first()
        if not token or not token.user.is_active:
            return None
        if token.created_at < timezone.now() - timedelta(days=settings.TOKEN_TTL_DAYS):
            token.delete()
            return None
        now = timezone.now()
        if not token.last_used_at or now - token.last_used_at > timedelta(minutes=5):
            cls.objects.filter(pk=token.pk).update(last_used_at=now)
        return token.user

    @classmethod
    def revoke(cls, raw):
        cls.objects.filter(key_hash=_hash(raw)).delete()
