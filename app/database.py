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
    """Initializes Google Cloud Firestore Client using Serverless-Safe Singleton Pattern."""
    global firestore_client, firestore_init_error
    if firestore_client is not None:
        return firestore_client

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        if not firebase_admin._apps:
            private_key = os.getenv("FIREBASE_PRIVATE_KEY", "")
            client_email = os.getenv("FIREBASE_CLIENT_EMAIL", "")
            project_id = os.getenv("FIREBASE_PROJECT_ID", settings.FIREBASE_PROJECT_ID)

            cred = None
            if private_key and client_email:
                clean_pk = private_key.replace("\\n", "\n")
                cred_dict = {
                    "type": "service_account",
                    "project_id": project_id,
                    "client_email": client_email,
                    "private_key": clean_pk
                }
                cred = credentials.Certificate(cred_dict)
            elif settings.FIREBASE_CREDENTIALS_JSON:
                raw_json = settings.FIREBASE_CREDENTIALS_JSON.strip()
                if (raw_json.startswith("'") and raw_json.endswith("'")) or (raw_json.startswith('"') and raw_json.endswith('"')):
                    raw_json = raw_json[1:-1].strip()
                cred_dict = json.loads(raw_json)
                if "private_key" in cred_dict and isinstance(cred_dict["private_key"], str):
                    cred_dict["private_key"] = cred_dict["private_key"].replace("\\n", "\n")
                cred = credentials.Certificate(cred_dict)
            elif os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
                cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)

            if cred:
                firebase_admin.initialize_app(cred, {"projectId": project_id})
            else:
                firebase_admin.initialize_app()

        firestore_client = firestore.client()
        print("[+] [BSR Firestore] Singleton initialized successfully.")
        firestore_init_error = None
        return firestore_client
    except Exception as e:
        # Fallback to direct google.cloud.firestore Client if firebase_admin app already exists or initializes separately
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

            kwargs = {"project": settings.FIREBASE_PROJECT_ID}
            if cred:
                kwargs["credentials"] = cred

            firestore_client = firestore.Client(**kwargs)
            firestore_init_error = None
            return firestore_client
        except Exception as fallback_err:
            firestore_init_error = str(e)
            print(f"[!] [BSR Firestore] Singleton init skipped: {e} | Fallback: {fallback_err}")
            return None

def get_firestore_db():
    """Returns initialized Firestore client instance."""
    global firestore_client
    if firestore_client is None:
        return init_firestore()
    return firestore_client
