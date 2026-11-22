import re
from datetime import timedelta

import graphene
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from django.db.models import Count, Q
from django.utils import timezone
from graphene_django import DjangoObjectType
from graphql import GraphQLError

from accounts.schema import require_user

from .models import Activity, Capture, Discussion, Link, Person, Project, Subtask, Task

STATUS_LABELS = dict(Task.STATUSES)
PRIORITY_LABELS = dict(Task.PRIORITIES)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def clean(text):
    return " ".join((text or "").split())


def get_owned(model, user, pk, label):
    if pk in (None, ""):
        return None
    try:
        return model.objects.get(pk=pk, owner=user)
    except (model.DoesNotExist, ValueError, TypeError):
        raise GraphQLError(f"{label} not found.")


def get_or_create_person(user, name):
    name = clean(name)[:150]
    if not name:
        return None
    person = Person.objects.filter(owner=user, name__iexact=name).first()
    return person or Person.objects.create(owner=user, name=name)


def get_or_create_project(user, name):
    name = clean(name)[:120]
    if not name:
        return None
    project = Project.objects.filter(owner=user, name__iexact=name).first()
    if project:
        return project
    color = Project.COLORS[Project.objects.filter(owner=user).count() % len(Project.COLORS)]
    return Project.objects.create(owner=user, name=name, color=color)


def resolve_people(user, ids, names):
    people = []
    if ids:
        found = {str(p.pk): p for p in Person.objects.filter(owner=user, pk__in=ids)}
        people.extend(found[str(i)] for i in ids if str(i) in found)
    for name in names or []:
        person = get_or_create_person(user, name)
        if person and person not in people:
            people.append(person)
    return people


def normalize_url(url):
    url = (url or "").strip()
    if url and not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", url):
        url = "https://" + url
    try:
        URLValidator()(url)
    except ValidationError:
        raise GraphQLError(f"'{url}' doesn't look like a valid link.")
    return url


def today_or(value):
    return value or timezone.localdate()


def log(task, message, kind="change"):
    Activity.objects.create(task=task, kind=kind, message=message)


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------
class ProjectType(DjangoObjectType):
    open_task_count = graphene.Int(required=True)
    done_task_count = graphene.Int(required=True)

    class Meta:
        model = Project
        fields = ("id", "name", "description", "color", "archived", "created_at")

    def resolve_open_task_count(self, info):
        if hasattr(self, "_open"):
            return self._open
        return self.tasks.filter(status__in=Task.OPEN_STATUSES).count()

    def resolve_done_task_count(self, info):
        if hasattr(self, "_done"):
            return self._done
        return self.tasks.filter(status="done").count()


class PersonType(DjangoObjectType):
    open_task_count = graphene.Int(required=True)
    open_tasks = graphene.List(graphene.NonNull(lambda: TaskType), required=True)
    done_tasks = graphene.List(graphene.NonNull(lambda: TaskType), required=True)
    requested_open_tasks = graphene.List(graphene.NonNull(lambda: TaskType), required=True)
    recent_discussions = graphene.List(graphene.NonNull(lambda: DiscussionType), required=True)
    initials = graphene.String(required=True)

    class Meta:
        model = Person
        fields = ("id", "name", "email", "phone", "role", "organization", "notes", "created_at", "updated_at")

    def resolve_initials(self, info):
        parts = self.name.split()
        return "".join(p[0] for p in parts[:2]).upper() or "?"

    def resolve_open_task_count(self, info):
        if hasattr(self, "_open"):
            return self._open
        return self.tasks.filter(status__in=Task.OPEN_STATUSES).count()

    def resolve_open_tasks(self, info):
        return self.tasks.filter(status__in=Task.OPEN_STATUSES).select_related("project", "requested_by")

    def resolve_done_tasks(self, info):
        return self.tasks.filter(status="done").order_by("-completed_at")[:20]

    def resolve_requested_open_tasks(self, info):
        return self.requested_tasks.filter(status__in=Task.OPEN_STATUSES)

    def resolve_recent_discussions(self, info):
        return self.discussions.all()[:10]


class SubtaskType(DjangoObjectType):
    class Meta:
        model = Subtask
        fields = ("id", "title", "done", "position", "created_at")


class LinkType(DjangoObjectType):
    class Meta:
        model = Link
        fields = ("id", "title", "url", "created_at")


