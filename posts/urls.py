from django.urls import path

from . import views

urlpatterns = [
    path("", views.posts_collection, name="posts_collection"),
    path("<int:post_id>", views.post_detail, name="post_detail"),
    path("<int:post_id>/", views.post_detail, name="post_detail_slash"),
]
