"""
Audio processing routes for STT/TTS operations
"""

from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import Dict
import httpx
import uuid
from pathlib import Path

from core.config import get_settings

router = APIRouter()
settings = get_settings()

@router.post("/transcribe")
async def transcribe_audio(audio_file: UploadFile = File(...)):
    """Convert speech to text using Whisper"""
    try:
        # Save uploaded file temporarily
        temp_filename = f"temp_{uuid.uuid4()}.wav"
        temp_path = Path("static") / temp_filename
        temp_path.parent.mkdir(exist_ok=True)
        
        content = await audio_file.read()
        temp_path.write_bytes(content)
        
        # Send to Whisper service
        async with httpx.AsyncClient(timeout=30.0) as client:
            with open(temp_path, "rb") as f:
                files = {"file": (audio_file.filename, f, audio_file.content_type)}
                response = await client.post(
                    f"{settings.whisper_host}/transcribe",
                    files=files
                )
        
        # Clean up temp file
        temp_path.unlink(missing_ok=True)
        
        if response.status_code == 200:
            result = response.json()
            return {
                "success": True,
                "text": result.get("text", ""),
                "confidence": result.get("confidence", 0.8)
            }
        else:
            raise HTTPException(status_code=500, detail="Transcription failed")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")

@router.post("/synthesize")
async def synthesize_speech(text: str, voice_id: str = None):
    """Convert text to speech"""
    try:
        if settings.elevenlabs_api_key and voice_id:
            # Use ElevenLabs
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                    headers={
                        "xi-api-key": settings.elevenlabs_api_key,
                        "Content-Type": "application/json"
                    },
                    json={
                        "text": text,
                        "voice_settings": {
                            "stability": 0.75,
                            "similarity_boost": 0.8
                        }
                    }
                )
                
                if response.status_code == 200:
                    filename = f"tts_{uuid.uuid4()}.mp3"
                    filepath = Path("static") / filename
                    filepath.write_bytes(response.content)
                    return {
                        "success": True,
                        "audio_url": f"/static/{filename}",
                        "text": text
                    }
        
        # Fallback to Piper
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.piper_host}/synthesize",
                json={"text": text, "voice": settings.voice_id}
            )
            
            if response.status_code == 200:
                filename = f"tts_{uuid.uuid4()}.wav"
                filepath = Path("static") / filename
                filepath.write_bytes(response.content)
                return {
                    "success": True,
                    "audio_url": f"/static/{filename}",
                    "text": text
                }
        
        raise HTTPException(status_code=500, detail="Speech synthesis failed")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech synthesis error: {str(e)}")
