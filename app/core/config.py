import os
import secrets
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "বাঙালির শখের রান্নাঘর - Admin & Store Portal"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Security & Environment Configuration
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "bsr_bengali_restaurant_jwt_secret_key_2026_secure")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour session duration
    COOKIE_NAME: str = "bsr_admin_session"
    CSRF_HEADER_NAME: str = "X-CSRF-Token"

    # Admin Login Rate Limiting Configuration
    ADMIN_LOGIN_RATE_LIMIT: str = os.getenv("ADMIN_LOGIN_RATE_LIMIT", "10/minute")
    MAX_FAILED_LOGIN_ATTEMPTS: int = int(os.getenv("MAX_FAILED_LOGIN_ATTEMPTS", "5"))
    LOGIN_LOCKOUT_SECONDS: int = int(os.getenv("LOGIN_LOCKOUT_SECONDS", "300"))

    # Public Order & Reservation Server-Side Rate Limiting & DoS Protection
    ORDERS_RATE_LIMIT: str = os.getenv("ORDERS_RATE_LIMIT", "30/minute")
    RESERVATIONS_RATE_LIMIT: str = os.getenv("RESERVATIONS_RATE_LIMIT", "20/minute")
    MAX_ORDERS_PER_PHONE_WINDOW: int = int(os.getenv("MAX_ORDERS_PER_PHONE_WINDOW", "5"))
    PHONE_WINDOW_MINUTES: int = int(os.getenv("PHONE_WINDOW_MINUTES", "10"))
    MAX_PAYLOAD_SIZE_BYTES: int = int(os.getenv("MAX_PAYLOAD_SIZE_BYTES", str(64 * 1024)))  # 64 KB max payload

    # External Client / Meet Me Cafe Integration Verification
    CAFE_BRAND_API_KEY: str = os.getenv("CAFE_BRAND_API_KEY", "mm_live_cafe_2026")
    ENFORCE_CAFE_BRAND_KEY: bool = os.getenv("ENFORCE_CAFE_BRAND_KEY", "false").lower() in ("true", "1", "yes")

    # Allowed CORS Origins (comma-separated)
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:8000,http://127.0.0.1:8000,https://bsr.vercel.app,https://www.bangalirsokherrannaghor.in,https://bangalirsokherrannaghor.in"
    )

    # Default Admin Initial Setup
    DEFAULT_ADMIN_USER: str = os.getenv("ADMIN_USERNAME", "admin")
    DEFAULT_ADMIN_PASS: str = os.getenv("ADMIN_PASSWORD", "bsr@admin2026")

    # Vercel Detection — set automatically by Vercel runtime
    IS_VERCEL: bool = bool(os.getenv("VERCEL", ""))

    # Database - automatically use in-memory SQLite in serverless environments (Vercel)
    # On Vercel, SQLite is not used for persistent storage — Firestore is the primary DB
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///:memory:" if os.getenv("VERCEL") else "sqlite:///./bsr_restaurant.db"
    )

    # Firestore Database Configuration
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "bangalir-sokher-rannaghor")
    FIREBASE_DATABASE_ID: str = os.getenv("FIREBASE_DATABASE_ID", "default")
    FIREBASE_CREDENTIALS_PATH: str = os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json")
    FIREBASE_CREDENTIALS_JSON: str = os.getenv("FIREBASE_CREDENTIALS_JSON", "")
    # On Vercel, default to Firestore. Locally, default to false unless overridden.
    USE_FIRESTORE: bool = os.getenv("USE_FIRESTORE", "true" if os.getenv("VERCEL") else "false").lower() in ("true", "1", "yes")

    # Firebase Web App Public SDK Credentials
    FIREBASE_API_KEY: str = os.getenv("FIREBASE_API_KEY", "AIzaSyBC7weuYk4SmtuouPAZyPWxgdfvGE2wzJc")
    FIREBASE_AUTH_DOMAIN: str = os.getenv("FIREBASE_AUTH_DOMAIN", "bangalir-sokher-rannaghor.firebaseapp.com")
    FIREBASE_STORAGE_BUCKET: str = os.getenv("FIREBASE_STORAGE_BUCKET", "bangalir-sokher-rannaghor.firebasestorage.app")
    FIREBASE_MESSAGING_SENDER_ID: str = os.getenv("FIREBASE_MESSAGING_SENDER_ID", "789159534550")
    FIREBASE_APP_ID: str = os.getenv("FIREBASE_APP_ID", "1:789159534550:web:b8af2da0f0fe58ed8d8e77")
    FIREBASE_MEASUREMENT_ID: str = os.getenv("FIREBASE_MEASUREMENT_ID", "G-TR6LB591KX")


    class Config:
        env_file = ".env" if os.path.exists(".env") else None
        case_sensitive = True

settings = Settings()
