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

    # Default Admin Initial Setup
    DEFAULT_ADMIN_USER: str = os.getenv("ADMIN_USERNAME", "admin")
    DEFAULT_ADMIN_PASS: str = os.getenv("ADMIN_PASSWORD", "bsr@admin2026")

    # Database - automatically use /tmp directory in serverless environments (Vercel)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{'/tmp/bsr_restaurant.db' if os.getenv('VERCEL') else './bsr_restaurant.db'}"
    )

    # Firestore Database Configuration
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "bangalir-sokher-rannaghor")
    FIREBASE_DATABASE_ID: str = os.getenv("FIREBASE_DATABASE_ID", "(default)")
    FIREBASE_CREDENTIALS_PATH: str = os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json")
    FIREBASE_CREDENTIALS_JSON: str = os.getenv("FIREBASE_CREDENTIALS_JSON", "")
    USE_FIRESTORE: bool = os.getenv("USE_FIRESTORE", "false").lower() in ("true", "1", "yes")

    # Firebase Web App Public SDK Credentials
    FIREBASE_API_KEY: str = os.getenv("FIREBASE_API_KEY", "AIzaSyBC7weuYk4SmtuouPAZyPWxgdfvGE2wzJc")
    FIREBASE_AUTH_DOMAIN: str = os.getenv("FIREBASE_AUTH_DOMAIN", "bangalir-sokher-rannaghor.firebaseapp.com")
    FIREBASE_STORAGE_BUCKET: str = os.getenv("FIREBASE_STORAGE_BUCKET", "bangalir-sokher-rannaghor.firebasestorage.app")
    FIREBASE_MESSAGING_SENDER_ID: str = os.getenv("FIREBASE_MESSAGING_SENDER_ID", "789159534550")
    FIREBASE_APP_ID: str = os.getenv("FIREBASE_APP_ID", "1:789159534550:web:b8af2da0f0fe58ed8d8e77")
    FIREBASE_MEASUREMENT_ID: str = os.getenv("FIREBASE_MEASUREMENT_ID", "G-TR6LB591KX")


    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
