from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    smash_admin_username: str = "admin"
    smash_admin_password: str
    smash_jwt_secret: str
    smash_jwt_ttl_hours: int = 12


@lru_cache
def get_settings() -> Settings:
    return Settings()