class ActivityType(DjangoObjectType):
    class Meta:
        model = Activity
        fields = ("id", "kind", "message", "created_at")
        convert_choices_to_enum = False


class TaskType(DjangoObjectType):
    status_label = graphene.String(required=True)
    priority_label = graphene.String(required=True)
    is_open = graphene.Boolean(required=True)

    class Meta:
        model = Task
        fields = (
            "id", "title", "description", "status", "priority", "due_date", "people", "requested_by",
            "project", "discussion", "pinned", "completed_at", "created_at", "updated_at",
            "subtasks", "links", "activities",
        )
        convert_choices_to_enum = False

    def resolve_status_label(self, info):
        return STATUS_LABELS.get(self.status, self.status)

    def resolve_priority_label(self, info):
        return PRIORITY_LABELS.get(self.priority, self.priority)

    def resolve_is_open(self, info):
        return self.is_open


class CaptureType(DjangoObjectType):
    class Meta:
        model = Capture
        fields = ("id", "text", "discussion", "state", "task", "created_at", "processed_at")
        convert_choices_to_enum = False


class DiscussionType(DjangoObjectType):
    raw_capture_count = graphene.Int(required=True)
    open_task_count = graphene.Int(required=True)
    kind_label = graphene.String(required=True)

    class Meta:
        model = Discussion
        fields = (
            "id", "title", "kind", "occurred_at", "participants", "project", "rough_notes", "summary",
            "created_at", "updated_at", "tasks", "links", "captures",
        )
        convert_choices_to_enum = False

    def resolve_kind_label(self, info):
        return dict(Discussion.KINDS).get(self.kind, self.kind)

    def resolve_raw_capture_count(self, info):
        if hasattr(self, "_raw"):
            return self._raw
        return self.captures.filter(state="raw").count()

    def resolve_open_task_count(self, info):
        if hasattr(self, "_open"):
            return self._open
        return self.tasks.filter(status__in=Task.OPEN_STATUSES).count()


class DashboardType(graphene.ObjectType):
    today = graphene.Date(required=True)
    focus = graphene.List(graphene.NonNull(TaskType), required=True)
    overdue = graphene.List(graphene.NonNull(TaskType), required=True)
    due_today = graphene.List(graphene.NonNull(TaskType), required=True)
    upcoming = graphene.List(graphene.NonNull(TaskType), required=True)
    in_progress = graphene.List(graphene.NonNull(TaskType), required=True)
    waiting = graphene.List(graphene.NonNull(TaskType), required=True)
    no_due_date_count = graphene.Int(required=True)
    open_count = graphene.Int(required=True)
    done_this_week = graphene.Int(required=True)
    done_today = graphene.Int(required=True)
    inbox_count = graphene.Int(required=True)
    recent_discussions = graphene.List(graphene.NonNull(DiscussionType), required=True)


class SearchResultType(graphene.ObjectType):
    tasks = graphene.List(graphene.NonNull(TaskType), required=True)
    people = graphene.List(graphene.NonNull(PersonType), required=True)
    discussions = graphene.List(graphene.NonNull(DiscussionType), required=True)
    captures = graphene.List(graphene.NonNull(CaptureType), required=True)
    projects = graphene.List(graphene.NonNull(ProjectType), required=True)


TASK_RELATED = ("project", "requested_by", "discussion")
TASK_PREFETCH = ("people", "subtasks", "links")


def task_qs(user):
    return Task.objects.filter(owner=user).select_related(*TASK_RELATED).prefetch_related(*TASK_PREFETCH)


