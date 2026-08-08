import time
from typing import Dict
from fastapi import Response, Request

# Global thread-safe DB revision state tracking
_DB_STATE: Dict[str, float] = {
    "version": 1,
    "last_updated": time.time()
}

def bump_db_revision() -> int:
    """
    Increments the database revision version counter and timestamp
    whenever any entry (order, reservation, event, employee, user) is created, modified, or deleted.
    """
    global _DB_STATE
    _DB_STATE["version"] += 1
    _DB_STATE["last_updated"] = time.time()
    return int(_DB_STATE["version"])

def get_db_revision() -> Dict[str, float]:
    """Returns the current database revision state."""
    return _DB_STATE

def attach_db_revision_headers(response: Response):
    """
    Attaches X-DB-Revision and X-DB-Last-Updated HTTP response headers
    and exposes them for cross-origin or remote database hosting.
    """
    state = get_db_revision()
    response.headers["X-DB-Revision"] = str(int(state["version"]))
    response.headers["X-DB-Last-Updated"] = str(int(state["last_updated"]))
    
    # Expose custom response headers so client JS can read them in CORS/remote deployments
    existing_expose = response.headers.get("Access-Control-Expose-Headers", "")
    headers_to_expose = ["X-DB-Revision", "X-DB-Last-Updated", "X-CSRF-Token"]
    if existing_expose:
        for h in headers_to_expose:
            if h not in existing_expose:
                existing_expose += f", {h}"
        response.headers["Access-Control-Expose-Headers"] = existing_expose
    else:
        response.headers["Access-Control-Expose-Headers"] = ", ".join(headers_to_expose)
