"""
Firestore Helper Utilities for BSR Database
Provides clean CRUD operations for Firestore collections with fallback options.
"""

import time
from typing import Dict, List, Optional, Any
from app.database import get_firestore_db


def save_document(collection_name: str, doc_id: str, data: Dict[str, Any]) -> bool:
    """Saves or updates a document in a Firestore collection."""
    db = get_firestore_db()
    if not db:
        return False
    try:
        db.collection(collection_name).document(str(doc_id)).set(data, merge=True)
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


def update_document(collection_name: str, doc_id: str, updates: Dict[str, Any]) -> bool:
    """Updates specific fields of a document in Firestore."""
    db = get_firestore_db()
    if not db:
        return False
    try:
        db.collection(collection_name).document(str(doc_id)).update(updates)
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
