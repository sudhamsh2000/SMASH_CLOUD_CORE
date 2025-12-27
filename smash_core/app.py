"""
SMASH Cloud Voice AI - Jarvis Style Assistant
Real-time voice interaction with adaptive learning capabilities
"""

# Main application entry point
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

from core.config import get_settings
from core.database import init_database
from routes.chat import router as chat_router
from routes.audio import router as audio_router
from routes.voice import router as voice_router, set_voice_processor
from routes.system import router as system_router
from core.greeting import startup_greeting
from core.voice_processor import VoiceProcessor

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="SMASH Cloud Voice AI",
    description="Jarvis-style voice assistant with real-time learning",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for audio
static_dir = Path("static")
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include routers
app.include_router(chat_router, prefix="/api/chat", tags=["Chat"])
app.include_router(audio_router, prefix="/api/audio", tags=["Audio"])
app.include_router(voice_router, prefix="/api/voice", tags=["Voice"])
app.include_router(system_router, prefix="/api/system", tags=["System"])

# Global voice processor instance
voice_processor = None

@app.on_event("startup")
async def startup_event():
    """Initialize the system and play startup greeting"""
    global voice_processor
    
    # Initialize database
    await init_database()
    
    # Initialize voice processor
    settings = get_settings()
    voice_processor = VoiceProcessor(settings)
    
    # Set voice processor in routes
    set_voice_processor(voice_processor)
    
    # Play startup greeting
    await startup_greeting(voice_processor)

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global voice_processor
    if voice_processor:
        await voice_processor.cleanup()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "SMASH Cloud Voice AI is online",
        "status": "active",
        "version": "1.0.0",
        "assistant": "Jarvis-style voice assistant ready"
    }

@app.websocket("/ws/voice")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time voice interaction"""
    await websocket.accept()
    
    try:
        async for data in websocket.iter_bytes():
            if voice_processor:
                # Process incoming audio data
                response = await voice_processor.process_audio_stream(data)
                if response:
                    await websocket.send_json({
                        "type": "response",
                        "text": response["text"],
                        "audio_url": response.get("audio_url"),
                        "timestamp": response["timestamp"]
                    })
    except WebSocketDisconnect:
        print("Voice WebSocket disconnected")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
