"""
Startup greeting system for SMASH Cloud Voice AI
"""

import asyncio
from typing import Optional

from .voice_processor import VoiceProcessor

async def startup_greeting(voice_processor: Optional[VoiceProcessor] = None):
    """Play startup greeting when system comes online"""
    try:
        from .config import get_settings
        settings = get_settings()
        greeting_text = settings.jarvis_startup_line
        
        print(f"🚀 {settings.assistant_name} Cloud is initializing...")
        print(f"📢 Greeting: {greeting_text}")
        
        if voice_processor:
            # Generate and save greeting audio
            audio_url = await voice_processor.speak_response(greeting_text)
            if audio_url:
                print(f"🔊 Greeting audio ready: {audio_url}")
            else:
                print("⚠️  Could not generate greeting audio")
        else:
            print("ℹ️  Voice processor not available for greeting")
            
    except Exception as e:
        print(f"❌ Startup greeting error: {e}")
        print("🚀 SMASH Cloud is online")
