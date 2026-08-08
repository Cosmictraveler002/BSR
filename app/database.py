import os
import json
from typing import Optional
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Create engine with connect_args for SQLite threading safety
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


# --- Google Cloud Firestore Database Connection ---
firestore_client: Optional[object] = None
firestore_init_error: Optional[str] = None

def init_firestore():
    """Initializes Google Cloud Firestore Client."""
    global firestore_client, firestore_init_error
    if firestore_client is not None:
        return firestore_client

    try:
        from google.cloud import firestore
        from google.oauth2 import service_account

        cred = None
        if settings.FIREBASE_CREDENTIALS_JSON:
            raw_json = settings.FIREBASE_CREDENTIALS_JSON.strip()
            if (raw_json.startswith("'") and raw_json.endswith("'")) or (raw_json.startswith('"') and raw_json.endswith('"')):
                raw_json = raw_json[1:-1].strip()
            cred_dict = json.loads(raw_json)
            if "private_key" in cred_dict and isinstance(cred_dict["private_key"], str):
                cred_dict["private_key"] = cred_dict["private_key"].replace("\\n", "\n")
            cred = service_account.Credentials.from_service_account_info(cred_dict)
        elif os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
            cred = service_account.Credentials.from_service_account_file(settings.FIREBASE_CREDENTIALS_PATH)
        elif os.getenv("GOOGLE_APPLICATION_CREDENTIALS") and os.path.exists(os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")):
            cred = service_account.Credentials.from_service_account_file(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))

        kwargs = {}
        if settings.FIREBASE_PROJECT_ID:
            kwargs["project"] = settings.FIREBASE_PROJECT_ID
        if settings.FIREBASE_DATABASE_ID and settings.FIREBASE_DATABASE_ID not in ("default", "(default)"):
            kwargs["database"] = settings.FIREBASE_DATABASE_ID
        if cred:
            kwargs["credentials"] = cred

        firestore_client = firestore.Client(**kwargs)
        print("[+] [BSR Firestore] Connected successfully to Cloud Firestore database.")
        firestore_init_error = None
        return firestore_client
    except Exception as e:
        firestore_init_error = str(e)
        print(f"[!] [BSR Firestore] Initialization pending/skipped: {e}")
        return None

def get_firestore_db():
    """Returns initialized Firestore client instance."""
    global firestore_client
    if firestore_client is None:
        return init_firestore()
    return firestore_client
