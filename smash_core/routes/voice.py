"""
Voice API routes for real-time voice interaction
"""

# Voice processing and TTS endpoints
from fastapi import APIRouter, File, UploadFile, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import FileResponse
import asyncio
import io
from typing import Dict, Optional

from core.config import get_settings
from core.voice_processor import VoiceProcessor

router = APIRouter()
settings = get_settings()

# Global voice processor (will be injected from main app)
voice_processor: Optional[VoiceProcessor] = None

def set_voice_processor(vp: VoiceProcessor):
    """Set the voice processor instance"""
    global voice_processor
    voice_processor = vp

@router.post("/listen")
async def process_voice_input(audio_file: UploadFile = File(...)):
    """Process uploaded audio file for voice commands"""
    if not voice_processor:
        raise HTTPException(status_code=503, detail="Voice processor not initialized")
    
    try:
        # Read audio data
        audio_data = await audio_file.read()
        
        # Process the audio
        result = await voice_processor.process_audio_stream(audio_data)
        
        if result:
            return {
                "success": True,
                "response": result["text"],
                "audio_url": result.get("audio_url"),
                "timestamp": result["timestamp"]
            }
        else:
            return {
                "success": False,
                "message": "Could not process voice input"
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice processing error: {str(e)}")

@router.post("/speak")
async def text_to_speech(text: str):
    """Convert text to speech"""
    if not voice_processor:
        raise HTTPException(status_code=503, detail="Voice processor not initialized")
    
    try:
        audio_url = await voice_processor.speak_response(text)
        
        if audio_url:
            return {
                "success": True,
                "audio_url": audio_url,
                "text": text
            }
        else:
            raise HTTPException(status_code=500, detail="Could not generate speech")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech generation error: {str(e)}")

@router.get("/audio/{filename}")
async def get_audio_file(filename: str):
    """Serve audio files"""
    file_path = f"static/{filename}"
    try:
        return FileResponse(file_path, media_type="audio/wav")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Audio file not found")

@router.post("/activate")
async def activate_voice():
    """Activate voice listening mode"""
    if not voice_processor:
        raise HTTPException(status_code=503, detail="Voice processor not initialized")
    
    await voice_processor.start_listening()
    return {"status": "activated", "message": "Voice listening is now active"}

@router.post("/deactivate")
async def deactivate_voice():
    """Deactivate voice listening mode"""
    if not voice_processor:
        raise HTTPException(status_code=503, detail="Voice processor not initialized")
    
    await voice_processor.stop_listening()
    return {"status": "deactivated", "message": "Voice listening is now inactive"}

@router.get("/status")
async def voice_status():
    """Get voice system status"""
    if not voice_processor:
        return {
            "status": "inactive",
            "listening": False,
            "speaking": False,
            "ready": False
        }
    
    return {
        "status": "active",
        "listening": voice_processor.is_listening,
        "speaking": voice_processor.is_speaking,
        "ready": True,
        "voice_mode": settings.voice_mode,
        "assistant_name": settings.assistant_name
    }