# ---------------------------------------------------------------------------
# Queries
# ---------------------------------------------------------------------------
class Query(graphene.ObjectType):
    dashboard = graphene.Field(DashboardType, required=True, today=graphene.Date())
    tasks = graphene.List(
        graphene.NonNull(TaskType),
        required=True,
        status=graphene.String(description="open (default) | all | done | todo | in_progress | waiting | cancelled"),
        priority=graphene.String(),
        person_id=graphene.ID(),
        project_id=graphene.ID(),
        discussion_id=graphene.ID(),
        due=graphene.String(description="overdue | today | week | upcoming | none"),
        search=graphene.String(),
        today=graphene.Date(),
        limit=graphene.Int(),
    )
    task = graphene.Field(TaskType, id=graphene.ID(required=True))
    people = graphene.List(graphene.NonNull(PersonType), required=True, search=graphene.String(), limit=graphene.Int())
    person = graphene.Field(PersonType, id=graphene.ID(required=True))
    projects = graphene.List(graphene.NonNull(ProjectType), required=True, include_archived=graphene.Boolean())
    project = graphene.Field(ProjectType, id=graphene.ID(required=True))
    discussions = graphene.List(
        graphene.NonNull(DiscussionType), required=True, search=graphene.String(), project_id=graphene.ID(),
        person_id=graphene.ID(), limit=graphene.Int(),
    )
    discussion = graphene.Field(DiscussionType, id=graphene.ID(required=True))
    captures = graphene.List(
        graphene.NonNull(CaptureType), required=True, state=graphene.String(), discussion_id=graphene.ID(),
        standalone=graphene.Boolean(description="Only captures not attached to a discussion"),
    )
    search = graphene.Field(SearchResultType, required=True, q=graphene.String(required=True))

    def resolve_dashboard(root, info, today=None):
        user = require_user(info)
        today = today_or(today)
        open_qs = task_qs(user).filter(status__in=Task.OPEN_STATUSES)
        week_start = today - timedelta(days=today.weekday())
        done = Task.objects.filter(owner=user, status="done", completed_at__isnull=False)
        discussions = (
            Discussion.objects.filter(owner=user)
            .prefetch_related("participants")
            .annotate(_raw=Count("captures", filter=Q(captures__state="raw"), distinct=True))[:5]
        )
        return DashboardType(
            today=today,
            focus=list(open_qs.filter(pinned=True)),
            overdue=list(open_qs.filter(due_date__lt=today)),
            due_today=list(open_qs.filter(due_date=today)),
            upcoming=list(open_qs.filter(due_date__gt=today, due_date__lte=today + timedelta(days=7))),
            in_progress=list(open_qs.filter(status="in_progress")[:10]),
            waiting=list(open_qs.filter(status="waiting")[:10]),
            no_due_date_count=open_qs.filter(due_date__isnull=True).count(),
            open_count=open_qs.count(),
            done_this_week=done.filter(completed_at__date__gte=week_start).count(),
            done_today=done.filter(completed_at__date=today).count(),
            inbox_count=Capture.objects.filter(owner=user, state="raw").count(),
            recent_discussions=list(discussions),
        )

    def resolve_tasks(root, info, status="open", priority=None, person_id=None, project_id=None,
                      discussion_id=None, due=None, search=None, today=None, limit=None):
        user = require_user(info)
        today = today_or(today)
        qs = task_qs(user)
        status = status or "open"
        if status == "open":
            qs = qs.filter(status__in=Task.OPEN_STATUSES)
        elif status != "all":
            qs = qs.filter(status=status)
        if priority:
            qs = qs.filter(priority=priority)
        if person_id:
            qs = qs.filter(Q(people__id=person_id) | Q(requested_by_id=person_id))
        if project_id:
            qs = qs.filter(project_id=project_id)
        if discussion_id:
            qs = qs.filter(discussion_id=discussion_id)
        if due == "overdue":
            qs = qs.filter(due_date__lt=today)
        elif due == "today":
            qs = qs.filter(due_date=today)
        elif due == "week":
            qs = qs.filter(due_date__gte=today, due_date__lte=today + timedelta(days=7))
        elif due == "upcoming":
            qs = qs.filter(due_date__gt=today)
        elif due == "none":
            qs = qs.filter(due_date__isnull=True)
        if search:
            s = search.strip()
            qs = qs.filter(Q(title__icontains=s) | Q(description__icontains=s) | Q(people__name__icontains=s))
        qs = qs.distinct()
        if status == "done":
            qs = qs.order_by("-completed_at")
        return qs[:limit] if limit else qs

    def resolve_task(root, info, id):
        user = require_user(info)
        return task_qs(user).prefetch_related("activities").filter(pk=id).first()

    def resolve_people(root, info, search=None, limit=None):
        user = require_user(info)
        qs = Person.objects.filter(owner=user).annotate(
            _open=Count("tasks", filter=Q(tasks__status__in=Task.OPEN_STATUSES), distinct=True)
        )
        if search:
            s = search.strip()
            qs = qs.filter(Q(name__icontains=s) | Q(email__icontains=s) | Q(role__icontains=s) | Q(organization__icontains=s))
        return qs[:limit] if limit else qs

    def resolve_person(root, info, id):
        user = require_user(info)
        return Person.objects.filter(owner=user, pk=id).first()

    def resolve_projects(root, info, include_archived=False):
        user = require_user(info)
        qs = Project.objects.filter(owner=user).annotate(
            _open=Count("tasks", filter=Q(tasks__status__in=Task.OPEN_STATUSES), distinct=True),
            _done=Count("tasks", filter=Q(tasks__status="done"), distinct=True),
        )
        if not include_archived:
            qs = qs.filter(archived=False)
        return qs

    def resolve_project(root, info, id):
        user = require_user(info)
        return Project.objects.filter(owner=user, pk=id).first()

    def resolve_discussions(root, info, search=None, project_id=None, person_id=None, limit=None):
        user = require_user(info)
        qs = (
            Discussion.objects.filter(owner=user)
            .select_related("project")
            .prefetch_related("participants")
            .annotate(
                _raw=Count("captures", filter=Q(captures__state="raw"), distinct=True),
                _open=Count("tasks", filter=Q(tasks__status__in=Task.OPEN_STATUSES), distinct=True),
            )
        )
        if search:
            s = search.strip()
            qs = qs.filter(Q(title__icontains=s) | Q(rough_notes__icontains=s) | Q(summary__icontains=s))
        if project_id:
            qs = qs.filter(project_id=project_id)
        if person_id:
            qs = qs.filter(participants__id=person_id)
        return qs[:limit] if limit else qs

    def resolve_discussion(root, info, id):
        user = require_user(info)
        return Discussion.objects.filter(owner=user, pk=id).first()

    def resolve_captures(root, info, state="raw", discussion_id=None, standalone=False):
        user = require_user(info)
        qs = Capture.objects.filter(owner=user).select_related("discussion", "task")
        if state and state != "all":
            qs = qs.filter(state=state)
        if discussion_id:
            qs = qs.filter(discussion_id=discussion_id)
        if standalone:
            qs = qs.filter(discussion__isnull=True)
        return qs

    def resolve_search(root, info, q):
        user = require_user(info)
        q = q.strip()
        if not q:
            return SearchResultType(tasks=[], people=[], discussions=[], captures=[], projects=[])
        return SearchResultType(
            tasks=list(task_qs(user).filter(Q(title__icontains=q) | Q(description__icontains=q)).distinct()[:8]),
            people=list(Person.objects.filter(owner=user).filter(
                Q(name__icontains=q) | Q(email__icontains=q) | Q(role__icontains=q) | Q(organization__icontains=q))[:5]),
            discussions=list(Discussion.objects.filter(owner=user).filter(
                Q(title__icontains=q) | Q(rough_notes__icontains=q) | Q(summary__icontains=q))[:5]),
            captures=list(Capture.objects.filter(owner=user, state="raw", text__icontains=q)[:5]),
            projects=list(Project.objects.filter(owner=user, name__icontains=q)[:4]),
        )


