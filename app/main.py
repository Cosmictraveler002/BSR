import os
import datetime
from fastapi import FastAPI, Request, Response
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.security import get_password_hash, log_audit
from app.core.db_sync import attach_db_revision_headers
from app.database import engine, Base, SessionLocal
from app.models import AdminUser
from app.routers import public, admin, reservations_view

# Database tables initialization (SQLite — only locally, skipped on Vercel)
if not settings.IS_VERCEL:
    Base.metadata.create_all(bind=engine)

is_prod = settings.ENVIRONMENT.lower() == "production"

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs" if not is_prod else None,
    redoc_url="/redoc" if not is_prod else None
)

# Custom Security & DB Revision Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; "
            "frame-ancestors 'none';"
        )
        attach_db_revision_headers(response)
        return response

app.add_middleware(SecurityHeadersMiddleware)

# Enable CORS for frontend applications
allowed_origins = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://bsr.vercel.app"
] if is_prod else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if is_prod else [],
    allow_origin_regex=r"https://.*\.vercel\.app" if is_prod else r".*",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["X-DB-Revision", "X-DB-Last-Updated", "X-CSRF-Token"],
)

from fastapi.responses import RedirectResponse, FileResponse

# Redirect /admin and /admin/ to admin.html
@app.get("/admin", include_in_schema=False)
@app.get("/admin/", include_in_schema=False)
def admin_redirect():
    return RedirectResponse(url="/admin.html", status_code=303)

@app.get("/admin.html", include_in_schema=False)
def serve_admin_page():
    if os.path.exists("admin.html"):
        return FileResponse("admin.html")
    return RedirectResponse(url="/")

# Mount Routers
app.include_router(public.router)
app.include_router(admin.router)
app.include_router(reservations_view.router)

from sqlalchemy import func, text

def init_db_and_seed_admin():
    """Initializes Database tables and seeds default admin accounts if not present."""
    if settings.IS_VERCEL:
        # On Vercel: seed admin accounts directly into Firestore
        _seed_admin_firestore()
        return

    # Local development: seed via SQLite + sync to Firestore
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Schema migration check: ensure role and outlet_id columns exist
        for table_name in ["admin_users", "orders", "reservations", "private_events", "employees"]:
            try:
                db.execute(text(f"ALTER TABLE {table_name} ADD COLUMN role VARCHAR(50) DEFAULT 'Super Admin'"))
                db.commit()
            except Exception:
                db.rollback()
            try:
                db.execute(text(f"ALTER TABLE {table_name} ADD COLUMN outlet_id VARCHAR(50) DEFAULT 'OUTLET-01'"))
                db.commit()
            except Exception:
                db.rollback()

        # Seed/ensure 'admin' account exists
        admin_acc = db.query(AdminUser).filter(func.lower(AdminUser.username) == "admin").first()
        if not admin_acc:
            hashed_admin = get_password_hash("bsr@admin2026")
            admin_acc = AdminUser(
                username="admin",
                hashed_password=hashed_admin,
                role="Super Admin",
                is_active=True,
                created_at=datetime.datetime.utcnow()
            )
            db.add(admin_acc)
            db.commit()
            db.refresh(admin_acc)
            print("[+] [BSR Security] Initialized default admin account 'admin'.")

        from app.core.firestore_db import save_document
        if admin_acc:
            save_document("admin_users", str(admin_acc.id or "admin"), admin_acc.to_dict())

        # Seed/ensure 'SuperAdmin' account exists
        super_acc = db.query(AdminUser).filter(func.lower(AdminUser.username) == "superadmin").first()
        if not super_acc:
            hashed_super = get_password_hash("bSr@admin2869")
            super_acc = AdminUser(
                username="SuperAdmin",
                hashed_password=hashed_super,
                role="Super Admin",
                is_active=True,
                created_at=datetime.datetime.utcnow()
            )
            db.add(super_acc)
            db.commit()
            db.refresh(super_acc)
            print("[+] [BSR Security] Initialized SuperAdmin account 'SuperAdmin'.")

        if super_acc:
            save_document("admin_users", str(super_acc.id or "SuperAdmin"), super_acc.to_dict())

    except Exception as e:
        print(f"Error seeding admin user: {e}")
    finally:
        db.close()


def _seed_admin_firestore():
    """Seeds default admin accounts directly into Firestore (Vercel production)."""
    from app.core.firestore_db import get_document, save_document
    try:
        # Check if admin account already exists in Firestore
        admin_doc = get_document("admin_users", "admin")
        if not admin_doc:
            hashed_admin = get_password_hash("bsr@admin2026")
            admin_data = {
                "id": "admin",
                "username": "admin",
                "username_lower": "admin",
                "hashed_password": hashed_admin,
                "role": "Super Admin",
                "outlet_id": "OUTLET-01",
                "is_active": True,
                "created_at": datetime.datetime.utcnow().isoformat(),
                "last_login": None,
            }
            save_document("admin_users", "admin", admin_data)
            print("[+] [BSR Vercel] Seeded default admin account to Firestore.")

        # Check if SuperAdmin account already exists
        super_doc = get_document("admin_users", "SuperAdmin")
        if not super_doc:
            hashed_super = get_password_hash("bSr@admin2869")
            super_data = {
                "id": "SuperAdmin",
                "username": "SuperAdmin",
                "username_lower": "superadmin",
                "hashed_password": hashed_super,
                "role": "Super Admin",
                "outlet_id": "OUTLET-01",
                "is_active": True,
                "created_at": datetime.datetime.utcnow().isoformat(),
                "last_login": None,
            }
            save_document("admin_users", "SuperAdmin", super_data)
            print("[+] [BSR Vercel] Seeded SuperAdmin account to Firestore.")

    except Exception as e:
        print(f"[!] [BSR Vercel] Error seeding admin to Firestore: {e}")


# Execute DB initialization immediately
init_db_and_seed_admin()

@app.on_event("startup")
def startup_event():
    init_db_and_seed_admin()

# Serve static web frontend files
app.mount("/", StaticFiles(directory=".", html=True), name="static")

