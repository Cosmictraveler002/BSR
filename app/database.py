import os
import json
from typing import Optional
from app.core.config import settings

# ---------------------------------------------------------------------------
# SQLAlchemy Engine (Local development with SQLite)
# On Vercel, SQLite is ephemeral. We still create a minimal engine so that
# imports of Base / get_db don't crash, but all production reads/writes go
# through Firestore helpers instead.
# ---------------------------------------------------------------------------
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Google Cloud Firestore Database Connection
# On Vercel, credentials come from FIREBASE_CREDENTIALS_JSON env variable.
# Locally, they can come from a file on disk.
# ---------------------------------------------------------------------------
firestore_client: Optional[object] = None

def init_firestore():
    """Initializes Google Cloud Firestore Client."""
    global firestore_client
    if firestore_client is not None:
        return firestore_client

    try:
        from google.cloud import firestore
        from google.oauth2 import service_account

        cred = None
        # Priority 1: JSON string from env variable (Vercel production)
        if settings.FIREBASE_CREDENTIALS_JSON:
            cred_dict = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
            cred = service_account.Credentials.from_service_account_info(cred_dict)
        # Priority 2: Local file path
        elif os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
            cred = service_account.Credentials.from_service_account_file(settings.FIREBASE_CREDENTIALS_PATH)
        # Priority 3: GOOGLE_APPLICATION_CREDENTIALS env
        elif os.getenv("GOOGLE_APPLICATION_CREDENTIALS") and os.path.exists(os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")):
            cred = service_account.Credentials.from_service_account_file(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))

        kwargs = {}
        if settings.FIREBASE_PROJECT_ID:
            kwargs["project"] = settings.FIREBASE_PROJECT_ID
        if settings.FIREBASE_DATABASE_ID:
            kwargs["database"] = settings.FIREBASE_DATABASE_ID
        if cred:
            kwargs["credentials"] = cred

        firestore_client = firestore.Client(**kwargs)
        print("[+] [BSR Firestore] Connected successfully to Cloud Firestore database.")
        return firestore_client
    except Exception as e:
        print(f"[!] [BSR Firestore] Initialization pending/skipped: {e}")
        return None

def get_firestore_db():
    """Returns initialized Firestore client instance."""
    global firestore_client
    if firestore_client is None:
        return init_firestore()
    return firestore_client
