"""
Voice Processing Core - Real-time STT/TTS with Jarvis voice
"""

# Voice processing and audio stream handling
import asyncio
import io
import uuid
from pathlib import Path
from typing import Dict, Optional, AsyncGenerator
import httpx
import json
from datetime import datetime

from .config import Settings
from .llm import jarvis_llm
from .database import db_manager

class VoiceProcessor:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.is_listening = False
        self.is_speaking = False
        self.audio_queue = asyncio.Queue()
        self.processor_tasks = []
        
    async def process_audio_stream(self, audio_data: bytes) -> Optional[Dict]:
        """Process incoming audio stream and return response"""
        try:
            # Convert audio to text
            text = await self._speech_to_text(audio_data)
            if not text or len(text.strip()) < 2:
                return None
            
            # Check for voice activation
            if not self._is_voice_activated(text):
                return None
            
            print(f"🎤 Heard: {text}")
            
            # Process with LLM
            response_data = await jarvis_llm.process_message(text)
            response_text = response_data["response"]
            
            print(f"🤖 Response: {response_text}")
            
            # Convert response to speech
            audio_url = await self._text_to_speech(response_text)
            
            return {
                "text": response_text,
                "audio_url": audio_url,
                "timestamp": datetime.now().isoformat(),
                "confidence": response_data.get("confidence", 0.8)
            }
            
        except Exception as e:
            print(f"❌ Voice processing error: {e}")
            return None

    async def _speech_to_text(self, audio_data: bytes) -> str:
        """Convert speech to text using Whisper"""
        try:
            # Save audio to temporary file
            temp_file = Path("static") / f"temp_{uuid.uuid4()}.wav"
            temp_file.parent.mkdir(exist_ok=True)
            temp_file.write_bytes(audio_data)
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                with open(temp_file, "rb") as f:
                    files = {"file": ("audio.wav", f, "audio/wav")}
                    response = await client.post(
                        f"{self.settings.whisper_host}/transcribe",
                        files=files
                    )
                
                if response.status_code == 200:
                    result = response.json()
                    text = result.get("text", "").strip()
                    # Clean up temp file
                    temp_file.unlink(missing_ok=True)
                    return text
                    
        except Exception as e:
            print(f"STT Error: {e}")
            
        return ""

    async def _text_to_speech(self, text: str) -> str:
        """Convert text to speech using Piper or ElevenLabs"""
        try:
            if self.settings.elevenlabs_api_key:
                return await self._elevenlabs_tts(text)
            else:
                return await self._piper_tts(text)
                
        except Exception as e:
            print(f"TTS Error: {e}")
            return ""

    async def _elevenlabs_tts(self, text: str) -> str:
        """Use ElevenLabs for high-quality Jarvis voice"""
        voice_id = "21m00Tcm4TlvDq8ikWAM"  # Jarvis-like voice
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={
                    "xi-api-key": self.settings.elevenlabs_api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "text": text,
                    "voice_settings": {
                        "stability": 0.75,
                        "similarity_boost": 0.8,
                        "style": 0.0,
                        "use_speaker_boost": True
                    }
                }
            )
            
            if response.status_code == 200:
                # Save audio file
                filename = f"jarvis_{uuid.uuid4()}.mp3"
                filepath = Path("static") / filename
                filepath.parent.mkdir(exist_ok=True)
                filepath.write_bytes(response.content)
                return f"/static/{filename}"
                
        return ""

    async def _piper_tts(self, text: str) -> str:
        """Use Piper for local TTS"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.settings.piper_host}/synthesize",
                    json={"text": text, "voice": self.settings.voice_id}
                )
                
                if response.status_code == 200:
                    # Save audio file
                    filename = f"jarvis_{uuid.uuid4()}.wav"
                    filepath = Path("static") / filename
                    filepath.parent.mkdir(exist_ok=True)
                    filepath.write_bytes(response.content)
                    return f"/static/{filename}"
                    
        except Exception as e:
            print(f"Piper TTS Error: {e}")
            
        return ""

    def _is_voice_activated(self, text: str) -> bool:
        """Check if text contains voice activation phrases"""
        activation_phrases = [
            "hey smash", "okay smash", "listen smash", "smash",
            "jarvis", "hey jarvis", "okay jarvis"
        ]
        
        text_lower = text.lower()
        return any(phrase in text_lower for phrase in activation_phrases)

    async def start_listening(self):
        """Start continuous listening mode"""
        self.is_listening = True
        print("🎤 Voice listening activated - say 'Hey SMASH' to interact")
        
    async def stop_listening(self):
        """Stop listening mode"""
        self.is_listening = False
        print("🔇 Voice listening deactivated")

    async def speak_response(self, text: str) -> str:
        """Direct speech synthesis"""
        return await self._text_to_speech(text)

    async def cleanup(self):
        """Cleanup voice processor resources"""
        self.is_listening = False
        self.is_speaking = False
        
        # Cancel any running tasks
        for task in self.processor_tasks:
            if not task.done():
                task.cancel()
        
        print("🧹 Voice processor cleaned up")
