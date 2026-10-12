"""FRIDAY's voice: text-to-speech through ElevenLabs, proxied so the API key stays secret.

    browser ──POST /api/friday/speech {text}──▶ FRIDAY ──(xi-api-key)──▶ ElevenLabs
            ◀────────── audio/mpeg, streamed chunk by chunk ◀────────────

Why a proxy instead of calling ElevenLabs from the browser: anything sent to the browser
can be read by anyone using it (DevTools → Network). The old smash_ui shipped the key to
the browser; here the browser only ever holds the SMASH login token.

Why streaming: ElevenLabs produces audio progressively. Forwarding chunks as they arrive
means playback can begin after the first ~100 ms of audio instead of after the whole clip.
"""

from __future__ import annotations

import re

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .auth import CurrentUser, require_user
from .config import Settings, get_settings

router = APIRouter()
ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"


class SpeechIn(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


def speakable(markdown: str) -> str:
    """FRIDAY answers in Markdown; read aloud, `**bold**` or a code fence is noise."""
    text = re.sub(r"```.*?```", " (code omitted) ", markdown, flags=re.S)
    text = re.sub(r"`([^`]*)`", r"\1", text)
    text = re.sub(r"!?\[([^\]]*)\]\([^)]*\)", r"\1", text)  # links/images -> their label
    text = re.sub(r"^\s{0,3}(#{1,6}|[-*+]|\d+\.)\s+", "", text, flags=re.M)  # headings, bullets
    text = re.sub(r"[*_~]{1,3}", "", text)
    return re.sub(r"\s+", " ", text).strip()


@router.get("/voice")
def voice_info(_: CurrentUser = Depends(require_user), s: Settings = Depends(get_settings)) -> dict:
    """Lets the UI hide the speaker button when voice isn't configured."""
    return {"available": bool(s.elevenlabs_api_key and s.elevenlabs_voice_id), "model": s.elevenlabs_model}


@router.post("/speech")
async def speech(body: SpeechIn, _: CurrentUser = Depends(require_user), s: Settings = Depends(get_settings)):
    if not (s.elevenlabs_api_key and s.elevenlabs_voice_id):
        raise HTTPException(503, "Voice is not configured: set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in .env")
    text = speakable(body.text)
    if not text:
        raise HTTPException(422, "Nothing to say after removing formatting")

    client = httpx.AsyncClient(timeout=httpx.Timeout(30, read=60))
    req = client.build_request(
        "POST", ELEVENLABS_URL.format(voice_id=s.elevenlabs_voice_id),
        params={"output_format": "mp3_44100_128"},
        headers={"xi-api-key": s.elevenlabs_api_key, "Accept": "audio/mpeg"},
        json={"text": text, "model_id": s.elevenlabs_model},
    )
    upstream = await client.send(req, stream=True)
    if upstream.status_code != 200:
        detail = (await upstream.aread()).decode(errors="replace")[:300]
        await upstream.aclose()
        await client.aclose()
        # Never echo the key; ElevenLabs' error body doesn't contain it.
        raise HTTPException(502, f"ElevenLabs returned {upstream.status_code}: {detail}")

    async def audio():
        try:
            async for chunk in upstream.aiter_bytes():
                yield chunk
        finally:
            await upstream.aclose()
            await client.aclose()

    return StreamingResponse(audio(), media_type="audio/mpeg", headers={"Cache-Control": "no-store"})
