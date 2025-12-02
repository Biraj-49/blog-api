from django.contrib import admin

from .models import Post


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "category", "created_at", "updated_at")
    search_fields = ("title", "content", "category")
    readonly_fields = ("created_at", "updated_at")
