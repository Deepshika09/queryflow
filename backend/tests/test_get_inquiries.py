# Unit tests for get_inquiries handler.
# Run from backend/ :   python -m pytest tests/test_get_inquiries.py -v
import json
import os
import pytest

os.environ.setdefault("INQUIRIES_TABLE", "QueryFlowInquiries")
os.environ.setdefault("ADMIN_TOKEN", "super-secret-token")

from functions.get_inquiries.app import handler  # noqa: E402


def _event(method="GET", auth=None):
    headers = {}
    if auth:
        headers["Authorization"] = f"Bearer {auth}"
    return {"httpMethod": method, "headers": headers}


class TestAuth:
    def test_options_preflight(self):
        assert handler({"httpMethod": "OPTIONS"}, None)["statusCode"] == 200

    def test_missing_token(self):
        resp = handler(_event(), None)
        assert resp["statusCode"] == 401
        assert json.loads(resp["body"])["success"] is False

    def test_wrong_token(self):
        resp = handler(_event(auth="wrong-token"), None)
        assert resp["statusCode"] == 401


class TestList:
    def test_success(self, monkeypatch):
        class FakeTable:
            def scan(self, Limit=100):
                return {
                    "Items": [
                        {"inquiryId": "b", "createdAt": 2},
                        {"inquiryId": "a", "createdAt": 1},
                    ]
                }

        monkeypatch.setattr("functions.get_inquiries.app.table", FakeTable())
        resp = handler(_event(auth="super-secret-token"), None)
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["success"] is True
        assert body["count"] == 2
        assert body["inquiries"][0]["inquiryId"] == "b"

    def test_scan_failure(self, monkeypatch):
        from botocore.exceptions import ClientError

        class FakeTable:
            def scan(self, Limit=100):
                raise ClientError(
                    {"Error": {"Code": "ThrottlingException"}}, "Scan"
                )

        monkeypatch.setattr("functions.get_inquiries.app.table", FakeTable())
        resp = handler(_event(auth="super-secret-token"), None)
        assert resp["statusCode"] == 500
