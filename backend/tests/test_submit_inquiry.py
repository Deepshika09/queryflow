# Unit tests for submit_inquiry handler.
# Run from backend/ :   python -m pytest tests/test_submit_inquiry.py -v
import json
import os
import pytest

os.environ.setdefault("INQUIRIES_TABLE", "QueryFlowInquiries")

from functions.submit_inquiry.app import handler, validate  # noqa: E402


class TestValidate:
    def test_valid_payload(self):
        ok, err, data = validate({
            "name": "Ada Lovelace",
            "email": "ada@example.com",
            "subject": "Billing",
            "message": "I have a question.",
        })
        assert ok is True
        assert err == ""
        assert data["email"] == "ada@example.com"

    def test_missing_name(self):
        ok, err, _ = validate({"email": "a@b.com", "subject": "s", "message": "m"})
        assert ok is False
        assert "Name" in err

    def test_invalid_email(self):
        ok, err, _ = validate({"name": "x", "email": "nope", "subject": "s", "message": "m"})
        assert ok is False
        assert "email" in err.lower()

    def test_long_message(self):
        ok, err, _ = validate({"name": "x", "email": "a@b.com", "subject": "s", "message": "y" * 5001})
        assert ok is False

    def test_non_object(self):
        ok, err, _ = validate("not an object")
        assert ok is False


class TestHandler:
    def test_options_preflight(self):
        resp = handler({"httpMethod": "OPTIONS"}, None)
        assert resp["statusCode"] == 200
        assert "Access-Control-Allow-Origin" in resp["headers"]

    def test_invalid_json(self):
        resp = handler({"httpMethod": "POST", "body": "{bad"}, None)
        assert resp["statusCode"] == 400
        assert json.loads(resp["body"])["success"] is False

    def test_validation_error(self):
        resp = handler({
            "httpMethod": "POST",
            "body": json.dumps({"name": "", "email": "x", "subject": "", "message": ""}),
        }, None)
        assert resp["statusCode"] == 400

    def test_success(self, monkeypatch):
        captured = {}

        class FakeTable:
            def put_item(self, Item):
                captured["item"] = Item

        monkeypatch.setattr("functions.submit_inquiry.app.table", FakeTable())

        resp = handler({
            "httpMethod": "POST",
            "body": json.dumps({
                "name": "Grace Hopper",
                "email": "grace@navy.mil",
                "subject": "Compiler bug",
                "message": "Moth in relay 70.",
            }),
        }, None)

        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["success"] is True
        assert "inquiryId" in body
        assert captured["item"]["status"] == "NEW"