# ---------------------------------------------------------------------------
# Inputs
# ---------------------------------------------------------------------------
class LinkInput(graphene.InputObjectType):
    url = graphene.String(required=True)
    title = graphene.String()


class TaskInput(graphene.InputObjectType):
    title = graphene.String(required=True)
    description = graphene.String()
    status = graphene.String()
    priority = graphene.String()
    due_date = graphene.Date()
    people_ids = graphene.List(graphene.NonNull(graphene.ID))
    people_names = graphene.List(graphene.NonNull(graphene.String), description="Created if they don't exist")
    requested_by_id = graphene.ID()
    requested_by_name = graphene.String()
    project_id = graphene.ID()
    project_name = graphene.String()
    discussion_id = graphene.ID()
    pinned = graphene.Boolean()
    subtasks = graphene.List(graphene.NonNull(graphene.String), description="Only used when creating")
    links = graphene.List(graphene.NonNull(LinkInput), description="Only used when creating")


class PersonInput(graphene.InputObjectType):
    name = graphene.String(required=True)
    email = graphene.String()
    phone = graphene.String()
    role = graphene.String()
    organization = graphene.String()
    notes = graphene.String()


class ProjectInput(graphene.InputObjectType):
    name = graphene.String(required=True)
    description = graphene.String()
    color = graphene.String()
    archived = graphene.Boolean()


class DiscussionInput(graphene.InputObjectType):
    title = graphene.String(required=True)
    kind = graphene.String()
    occurred_at = graphene.DateTime()
    participant_ids = graphene.List(graphene.NonNull(graphene.ID))
    participant_names = graphene.List(graphene.NonNull(graphene.String))
    project_id = graphene.ID()
    project_name = graphene.String()
    rough_notes = graphene.String()
    summary = graphene.String()


