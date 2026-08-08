import os
import json
from typing import Optional
from app.core.config import settings
import firebase_admin
from firebase_admin import credentials, firestore

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
        import firebase_admin
        from firebase_admin import credentials, firestore
        cred = None
        if settings.FIREBASE_CREDENTIALS_JSON:
            cred_dict = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
            cred = credentials.Certificate(cred_dict)
        elif os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)

        # Initialize the Firebase App if it hasn't been initialized yet
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred, {
                'projectId': settings.FIREBASE_PROJECT_ID
            })
            
        # Get the Firestore client directly from firebase_admin
        firestore_client = firestore.client()
        print("[+] [BSR Firestore] Connected successfully to Cloud Firestore.")
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
