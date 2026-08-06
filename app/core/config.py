import os
import secrets
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "বাঙালির শখের রান্নাঘর - Admin & Store Portal"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Security Configuration
    # Stable default secret key if not set in environment (prevents session invalidation on restart)
    SECRET_KEY: str = os.getenv("SECRET_KEY", "bsr_bengali_restaurant_jwt_secret_key_2026_secure")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours session duration
    COOKIE_NAME: str = "bsr_admin_session"
    CSRF_HEADER_NAME: str = "X-CSRF-Token"

    # Default Admin Initial Setup
    DEFAULT_ADMIN_USER: str = os.getenv("ADMIN_USERNAME", "admin")
    DEFAULT_ADMIN_PASS: str = os.getenv("ADMIN_PASSWORD", "bsr@admin2026")

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./bsr_restaurant.db")

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
