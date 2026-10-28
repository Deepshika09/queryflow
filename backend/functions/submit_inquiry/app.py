
"""Authenticated Lambda handler for POST /inquiries."""

import json
import logging
import os
import time
import uuid

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
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
    }


def _response(status, body):
    return {
        "statusCode": status,
        "headers": {
            **_cors(),
            "Content-Type": "application/json",
        },
        "body": json.dumps(body),
    }


def handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": _cors(), "body": ""}

    claims = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("claims", {})
    )

    user_sub = claims.get("sub")
    if not user_sub:
        return _response(401, {
            "success": False,
            "error": "Please sign in before submitting an inquiry.",
        })

    try:
        payload = json.loads(event.get("body") or "{}")
    except (json.JSONDecodeError, TypeError):
        return _response(400, {
            "success": False,
            "error": "Request body must be valid JSON.",
        })

    name = str(payload.get("name", "")).strip()
    subject = str(payload.get("subject", "")).strip()
    message = str(payload.get("message", "")).strip()
    email = str(claims.get("email") or "").strip()

    if not name or not subject or not message:
        return _response(400, {
            "success": False,
            "error": "Name, subject, and message are required.",
        })

    if len(name) > 100 or len(subject) > 150 or len(message) > 5000:
        return _response(400, {
            "success": False,
            "error": "One or more fields exceed the allowed length.",
        })

    item = {
        "inquiryId": str(uuid.uuid4()),
        "userSub": user_sub,
        "name": name,
        "email": email,
        "subject": subject,
        "message": message,
        "status": "NEW",
        "createdAt": int(time.time()),
    }

    try:
        table.put_item(Item=item)
    except ClientError:
        logger.exception("Could not save inquiry")
        return _response(500, {
            "success": False,
            "error": "Could not save your inquiry. Please try again.",
        })

    return _response(201, {
        "success": True,
        "message": "Your inquiry was submitted successfully.",
        "inquiryId": item["inquiryId"],
    })
