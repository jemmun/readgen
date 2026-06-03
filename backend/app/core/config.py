import os
from functools import lru_cache
from typing import Optional
from dotenv import load_dotenv

# Load .env file from the project root (two levels up from this file)
_env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
load_dotenv(dotenv_path=_env_path)


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://readgen:password@localhost:5432/readgen")
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "openai")
    AI_API_KEY: Optional[str] = os.getenv("AI_API_KEY")
    AI_MODEL: str = os.getenv("AI_MODEL", "gpt-4")
    AI_BASE_URL: Optional[str] = os.getenv("AI_BASE_URL")
    AI_IMAGE_MODEL: str = os.getenv("AI_IMAGE_MODEL", "qwen-image-plus")
    MAX_INITIAL_WORDS: int = 10000
    DEFAULT_CHAPTER_WORDS: int = 2500
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days


@lru_cache()
def get_settings() -> Settings:
    return Settings()
