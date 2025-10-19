"""
Configuration management for SMASH Cloud Voice AI
"""

import os
from typing import Optional
try:
    from pydantic import BaseSettings, Field
except ImportError:
    from pydantic_settings import BaseSettings
    from pydantic import Field

class Settings(BaseSettings):
    # API Keys
    openai_api_key: Optional[str] = Field(None, env="OPENAI_API_KEY")
    elevenlabs_api_key: Optional[str] = Field(None, env="ELEVENLABS_API_KEY")
    
    # Service URLs
    ollama_host: str = Field("http://localhost:11434", env="OLLAMA_HOST")
    whisper_host: str = Field("http://localhost:9000", env="WHISPER_HOST")
    piper_host: str = Field("http://localhost:5002", env="PIPER_HOST")
    
    # Assistant Configuration
    assistant_name: str = Field("SMASH", env="ASSISTANT_NAME")
    voice_mode: str = Field("jarvis", env="VOICE_MODE")
    voice_id: str = Field("en_GB-sarah-high", env="VOICE_ID")
    jarvis_startup_line: str = Field(
        "System online. Hello Sudhamsh, SMASH Cloud is now active.", 
        env="JARVIS_STARTUP_LINE"
    )
    
    # Audio Settings
    mic_device: str = Field("default", env="MIC_DEVICE")
    speaker_device: str = Field("default", env="SPEAKER_DEVICE")
    sample_rate: int = Field(16000, env="SAMPLE_RATE")
    chunk_size: int = Field(1024, env="CHUNK_SIZE")
    recording_duration: int = Field(5, env="RECORDING_DURATION")
    
    # Database
    database_url: str = Field("sqlite:///./smash_ai.db", env="DATABASE_URL")
    
    # Jarvis Personality
    jarvis_personality: str = Field("calm, articulate, futuristic", env="JARVIS_PERSONALITY")
    address_user_as: str = Field("SIR", env="ADDRESS_USER_AS")
    learning_enabled: bool = Field(True, env="LEARNING_ENABLED")
    context_memory_size: int = Field(50, env="CONTEXT_MEMORY_SIZE")
    
    class Config:
        env_file = ".env"

def get_settings() -> Settings:
    return Settings()

# Global settings instance
settings = get_settings()
