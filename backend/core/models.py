"""
Kumbuka data model. Every record belongs to one user (owner), so each account
only ever sees its own data.

  Capture     - a rough, fast note (during a meeting or anytime). Later organized.
  Task        - a clear thing to do: status, priority, due date, people, links.
  Discussion  - a meeting / call / chat. Holds rough notes, captures, tasks.
  Person      - someone a task or discussion is associated with.
  Project     - optional grouping for tasks and discussions.
"""
from django.conf import settings
from django.db import models
from django.utils import timezone

User = settings.AUTH_USER_MODEL


class Project(models.Model):
    COLORS = ["indigo", "violet", "sky", "emerald", "amber", "rose", "teal", "slate"]

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="projects")
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=20, default="indigo")
    archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["archived", "name"]
        constraints = [models.UniqueConstraint(fields=["owner", "name"], name="uniq_project_name_per_owner")]

    def __str__(self):
        return self.name


class Person(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="people")
    name = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    role = models.CharField(max_length=120, blank=True, help_text="e.g. Supervisor, Finance lead")
    organization = models.CharField(max_length=150, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["owner", "name"], name="uniq_person_name_per_owner")]

    def __str__(self):
        return self.name


class Discussion(models.Model):
    KINDS = [
        ("meeting", "Meeting"),
        ("one_on_one", "1:1"),
        ("call", "Call"),
        ("chat", "Chat"),
        ("email", "Email thread"),
        ("other", "Other"),
    ]

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="discussions")
    title = models.CharField(max_length=200)
    kind = models.CharField(max_length=20, choices=KINDS, default="meeting")
    occurred_at = models.DateTimeField(default=timezone.now)
    participants = models.ManyToManyField(Person, blank=True, related_name="discussions")
    project = models.ForeignKey(Project, null=True, blank=True, on_delete=models.SET_NULL, related_name="discussions")
    rough_notes = models.TextField(blank=True, help_text="Fast, messy notes typed during the conversation")
    summary = models.TextField(blank=True, help_text="Clean summary / decisions written afterwards")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-occurred_at"]

    def __str__(self):
        return self.title


class Task(models.Model):
    STATUSES = [
        ("todo", "To do"),
        ("in_progress", "In progress"),
        ("waiting", "Waiting on someone"),
        ("done", "Done"),
        ("cancelled", "Cancelled"),
    ]
    OPEN_STATUSES = ("todo", "in_progress", "waiting")
    PRIORITIES = [("low", "Low"), ("medium", "Medium"), ("high", "High"), ("urgent", "Urgent")]

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUSES, default="todo", db_index=True)
    priority = models.CharField(max_length=10, choices=PRIORITIES, default="medium")
    due_date = models.DateField(null=True, blank=True, db_index=True)
    people = models.ManyToManyField(Person, blank=True, related_name="tasks")
    requested_by = models.ForeignKey(
        Person, null=True, blank=True, on_delete=models.SET_NULL, related_name="requested_tasks"
    )
    project = models.ForeignKey(Project, null=True, blank=True, on_delete=models.SET_NULL, related_name="tasks")
    discussion = models.ForeignKey(
        Discussion, null=True, blank=True, on_delete=models.SET_NULL, related_name="tasks"
    )
    pinned = models.BooleanField(default=False, help_text="Shown in Today's focus")
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-pinned", models.F("due_date").asc(nulls_last=True), "-created_at"]

    def __str__(self):
        return self.title

    @property
    def is_open(self):
        return self.status in self.OPEN_STATUSES


class Subtask(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="subtasks")
    title = models.CharField(max_length=300)
    done = models.BooleanField(default=False)
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position", "id"]

    def __str__(self):
        return self.title


class Link(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="links")
    task = models.ForeignKey(Task, null=True, blank=True, on_delete=models.CASCADE, related_name="links")
    discussion = models.ForeignKey(
        Discussion, null=True, blank=True, on_delete=models.CASCADE, related_name="links"
    )
    title = models.CharField(max_length=200, blank=True)
    url = models.URLField(max_length=1000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return self.title or self.url


class Activity(models.Model):
    """History for a task: created, status changes, notes / updates you add."""

    KINDS = [("created", "Created"), ("change", "Change"), ("note", "Note")]

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="activities")
    kind = models.CharField(max_length=10, choices=KINDS, default="change")
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name_plural = "activities"


class Capture(models.Model):
    STATES = [("raw", "Needs organizing"), ("converted", "Turned into task"), ("archived", "Archived")]

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="captures")
    text = models.TextField()
    discussion = models.ForeignKey(
        Discussion, null=True, blank=True, on_delete=models.CASCADE, related_name="captures"
    )
    state = models.CharField(max_length=10, choices=STATES, default="raw", db_index=True)
    task = models.ForeignKey(Task, null=True, blank=True, on_delete=models.SET_NULL, related_name="captures")
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.text[:60]
