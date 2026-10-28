
"""Authenticated handlers for GET /my/inquiries and GET /admin/inquiries."""

import json
import logging
import os
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

table = boto3.resource("dynamodb").Table(
    os.environ.get("INQUIRIES_TABLE", "QueryFlowInquiries")
)


def _cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
    }


def _json_default(value):
    if isinstance(value, Decimal):
        return int(value) if value % 1 == 0 else float(value)
    raise TypeError(f"Unsupported JSON type: {type(value).__name__}")


def _response(status, body):
    return {
        "statusCode": status,
        "headers": {
            **_cors(),
            "Content-Type": "application/json",
        },
        "body": json.dumps(body, default=_json_default),
    }


def _claims(event):
    return (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("claims", {})
    )


def _is_admin(claims):
    groups = claims.get("cognito:groups", [])

    if isinstance(groups, str):
        try:
            groups = json.loads(groups)
        except (json.JSONDecodeError, TypeError):
            groups = [item.strip() for item in groups.split(",")]

    return isinstance(groups, list) and "admins" in groups


def _scan_all():
    items = []
    params = {}

    while True:
        result = table.scan(**params)
        items.extend(result.get("Items", []))

        last_key = result.get("LastEvaluatedKey")
        if not last_key:
            break

        params["ExclusiveStartKey"] = last_key

    return items


def handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": _cors(), "body": ""}

    claims = _claims(event)
    user_sub = claims.get("sub")

    if not user_sub:
        return _response(401, {
            "success": False,
            "error": "Please sign in again.",
        })

    path = event.get("resource") or event.get("path") or ""

    is_my_inquiries = path.rstrip("/").endswith("/my/inquiries")
    is_admin_route = path.rstrip("/").endswith("/admin/inquiries")

    if not is_my_inquiries and not is_admin_route:
        return _response(404, {
            "success": False,
            "error": "Unknown inquiry endpoint.",
        })

    if is_admin_route and not _is_admin(claims):
        return _response(403, {
            "success": False,
            "error": "Admin access is required.",
        })

    try:
        items = _scan_all()
    except ClientError:
        logger.exception("DynamoDB scan failed")
        return _response(500, {
            "success": False,
            "error": "Could not retrieve inquiries.",
        })

    if is_my_inquiries:
        items = [
            item for item in items
            if item.get("userSub") == user_sub
        ]

    items.sort(
        key=lambda item: int(item.get("createdAt", 0)),
        reverse=True,
    )

    return _response(200, {
        "success": True,
        "count": len(items),
        "inquiries": items,
    })
