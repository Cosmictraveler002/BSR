"""
Firestore Helper Utilities for BSR Database
Provides clean CRUD operations for Firestore collections with fallback options.
On Vercel (production), this is the SOLE database layer.
Locally, it serves as a sync/backup layer alongside SQLite.
"""

import time
import datetime
from typing import Dict, List, Optional, Any
from app.database import get_firestore_db


def save_document(collection_name: str, doc_id: str, data: Dict[str, Any]) -> bool:
    """Saves or updates a document in a Firestore collection."""
    db = get_firestore_db()
    if not db:
        return False
    try:
        # Ensure datetime objects are serialized to ISO strings for Firestore
        clean_data = _serialize_for_firestore(data)
        db.collection(collection_name).document(str(doc_id)).set(clean_data, merge=True)
        return True
    except Exception as e:
        print(f"[!] Firestore save error on collection '{collection_name}' [{doc_id}]: {e}")
        return False


def get_document(collection_name: str, doc_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single document by ID from a Firestore collection."""
    db = get_firestore_db()
    if not db:
        return None
    try:
        doc = db.collection(collection_name).document(str(doc_id)).get()
        if doc.exists:
            res = doc.to_dict()
            res["id"] = doc.id
            return res
        return None
    except Exception as e:
        print(f"[!] Firestore get error on collection '{collection_name}' [{doc_id}]: {e}")
        return None


def query_documents(
    collection_name: str,
    filters: Optional[List[tuple]] = None,
    order_by: Optional[str] = None,
    descending: bool = False,
    limit: Optional[int] = 100
) -> List[Dict[str, Any]]:
    """Queries documents from a Firestore collection with optional filters, sorting, and quota-safe limiting."""
    db = get_firestore_db()
    if not db:
        return []
    try:
        query = db.collection(collection_name)
        if filters:
            for field, op, val in filters:
                query = query.where(field, op, val)
        if order_by:
            from google.cloud import firestore
            direction = firestore.Query.DESCENDING if descending else firestore.Query.ASCENDING
            query = query.order_by(order_by, direction=direction)
        if limit:
            query = query.limit(limit)

        results = []
        for doc in query.stream():
            data = doc.to_dict()
            data["id"] = doc.id
            results.append(data)
        return results
    except Exception as e:
        print(f"[!] Firestore query error on collection '{collection_name}': {e}")
        return []


def query_document_by_field(collection_name: str, field: str, value: Any) -> Optional[Dict[str, Any]]:
    """
    Finds a single document by matching a field value (case-sensitive).
    Used for admin login lookups by username on Vercel.
    """
    db = get_firestore_db()
    if not db:
        return None
    try:
        docs = db.collection(collection_name).where(field, "==", value).limit(1).stream()
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            return data
        return None
    except Exception as e:
        print(f"[!] Firestore query_by_field error on '{collection_name}'.{field}: {e}")
        return None


def query_document_by_field_ci(collection_name: str, field: str, value: str) -> Optional[Dict[str, Any]]:
    """
    Case-insensitive field lookup. Stores a lowercase shadow field for matching.
    Falls back to scanning all documents if shadow field not available.
    """
    db = get_firestore_db()
    if not db:
        return None
    try:
        # Try lowercase shadow field first (e.g., username_lower)
        shadow_field = f"{field}_lower"
        docs = db.collection(collection_name).where(shadow_field, "==", value.lower()).limit(1).stream()
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            return data

        # Fallback: direct field match (case-sensitive)
        docs = db.collection(collection_name).where(field, "==", value).limit(1).stream()
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            return data

        return None
    except Exception as e:
        print(f"[!] Firestore CI query error on '{collection_name}'.{field}: {e}")
        return None


def update_document(collection_name: str, doc_id: str, updates: Dict[str, Any]) -> bool:
    """Updates specific fields of a document in Firestore."""
    db = get_firestore_db()
    if not db:
        return False
    try:
        clean_updates = _serialize_for_firestore(updates)
        db.collection(collection_name).document(str(doc_id)).update(clean_updates)
        return True
    except Exception as e:
        print(f"[!] Firestore update error on collection '{collection_name}' [{doc_id}]: {e}")
        return False


def delete_document(collection_name: str, doc_id: str) -> bool:
    """Deletes a document from a Firestore collection."""
    db = get_firestore_db()
    if not db:
        return False
    try:
        db.collection(collection_name).document(str(doc_id)).delete()
        return True
    except Exception as e:
        print(f"[!] Firestore delete error on collection '{collection_name}' [{doc_id}]: {e}")
        return False


def wipe_collection(collection_name: str) -> int:
    """Deletes all documents in a Firestore collection."""
    db = get_firestore_db()
    if not db:
        return 0
    try:
        docs = db.collection(collection_name).stream()
        count = 0
        batch = db.batch()
        for doc in docs:
            batch.delete(doc.reference)
            count += 1
            if count % 400 == 0:
                batch.commit()
                batch = db.batch()
        if count % 400 != 0:
            batch.commit()
        return count
    except Exception as e:
        print(f"[!] Firestore wipe error on collection '{collection_name}': {e}")
        return 0


def get_next_id(collection_name: str) -> int:
    """
    Generates next auto-increment integer ID for a Firestore collection.
    Uses a counters collection to track the last used ID atomically.
    """
    db = get_firestore_db()
    if not db:
        return int(time.time() * 1000) % 999999  # Fallback: timestamp-based

    try:
        from google.cloud import firestore as fs_module
        counter_ref = db.collection("_counters").document(collection_name)

        @fs_module.transactional
        def increment_counter(transaction):
            snapshot = counter_ref.get(transaction=transaction)
            if snapshot.exists:
                current = snapshot.to_dict().get("last_id", 0)
            else:
                current = 0
            new_id = current + 1
            transaction.set(counter_ref, {"last_id": new_id})
            return new_id

        transaction = db.transaction()
        return increment_counter(transaction)
    except Exception as e:
        print(f"[!] Firestore get_next_id error for '{collection_name}': {e}")
        return int(time.time() * 1000) % 999999


def save_audit_log_firestore(ip_address: str, username: str, action: str, details: Optional[str] = None) -> bool:
    """Saves an audit log entry directly to Firestore (used on Vercel where SQLite is ephemeral)."""
    db = get_firestore_db()
    if not db:
        return False
    try:
        log_id = get_next_id("audit_logs")
        log_data = {
            "id": log_id,
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "ip_address": ip_address or "unknown",
            "username": username or "system",
            "action": action,
            "details": details,
        }
        db.collection("audit_logs").document(str(log_id)).set(log_data)
        return True
    except Exception as e:
        print(f"[!] Firestore audit log save error: {e}")
        return False


def _serialize_for_firestore(data: Dict[str, Any]) -> Dict[str, Any]:
    """Converts Python datetime objects to ISO strings for Firestore storage."""
    clean = {}
    for k, v in data.items():
        if isinstance(v, datetime.datetime):
            clean[k] = v.isoformat()
        elif isinstance(v, dict):
            clean[k] = _serialize_for_firestore(v)
        else:
            clean[k] = v
    return clean
