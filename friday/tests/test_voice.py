import httpx
import jwt
import pytest
from fastapi.testclient import TestClient

from app import voice
from app.config import Settings, get_settings
from app.voice import speakable


def test_speakable_strips_markdown():
    md = "## Status\n- **CPU** is at `12%`\n```py\nprint(1)\n```\nSee [docs](http://x)."
    assert speakable(md) == "Status CPU is at 12% (code omitted) See docs."


@pytest.fixture
def client(monkeypatch):
    from fastapi import FastAPI
    app = FastAPI()
    app.include_router(voice.router, prefix="/api/friday")
    settings = Settings(database_url="x", smash_jwt_secret="s", elevenlabs_api_key="sk-secret", elevenlabs_voice_id="v1")
    app.dependency_overrides[get_settings] = lambda: settings
    c = TestClient(app)
    c.headers["Authorization"] = "Bearer " + jwt.encode({"sub": "me"}, "s", algorithm="HS256")
    return c


def test_speech_proxies_with_server_side_key(client, monkeypatch):
    seen = {}

    def handler(req: httpx.Request):
        seen["key"], seen["url"], seen["body"] = req.headers["xi-api-key"], str(req.url), req.content
        return httpx.Response(200, content=b"ID3fake-mp3")

    real = httpx.AsyncClient
    monkeypatch.setattr(voice.httpx, "AsyncClient", lambda **kw: real(transport=httpx.MockTransport(handler)))
    r = client.post("/api/friday/speech", json={"text": "**Hello** there"})
    assert r.status_code == 200 and r.content == b"ID3fake-mp3"
    assert r.headers["content-type"] == "audio/mpeg"
    assert seen["key"] == "sk-secret" and "/text-to-speech/v1/stream" in seen["url"]
    assert b'"Hello there"' in seen["body"]


def test_upstream_error_is_502_without_leaking_key(client, monkeypatch):
    real = httpx.AsyncClient
    monkeypatch.setattr(voice.httpx, "AsyncClient",
                        lambda **kw: real(transport=httpx.MockTransport(lambda r: httpx.Response(401, text="bad key"))))
    r = client.post("/api/friday/speech", json={"text": "hi"})
    assert r.status_code == 502 and "sk-secret" not in r.text


def test_requires_login(client):
    del client.headers["Authorization"]
    assert client.post("/api/friday/speech", json={"text": "hi"}).status_code == 401