def set_status(task, status):
    if status not in STATUS_LABELS:
        raise GraphQLError("Unknown status.")
    if task.status == status:
        return False
    old = task.status
    task.status = status
    if status == "done":
        task.completed_at = timezone.now()
        task.pinned = False
    elif old == "done":
        task.completed_at = None
    log(task, f"Status: {STATUS_LABELS[old]} → {STATUS_LABELS[status]}")
    return True


def apply_task_input(task, data, user, creating):
    """Apply TaskInput. Only fields present in the input are changed when updating."""
    changes = []
    has = (lambda key: True) if creating else (lambda key: key in data)

    title = clean(data.get("title"))
    if not title:
        raise GraphQLError("A task needs a title.")
    if not creating and title != task.title:
        changes.append(f"Renamed to “{title}”")
    task.title = title[:300]

    if has("description"):
        task.description = (data.get("description") or "").strip()

    if has("priority"):
        priority = data.get("priority") or "medium"
        if priority not in PRIORITY_LABELS:
            raise GraphQLError("Unknown priority.")
        if not creating and priority != task.priority:
            changes.append(f"Priority: {PRIORITY_LABELS[task.priority]} → {PRIORITY_LABELS[priority]}")
        task.priority = priority

    if has("due_date"):
        due = data.get("due_date")
        if not creating and due != task.due_date:
            changes.append(f"Due date: {task.due_date or 'none'} → {due or 'none'}")
        task.due_date = due

    if has("requested_by_name") or has("requested_by_id"):
        if data.get("requested_by_name"):
            task.requested_by = get_or_create_person(user, data["requested_by_name"])
        else:
            task.requested_by = get_owned(Person, user, data.get("requested_by_id"), "Person")

    if has("project_name") or has("project_id"):
        if data.get("project_name"):
            task.project = get_or_create_project(user, data["project_name"])
        else:
            task.project = get_owned(Project, user, data.get("project_id"), "Project")

    if has("discussion_id"):
        task.discussion = get_owned(Discussion, user, data.get("discussion_id"), "Discussion")

    if has("pinned"):
        task.pinned = bool(data.get("pinned"))

    if creating:
        task.owner = user
        status = data.get("status") or "todo"
        if status not in STATUS_LABELS:
            raise GraphQLError("Unknown status.")
        task.status = status
        if status == "done":
            task.completed_at = timezone.now()
        task.save()
    else:
        if has("status") and data.get("status"):
            set_status(task, data["status"])
        task.save()

    if "people_ids" in data or "people_names" in data:
        people = resolve_people(user, data.get("people_ids") or [], data.get("people_names") or [])
        before = set(task.people.values_list("pk", flat=True)) if not creating else set()
        task.people.set(people)
        after = {p.pk for p in people}
        if not creating and before != after:
            changes.append("People: " + (", ".join(p.name for p in people) or "none"))

    if creating:
        for i, sub in enumerate(data.get("subtasks") or []):
            if clean(sub):
                Subtask.objects.create(task=task, title=clean(sub)[:300], position=i)
        for link in data.get("links") or []:
            Link.objects.create(owner=user, task=task, url=normalize_url(link.get("url")), title=clean(link.get("title")))
    for message in changes:
        log(task, message)
    return task


# ---------------------------------------------------------------------------
# Task mutations
# ---------------------------------------------------------------------------
class CreateTask(graphene.Mutation):
    class Arguments:
        input = TaskInput(required=True)

    Output = TaskType

    def mutate(root, info, input):
        user = require_user(info)
        task = apply_task_input(Task(), input, user, creating=True)
        log(task, "Task created", kind="created")
        return task


