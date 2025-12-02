from __future__ import annotations

import json
from typing import Any, Dict, List, Tuple

from django.db.models import Q
from django.http import HttpRequest, HttpResponse, HttpResponseNotAllowed, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .models import Post


def _serialize_post(post: Post) -> Dict[str, Any]:
    """Convert a Post instance to a dict with ISO timestamps."""
    created_at = post.created_at
    updated_at = post.updated_at
    created_iso = created_at.isoformat().replace("+00:00", "Z") if timezone.is_aware(created_at) else created_at.isoformat()
    updated_iso = updated_at.isoformat().replace("+00:00", "Z") if timezone.is_aware(updated_at) else updated_at.isoformat()

    return {
        "id": post.id,
        "title": post.title,
        "content": post.content,
        "category": post.category,
        "tags": post.tags,
        "createdAt": created_iso,
        "updatedAt": updated_iso,
    }


def _parse_json_body(request: HttpRequest) -> Tuple[Dict[str, Any] | None, Dict[str, List[str]] | None]:
    if not request.body:
        return None, {"body": ["Request body is empty."]}
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return None, {"body": ["Invalid JSON payload."]}
    if not isinstance(payload, dict):
        return None, {"body": ["JSON payload must be an object."]}
    return payload, None


def _validate_post_payload(payload: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, List[str]]]:
    errors: Dict[str, List[str]] = {}
    data: Dict[str, Any] = {}

    required_fields = ["title", "content", "category", "tags"]
    for field in required_fields:
        if field not in payload:
            errors.setdefault(field, []).append("This field is required.")
            continue
        value = payload[field]
        if field == "tags":
            if not isinstance(value, list) or not all(isinstance(tag, str) for tag in value):
                errors.setdefault(field, []).append("Tags must be an array of strings.")
            else:
                data[field] = value
        else:
            if not isinstance(value, str) or not value.strip():
                errors.setdefault(field, []).append("Must be a non-empty string.")
            else:
                data[field] = value.strip()

    return data, errors


@csrf_exempt
def posts_collection(request: HttpRequest):
    if request.method == "GET":
        term = request.GET.get("term")
        queryset = Post.objects.all()
        if term:
            queryset = queryset.filter(
                Q(title__icontains=term) | Q(content__icontains=term) | Q(category__icontains=term)
            )
        posts = [_serialize_post(post) for post in queryset]
        return JsonResponse(posts, safe=False, status=200)

    if request.method == "POST":
        payload, parse_errors = _parse_json_body(request)
        if parse_errors:
            return JsonResponse({"errors": parse_errors}, status=400)

        data, errors = _validate_post_payload(payload or {})
        if errors:
            return JsonResponse({"errors": errors}, status=400)

        post = Post.objects.create(**data)
        return JsonResponse(_serialize_post(post), status=201)

    return HttpResponseNotAllowed(["GET", "POST"])


@csrf_exempt
def post_detail(request: HttpRequest, post_id: int):
    try:
        post = Post.objects.get(pk=post_id)
    except Post.DoesNotExist:
        return JsonResponse({"error": "Post not found."}, status=404)

    if request.method == "GET":
        return JsonResponse(_serialize_post(post), status=200)

    if request.method == "PUT":
        payload, parse_errors = _parse_json_body(request)
        if parse_errors:
            return JsonResponse({"errors": parse_errors}, status=400)

        data, errors = _validate_post_payload(payload or {})
        if errors:
            return JsonResponse({"errors": errors}, status=400)

        for field, value in data.items():
            setattr(post, field, value)
        post.save()
        return JsonResponse(_serialize_post(post), status=200)

    if request.method == "DELETE":
        post.delete()
        return HttpResponse(status=204)

    return HttpResponseNotAllowed(["GET", "PUT", "DELETE"])
