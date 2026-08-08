"""
BSR Database Migration Utility: SQLite -> Google Cloud Firestore
Transfers all tables (admin_users, employees, orders, reservations, private_events, audit_logs) from bsr_restaurant.db into Firestore collections.
"""

import sys
import os
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal, get_firestore_db
from app.models import AdminUser, Employee, Order, Reservation, PrivateEvent, AuditLog


def migrate():
    print("=" * 60)
    print("  BSR Database Migration: SQLite -> Google Cloud Firestore")
    print("=" * 60)

    db = SessionLocal()
    firestore_db = get_firestore_db()

    if not firestore_db:
        print("[!] ERROR: Firestore client could not be initialized.")
        print("    Please ensure FIREBASE_CREDENTIALS_PATH or GOOGLE_APPLICATION_CREDENTIALS is set.")
        return False

    collections_map = [
        ("admin_users", AdminUser, lambda obj: str(obj.id) if obj.id else obj.username),
        ("employees", Employee, lambda obj: str(obj.id)),
        ("orders", Order, lambda obj: str(obj.id)),
        ("reservations", Reservation, lambda obj: str(obj.id)),
        ("private_events", PrivateEvent, lambda obj: str(obj.id)),
        ("audit_logs", AuditLog, lambda obj: str(obj.id)),
    ]

    total_migrated = 0

    try:
        for collection_name, model_cls, doc_id_fn in collections_map:
            records = db.query(model_cls).all()
            print(f"[*] Migrating collection '{collection_name}' ({len(records)} records)...")
            col_ref = firestore_db.collection(collection_name)

            for rec in records:
                doc_id = doc_id_fn(rec)
                rec_dict = rec.to_dict()
                col_ref.document(doc_id).set(rec_dict, merge=True)
                total_migrated += 1

            print(f"    [OK] Successfully pushed {len(records)} documents into '{collection_name}'.")

        print("=" * 60)
        print(f"  Migration Complete! Total {total_migrated} documents saved to Firestore.")
        print("=" * 60)
        return True

    except Exception as e:
        print(f"[!] Migration failed with error: {e}")
        return False
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
