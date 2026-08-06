import os
import datetime
from fastapi import FastAPI, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.security import get_password_hash, log_audit
from app.database import engine, Base, SessionLocal
from app.models import AdminUser
from app.routers import public, admin

# Database tables initialization
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Custom Security Headers Middleware
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
        return response

app.add_middleware(SecurityHeadersMiddleware)

# Enable CORS for frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(public.router)
app.include_router(admin.router)

@app.on_event("startup")
def startup_event():
    """Initializes Database tables and seeds default admin user if not present."""
    db = SessionLocal()
    try:
        existing_admin = db.query(AdminUser).filter(AdminUser.username == settings.DEFAULT_ADMIN_USER).first()
        if not existing_admin:
            hashed_pw = get_password_hash(settings.DEFAULT_ADMIN_PASS)
            default_admin = AdminUser(
                username=settings.DEFAULT_ADMIN_USER,
                hashed_password=hashed_pw,
                is_active=True,
                created_at=datetime.datetime.utcnow()
            )
            db.add(default_admin)
            db.commit()
            print(f"[+] [BSR Security] Initialized default admin account '{settings.DEFAULT_ADMIN_USER}'.")
            log_audit(db, "127.0.0.1", "SYSTEM", "ADMIN_ACCOUNT_INITIALIZED", f"Seeded initial admin user '{settings.DEFAULT_ADMIN_USER}'")
    except Exception as e:
        print(f"Error seeding admin user: {e}")
    finally:
        db.close()

# Serve static web frontend files
app.mount("/", StaticFiles(directory=".", html=True), name="static")
