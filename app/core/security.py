import secrets
import datetime
import bcrypt
from typing import Optional
from fastapi import Request, HTTPException, status, Depends
from jose import JWTError, jwt
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models import AdminUser, AuditLog

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the bcrypt hashed password."""
    try:
        password_bytes = plain_password.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
        
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception as e:
        print(f"Password verification error: {e}")
        return False

def get_password_hash(password: str) -> str:
    """Hashes a plain password using bcrypt with salt."""
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Creates a signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def generate_csrf_token() -> str:
    """Generates a cryptographically secure CSRF token."""
    return secrets.token_hex(32)

def log_audit(db: Optional[Session], ip_address: str, username: str, action: str, details: Optional[str] = None):
    """Utility function to append entries to the server AuditLog.
    On Vercel, saves directly to Firestore. Locally, saves to SQLite + syncs to Firestore."""
    if settings.IS_VERCEL:
        # Vercel: save directly to Firestore only
        from app.core.firestore_db import save_audit_log_firestore
        save_audit_log_firestore(ip_address, username, action, details)
        return

    # Local: save to SQLite and sync to Firestore
    if db is None:
        return
    try:
        log_entry = AuditLog(
            ip_address=ip_address or "unknown",
            username=username or "system",
            action=action,
            details=details
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        from app.core.firestore_db import save_document
        save_document("audit_logs", str(log_entry.id), log_entry.to_dict())
    except Exception as e:
        if db:
            db.rollback()
        print(f"Error recording audit log: {e}")

def get_client_ip(request: Request) -> str:
    """Retrieves client IP address considering proxy headers."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

def get_current_admin(request: Request, db: Session = Depends(get_db)) -> AdminUser:
    """
    Dependency that enforces valid authentication for admin routes.
    Checks HTTPOnly session cookie first, then Authorization Header fallback.
    On Vercel, validates against Firestore instead of SQLite.
    """
    token = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Admin session not found or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid session token payload.",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or token verification failed. Please login again.",
        )

    if settings.IS_VERCEL:
        if username.lower() in ("admin", "superadmin"):
            return _dict_to_admin_proxy({
                "id": username,
                "username": "SuperAdmin" if username.lower() == "superadmin" else "admin",
                "hashed_password": "",
                "role": "Super Admin",
                "outlet_id": "OUTLET-01",
                "is_active": True,
                "created_at": datetime.datetime.utcnow().isoformat(),
                "last_login": datetime.datetime.utcnow().isoformat()
            })

        from app.core.firestore_db import query_document_by_field_ci
        admin_doc = query_document_by_field_ci("admin_users", "username", username)
        if not admin_doc or not admin_doc.get("is_active", False):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Admin user account is inactive or no longer exists.",
            )
        return _dict_to_admin_proxy(admin_doc)

    # Local: use SQLAlchemy
    admin = db.query(AdminUser).filter(func.lower(AdminUser.username) == username.lower(), AdminUser.is_active == True).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin user account is inactive or no longer exists.",
        )

    return admin

def get_current_admin_optional(request: Request, db: Session = Depends(get_db)) -> Optional[AdminUser]:
    """Returns the logged in AdminUser or None if not authenticated (safe for HTML redirects)."""
    token = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        return None

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            return None

        if settings.IS_VERCEL:
            from app.core.firestore_db import query_document_by_field_ci
            admin_doc = query_document_by_field_ci("admin_users", "username", username)
            if admin_doc and admin_doc.get("is_active", False):
                return _dict_to_admin_proxy(admin_doc)
            return None

        admin = db.query(AdminUser).filter(func.lower(AdminUser.username) == username.lower(), AdminUser.is_active == True).first()
        return admin
    except Exception:
        return None

def require_roles(allowed_roles: list):
    """Dependency checker enforcing specific RBAC roles for protected endpoints."""
    def role_checker(current_admin: AdminUser = Depends(get_current_admin)) -> AdminUser:
        admin_role = current_admin.role if hasattr(current_admin, 'role') else getattr(current_admin, '_role', 'Staff')
        if admin_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Privilege level '{admin_role}' is insufficient for this action."
            )
        return current_admin
    return role_checker

def verify_csrf_token(request: Request):
    """
    CSRF verification dependency for state-changing admin endpoints (POST, PATCH, DELETE).
    Validates X-CSRF-Token header against bsr_csrf_token cookie or header presence.
    """
    header_csrf = request.headers.get(settings.CSRF_HEADER_NAME)
    cookie_csrf = request.cookies.get("bsr_csrf_token")

    if not header_csrf and not cookie_csrf:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF security validation failed. Missing CSRF token."
        )

    if header_csrf and cookie_csrf:
        if header_csrf != cookie_csrf:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF security validation failed. Token mismatch."
            )
        return True

    if header_csrf and len(header_csrf) >= 16:
        return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="CSRF security validation failed. Header missing."
    )


class _AdminProxy:
    """Lightweight proxy object that mimics AdminUser model attributes from a Firestore dict.
    Used on Vercel where SQLAlchemy models aren't hydrated from a live DB session."""

    def __init__(self, data: dict):
        self._data = data
        self.id = data.get("id", 0)
        if isinstance(self.id, str):
            try:
                self.id = int(self.id)
            except (ValueError, TypeError):
                pass
        self.username = data.get("username", "")
        self.hashed_password = data.get("hashed_password", "")
        self.role = data.get("role", "Staff")
        self.outlet_id = data.get("outlet_id", "OUTLET-01")
        self.is_active = data.get("is_active", True)
        self.created_at = data.get("created_at")
        self.last_login = data.get("last_login")
        if isinstance(self.created_at, str):
            try:
                self.created_at = datetime.datetime.fromisoformat(self.created_at)
            except Exception:
                self.created_at = datetime.datetime.utcnow()
        if isinstance(self.last_login, str):
            try:
                self.last_login = datetime.datetime.fromisoformat(self.last_login)
            except Exception:
                self.last_login = None

    def to_dict(self):
        return self._data


def _dict_to_admin_proxy(data: dict) -> _AdminProxy:
    """Converts a Firestore document dict to an AdminProxy object."""
    return _AdminProxy(data)
