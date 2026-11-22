from django.contrib import admin

from .models import Activity, Capture, Discussion, Link, Person, Project, Subtask, Task


class SubtaskInline(admin.TabularInline):
    model = Subtask
    extra = 0


class LinkInline(admin.TabularInline):
    model = Link
    extra = 0
    fk_name = "task"


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "status", "priority", "due_date", "project")
    list_filter = ("status", "priority")
    search_fields = ("title", "description", "owner__email")
    inlines = [SubtaskInline, LinkInline]


@admin.register(Person)
class PersonAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "role", "organization", "email")
    search_fields = ("name", "email", "owner__email")


@admin.register(Discussion)
class DiscussionAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "kind", "occurred_at")
    search_fields = ("title", "rough_notes", "summary")


@admin.register(Capture)
class CaptureAdmin(admin.ModelAdmin):
    list_display = ("text", "owner", "state", "created_at")
    list_filter = ("state",)


admin.site.register(Project)
admin.site.register(Activity)
admin.site.register(Link)
