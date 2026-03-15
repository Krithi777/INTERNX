from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_service_key: str

    # JWT
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080

    # Gemini AI
    # Gemini AI
    gemini_api_key: str = ""
    # Groq AI
    groq_api_key: str = ""

    # GitHub
    github_client_id: str
    github_client_secret: str
    github_app_id: str = ""
    github_app_private_key: str = ""

    # Resend Email
    resend_api_key: str
    email_from: str = "noreply@internx.dev"

    # App
    frontend_url: str = "http://localhost:3000"
    environment: str = "development"

    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
