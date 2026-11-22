import graphene
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from graphql import GraphQLError

from .middleware import get_bearer
from .models import AuthToken

User = get_user_model()


class UserType(graphene.ObjectType):
    id = graphene.ID(required=True)
    email = graphene.String(required=True)
    full_name = graphene.String(required=True)
    job_title = graphene.String()
    initials = graphene.String(required=True)
    date_joined = graphene.DateTime()

    def resolve_full_name(user, info):
        return user.first_name or user.email.split("@")[0]

    def resolve_job_title(user, info):
        return user.last_name or ""

    def resolve_initials(user, info):
        name = user.first_name or user.email
        parts = [p for p in name.replace("@", " ").split() if p]
        return "".join(p[0] for p in parts[:2]).upper() or "?"


class AuthPayload(graphene.ObjectType):
    token = graphene.String(required=True)
    user = graphene.Field(UserType, required=True)


def require_user(info):
    user = info.context.user
    if not user or not user.is_authenticated:
        raise GraphQLError("Please sign in to continue.")
    return user


class Query(graphene.ObjectType):
    me = graphene.Field(UserType)

    def resolve_me(root, info):
        user = info.context.user
        return user if user and user.is_authenticated else None


class Register(graphene.Mutation):
    class Arguments:
        full_name = graphene.String(required=True)
        email = graphene.String(required=True)
        password = graphene.String(required=True)
        job_title = graphene.String()

    Output = AuthPayload

    def mutate(root, info, full_name, email, password, job_title=""):
        email = email.strip().lower()
        full_name = " ".join(full_name.split())
        if not full_name:
            raise GraphQLError("Please enter your name.")
        try:
            validate_email(email)
        except ValidationError:
            raise GraphQLError("Please enter a valid email address.")
        if User.objects.filter(email__iexact=email).exists():
            raise GraphQLError("An account with this email already exists. Try signing in.")
        candidate = User(username=email, email=email, first_name=full_name[:150])
        try:
            validate_password(password, user=candidate)
        except ValidationError as exc:
            raise GraphQLError(" ".join(exc.messages))
        candidate.last_name = (job_title or "")[:150]
        candidate.set_password(password)
        candidate.save()
        return AuthPayload(token=AuthToken.issue(candidate), user=candidate)


class Login(graphene.Mutation):
    class Arguments:
        email = graphene.String(required=True)
        password = graphene.String(required=True)

    Output = AuthPayload

    def mutate(root, info, email, password):
        email = email.strip().lower()
        account = User.objects.filter(email__iexact=email).first()
        user = authenticate(username=account.username, password=password) if account else None
        if not user:
            raise GraphQLError("Email or password is incorrect.")
        return AuthPayload(token=AuthToken.issue(user), user=user)


class Logout(graphene.Mutation):
    ok = graphene.Boolean(required=True)

    def mutate(root, info):
        raw = get_bearer(info.context)
        if raw:
            AuthToken.revoke(raw)
        return Logout(ok=True)


class UpdateProfile(graphene.Mutation):
    class Arguments:
        full_name = graphene.String(required=True)
        job_title = graphene.String()

    Output = UserType

    def mutate(root, info, full_name, job_title=None):
        user = require_user(info)
        full_name = " ".join(full_name.split())
        if not full_name:
            raise GraphQLError("Name cannot be empty.")
        user.first_name = full_name[:150]
        if job_title is not None:
            user.last_name = job_title[:150]
        user.save(update_fields=["first_name", "last_name"])
        return user


class ChangePassword(graphene.Mutation):
    class Arguments:
        current_password = graphene.String(required=True)
        new_password = graphene.String(required=True)

    ok = graphene.Boolean(required=True)

    def mutate(root, info, current_password, new_password):
        user = require_user(info)
        if not user.check_password(current_password):
            raise GraphQLError("Current password is incorrect.")
        try:
            validate_password(new_password, user=user)
        except ValidationError as exc:
            raise GraphQLError(" ".join(exc.messages))
        user.set_password(new_password)
        user.save(update_fields=["password"])
        # Sign out other devices, keep this one
        current = get_bearer(info.context)
        keep = AuthToken.objects.none()
        if current:
            from .models import _hash
            keep = AuthToken.objects.filter(key_hash=_hash(current))
        AuthToken.objects.filter(user=user).exclude(pk__in=keep.values("pk")).delete()
        return ChangePassword(ok=True)


class Mutation(graphene.ObjectType):
    register = Register.Field()
    login = Login.Field()
    logout = Logout.Field()
    update_profile = UpdateProfile.Field()
    change_password = ChangePassword.Field()