class UpdateTask(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        input = TaskInput(required=True)

    Output = TaskType

    def mutate(root, info, id, input):
        user = require_user(info)
        task = get_owned(Task, user, id, "Task")
        return apply_task_input(task, input, user, creating=False)


class SetTaskStatus(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        status = graphene.String(required=True)

    Output = TaskType

    def mutate(root, info, id, status):
        user = require_user(info)
        task = get_owned(Task, user, id, "Task")
        if set_status(task, status):
            task.save()
        return task


class ToggleTaskPin(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)

    Output = TaskType

    def mutate(root, info, id):
        user = require_user(info)
        task = get_owned(Task, user, id, "Task")
        task.pinned = not task.pinned
        task.save(update_fields=["pinned", "updated_at"])
        log(task, "Added to Today's focus" if task.pinned else "Removed from Today's focus")
        return task


class DeleteTask(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)

    ok = graphene.Boolean(required=True)

    def mutate(root, info, id):
        user = require_user(info)
        get_owned(Task, user, id, "Task").delete()
        return DeleteTask(ok=True)


class AddTaskNote(graphene.Mutation):
    class Arguments:
        task_id = graphene.ID(required=True)
        message = graphene.String(required=True)

    Output = ActivityType

    def mutate(root, info, task_id, message):
        user = require_user(info)
        task = get_owned(Task, user, task_id, "Task")
        message = (message or "").strip()
        if not message:
            raise GraphQLError("Note is empty.")
        task.save(update_fields=["updated_at"])
        return Activity.objects.create(task=task, kind="note", message=message)


class DeleteActivity(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)

    ok = graphene.Boolean(required=True)

    def mutate(root, info, id):
        user = require_user(info)
        Activity.objects.filter(pk=id, task__owner=user, kind="note").delete()
        return DeleteActivity(ok=True)


class AddSubtask(graphene.Mutation):
    class Arguments:
        task_id = graphene.ID(required=True)
        title = graphene.String(required=True)

    Output = SubtaskType

    def mutate(root, info, task_id, title):
        user = require_user(info)
        task = get_owned(Task, user, task_id, "Task")
        title = clean(title)
        if not title:
            raise GraphQLError("Checklist item is empty.")
        position = task.subtasks.count()
        return Subtask.objects.create(task=task, title=title[:300], position=position)


class UpdateSubtask(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        title = graphene.String()
        done = graphene.Boolean()

    Output = SubtaskType

    def mutate(root, info, id, title=None, done=None):
        user = require_user(info)
        sub = Subtask.objects.filter(pk=id, task__owner=user).first()
        if not sub:
            raise GraphQLError("Checklist item not found.")
        if title is not None and clean(title):
            sub.title = clean(title)[:300]
        if done is not None:
            sub.done = done
            if done:
                log(sub.task, f"Checked off: {sub.title}")
        sub.save()
        return sub


class DeleteSubtask(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)

    ok = graphene.Boolean(required=True)

    def mutate(root, info, id):
        user = require_user(info)
        Subtask.objects.filter(pk=id, task__owner=user).delete()
        return DeleteSubtask(ok=True)


class AddLink(graphene.Mutation):
    class Arguments:
        url = graphene.String(required=True)
        title = graphene.String()
        task_id = graphene.ID()
        discussion_id = graphene.ID()

    Output = LinkType

    def mutate(root, info, url, title="", task_id=None, discussion_id=None):
        user = require_user(info)
        task = get_owned(Task, user, task_id, "Task")
        discussion = get_owned(Discussion, user, discussion_id, "Discussion")
        if not task and not discussion:
            raise GraphQLError("A link must belong to a task or discussion.")
        link = Link.objects.create(
            owner=user, task=task, discussion=discussion, url=normalize_url(url), title=clean(title)[:200]
        )
        if task:
            log(task, f"Resource added: {link.title or link.url}")
        return link


class DeleteLink(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)

    ok = graphene.Boolean(required=True)

    def mutate(root, info, id):
        user = require_user(info)
        Link.objects.filter(pk=id, owner=user).delete()
        return DeleteLink(ok=True)


# ---------------------------------------------------------------------------
# People & projects
# ---------------------------------------------------------------------------
def apply_person(person, data):
    name = clean(data.get("name"))[:150]
    if not name:
        raise GraphQLError("Name is required.")
    clash = Person.objects.filter(owner=person.owner, name__iexact=name).exclude(pk=person.pk).exists()
    if clash:
        raise GraphQLError(f"You already have someone called {name}.")
    person.name = name
    for field in ("email", "phone", "role", "organization", "notes"):
        if field in data:
            setattr(person, field, (data.get(field) or "").strip())
    person.save()
    return person


class GetOrCreatePerson(graphene.Mutation):
    class Arguments:
        name = graphene.String(required=True)

    Output = PersonType

    def mutate(root, info, name):
        user = require_user(info)
        person = get_or_create_person(user, name)
        if not person:
            raise GraphQLError("Name is required.")
        return person


class CreatePerson(graphene.Mutation):
    class Arguments:
        input = PersonInput(required=True)

    Output = PersonType

    def mutate(root, info, input):
        return apply_person(Person(owner=require_user(info)), input)


class UpdatePerson(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        input = PersonInput(required=True)

    Output = PersonType

    def mutate(root, info, id, input):
        user = require_user(info)
        return apply_person(get_owned(Person, user, id, "Person"), input)


class DeletePerson(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)

    ok = graphene.Boolean(required=True)

    def mutate(root, info, id):
        user = require_user(info)
        get_owned(Person, user, id, "Person").delete()
        return DeletePerson(ok=True)


def apply_project(project, data):
    name = clean(data.get("name"))[:120]
    if not name:
        raise GraphQLError("Project name is required.")
    if Project.objects.filter(owner=project.owner, name__iexact=name).exclude(pk=project.pk).exists():
        raise GraphQLError(f"A project called {name} already exists.")
    project.name = name
    if "description" in data:
        project.description = (data.get("description") or "").strip()
    if data.get("color") in Project.COLORS:
        project.color = data["color"]
    if "archived" in data and data.get("archived") is not None:
        project.archived = bool(data["archived"])
    project.save()
    return project


class CreateProject(graphene.Mutation):
    class Arguments:
        input = ProjectInput(required=True)

    Output = ProjectType

    def mutate(root, info, input):
        return apply_project(Project(owner=require_user(info)), input)


class UpdateProject(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        input = ProjectInput(required=True)

    Output = ProjectType

    def mutate(root, info, id, input):
        user = require_user(info)
        return apply_project(get_owned(Project, user, id, "Project"), input)


class DeleteProject(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)

    ok = graphene.Boolean(required=True)

    def mutate(root, info, id):
        user = require_user(info)
        get_owned(Project, user, id, "Project").delete()
        return DeleteProject(ok=True)


# ---------------------------------------------------------------------------
# Discussions
# ---------------------------------------------------------------------------
def apply_discussion(discussion, data, user, creating):
    title = clean(data.get("title"))[:200]
    if not title:
        raise GraphQLError("Give the discussion a title.")
    discussion.title = title
    has = (lambda key: True) if creating else (lambda key: key in data)
    if has("kind"):
        kind = data.get("kind") or "meeting"
        if kind not in dict(Discussion.KINDS):
            raise GraphQLError("Unknown discussion type.")
        discussion.kind = kind
    if data.get("occurred_at"):
        discussion.occurred_at = data["occurred_at"]
    if has("project_id") or has("project_name"):
        if data.get("project_name"):
            discussion.project = get_or_create_project(user, data["project_name"])
        else:
            discussion.project = get_owned(Project, user, data.get("project_id"), "Project")
    if has("rough_notes"):
        discussion.rough_notes = data.get("rough_notes") or ""
    if has("summary"):
        discussion.summary = data.get("summary") or ""
    discussion.save()
    if "participant_ids" in data or "participant_names" in data:
        discussion.participants.set(
            resolve_people(user, data.get("participant_ids") or [], data.get("participant_names") or [])
        )
    return discussion


class CreateDiscussion(graphene.Mutation):
    class Arguments:
        input = DiscussionInput(required=True)

    Output = DiscussionType

    def mutate(root, info, input):
        user = require_user(info)
        return apply_discussion(Discussion(owner=user), input, user, creating=True)


class UpdateDiscussion(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        input = DiscussionInput(required=True)

    Output = DiscussionType

    def mutate(root, info, id, input):
        user = require_user(info)
        return apply_discussion(get_owned(Discussion, user, id, "Discussion"), input, user, creating=False)


class SaveRoughNotes(graphene.Mutation):
    """Lightweight autosave for the notes pad while you type."""

    class Arguments:
        id = graphene.ID(required=True)
        rough_notes = graphene.String(required=True)

    Output = DiscussionType

    def mutate(root, info, id, rough_notes):
        user = require_user(info)
        discussion = get_owned(Discussion, user, id, "Discussion")
        discussion.rough_notes = rough_notes
        discussion.save(update_fields=["rough_notes", "updated_at"])
        return discussion


class DeleteDiscussion(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)

    ok = graphene.Boolean(required=True)

    def mutate(root, info, id):
        user = require_user(info)
        get_owned(Discussion, user, id, "Discussion").delete()
        return DeleteDiscussion(ok=True)


ACTION_LINE = re.compile(r"^\s*(?:[-*•]\s*)?(?:\[\s?\]|todo\s*[:\-]?|action\s*[:\-]?|ai\s*:|->|=>|>>)\s*(.+)$", re.I)


class ExtractActions(graphene.Mutation):
    """Turn action-looking lines in the rough notes into captures to organize."""

    class Arguments:
        discussion_id = graphene.ID(required=True)

    created = graphene.Int(required=True)
    discussion = graphene.Field(DiscussionType, required=True)

    def mutate(root, info, discussion_id):
        user = require_user(info)
        discussion = get_owned(Discussion, user, discussion_id, "Discussion")
        existing = {c.text.strip().lower() for c in discussion.captures.all()}
        created = 0
        for line in discussion.rough_notes.splitlines():
            match = ACTION_LINE.match(line)
            if not match:
                continue
            text = match.group(1).strip()
            if text and text.lower() not in existing:
                Capture.objects.create(owner=user, discussion=discussion, text=text)
                existing.add(text.lower())
                created += 1
        return ExtractActions(created=created, discussion=discussion)


# ---------------------------------------------------------------------------
# Captures (quick rough notes)
# ---------------------------------------------------------------------------
class AddCapture(graphene.Mutation):
    class Arguments:
        text = graphene.String(required=True)
        discussion_id = graphene.ID()

    Output = CaptureType

    def mutate(root, info, text, discussion_id=None):
        user = require_user(info)
        text = (text or "").strip()
        if not text:
            raise GraphQLError("Note is empty.")
        discussion = get_owned(Discussion, user, discussion_id, "Discussion")
        return Capture.objects.create(owner=user, text=text, discussion=discussion)


class UpdateCapture(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        text = graphene.String()
        state = graphene.String()

    Output = CaptureType

    def mutate(root, info, id, text=None, state=None):
        user = require_user(info)
        capture = get_owned(Capture, user, id, "Note")
        if text is not None and text.strip():
            capture.text = text.strip()
        if state:
            if state not in dict(Capture.STATES):
                raise GraphQLError("Unknown state.")
            capture.state = state
            capture.processed_at = None if state == "raw" else timezone.now()
        capture.save()
        return capture


class DeleteCapture(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)

    ok = graphene.Boolean(required=True)

    def mutate(root, info, id):
        user = require_user(info)
        get_owned(Capture, user, id, "Note").delete()
        return DeleteCapture(ok=True)


class ConvertCapture(graphene.Mutation):
    """Organize a rough note into a clear task."""

    class Arguments:
        id = graphene.ID(required=True)
        input = TaskInput(required=True)

    Output = TaskType

    def mutate(root, info, id, input):
        user = require_user(info)
        capture = get_owned(Capture, user, id, "Note")
        if not input.get("discussion_id") and capture.discussion_id:
            input["discussion_id"] = capture.discussion_id
        task = apply_task_input(Task(), input, user, creating=True)
        log(task, f"Organized from rough note: “{capture.text}”", kind="created")
        capture.state = "converted"
        capture.task = task
        capture.processed_at = timezone.now()
        capture.save()
        return task


class Mutation(graphene.ObjectType):
    create_task = CreateTask.Field()
    update_task = UpdateTask.Field()
    set_task_status = SetTaskStatus.Field()
    toggle_task_pin = ToggleTaskPin.Field()
    delete_task = DeleteTask.Field()
    add_task_note = AddTaskNote.Field()
    delete_activity = DeleteActivity.Field()
    add_subtask = AddSubtask.Field()
    update_subtask = UpdateSubtask.Field()
    delete_subtask = DeleteSubtask.Field()
    add_link = AddLink.Field()
    delete_link = DeleteLink.Field()

    get_or_create_person = GetOrCreatePerson.Field()
    create_person = CreatePerson.Field()
    update_person = UpdatePerson.Field()
    delete_person = DeletePerson.Field()

    create_project = CreateProject.Field()
    update_project = UpdateProject.Field()
    delete_project = DeleteProject.Field()

    create_discussion = CreateDiscussion.Field()
    update_discussion = UpdateDiscussion.Field()
    save_rough_notes = SaveRoughNotes.Field()
    delete_discussion = DeleteDiscussion.Field()
    extract_actions = ExtractActions.Field()

    add_capture = AddCapture.Field()
    update_capture = UpdateCapture.Field()
    delete_capture = DeleteCapture.Field()
    convert_capture = ConvertCapture.Field()
