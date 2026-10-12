from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_SYSTEM_PROMPT = (
    "You are FRIDAY, a personal AI assistant running on SMASH Cloud, a private cloud "
    "platform owned and operated by your user. Be direct, accurate and concise. "
    "Say so plainly when you don't know something. You cannot yet take actions on "
    "SMASH Cloud (deployments, restarts, file access); you can only *read* its state "
    "through your tools. When a question is about SMASH Cloud's live state (system load, "
    "service health, VERONICA's training), call a tool instead of guessing, and say "
    "plainly if a tool reports an error."
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    smash_jwt_secret: str

    friday_system_prompt: str = DEFAULT_SYSTEM_PROMPT
    friday_default_provider: str = "anthropic"
    # Providers tried in order when the chosen one fails before producing any output.
    friday_fallback_order: str = "anthropic,openai,gemini,ollama"
    friday_history_limit: int = 40
    friday_max_tool_rounds: int = 8  # safety cap on model -> tool -> model loops per reply

    # Internal service URLs (Compose service names). Tools call these with the user's token.
    smash_api_url: str = "http://smash-api:8000"
    veronica_url: str = "http://veronica:8000"

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-5-5"
    anthropic_effort: str = "medium"

    openai_api_key: str = ""
    openai_model: str = "chat-latest"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-latest"
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai/"

    # Voice (text-to-speech). Flash v2.5 is ElevenLabs' low-latency model; use
    # eleven_multilingual_v2 for maximum quality at higher latency.
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = ""
    elevenlabs_model: str = "eleven_flash_v2_5"

    ollama_enabled: bool = False
    ollama_base_url: str = "http://host.docker.internal:11434/v1"
    ollama_model: str = "llama3.2"


@lru_cache
def get_settings() -> Settings:
    return Settings()
