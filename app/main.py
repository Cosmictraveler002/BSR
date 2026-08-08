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

# Database tables initialization
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
    "https://bsr.vercel.app",
    "https://bsrv3.vercel.app",
    "https://www.bangalirsokherrannaghor.in",
    "https://bangalirsokherrannaghor.in"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if is_prod else ["*"],
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*bangalirsokherrannaghor\.in",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["X-DB-Revision", "X-DB-Last-Updated", "X-CSRF-Token"],
)

# Redirect /admin and /admin/ to admin.html
@app.get("/admin", include_in_schema=False)
@app.get("/admin/", include_in_schema=False)
def admin_redirect():
    return RedirectResponse(url="/admin.html", status_code=303)

# Mount Routers
app.include_router(public.router)
app.include_router(admin.router)
app.include_router(reservations_view.router)

from sqlalchemy import func, text

def init_db_and_seed_admin():
    """Initializes Database tables and seeds default admin accounts if not present."""
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

        # Seed default Orders if database table is empty
        if db.query(Order).count() == 0:
            sample_orders = [
                Order(
                    id="BSR-2026-A1B2",
                    customer_name="Anirban Roy",
                    customer_phone="+91 98765 43210",
                    order_type="Dine-In",
                    table_number="Table 04",
                    items_json=json.dumps([
                        {"id": "1", "name": "Sorshe Ilish", "price": 850.0, "qty": 1},
                        {"id": "6", "name": "Basmati Rice", "price": 120.0, "qty": 2},
                        {"id": "4", "name": "Artisanal Mishti", "price": 350.0, "qty": 1}
                    ]),
                    subtotal=1440.0,
                    discount=144.0,
                    coupon_code="BENGAL10",
                    total=1296.0,
                    status="Confirmed",
                    outlet_id="OUTLET-01"
                ),
                Order(
                    id="BSR-2026-C3D4",
                    customer_name="Priyanka Chatterjee",
                    customer_phone="+91 98310 12345",
                    order_type="Delivery",
                    delivery_address="A9, Phase 3, Kalyani, Nadia, WB - 741235",
                    items_json=json.dumps([
                        {"id": "2", "name": "Kosha Mangsho", "price": 750.0, "qty": 2},
                        {"id": "7", "name": "Luchi", "price": 40.0, "qty": 8}
                    ]),
                    subtotal=1820.0,
                    discount=0.0,
                    total=1820.0,
                    status="In Preparation",
                    outlet_id="OUTLET-01"
                )
            ]
            db.add_all(sample_orders)
            db.commit()
            for o in sample_orders:
                save_document("orders", o.id, o.to_dict())

        # Seed default Reservations if database table is empty
        if db.query(Reservation).count() == 0:
            today_str = datetime.date.today().isoformat()
            sample_res = [
                Reservation(
                    guest_name="Dr. Debasis Banerjee",
                    phone="+91 98300 99887",
                    email="debasis.b@example.com",
                    guests_count=4,
                    reservation_date=today_str,
                    reservation_time="07:30 PM (Dinner)",
                    special_request="Window table preferred",
                    event_type="Table Booking",
                    status="Confirmed",
                    outlet_id="OUTLET-01"
                ),
                Reservation(
                    guest_name="Sutapa Sengupta",
                    phone="+91 91234 56789",
                    email="sutapa.s@example.com",
                    guests_count=6,
                    reservation_date=today_str,
                    reservation_time="01:30 PM (Lunch)",
                    special_request="Anniversary celebration setup",
                    event_type="Table Booking",
                    status="Pending",
                    outlet_id="OUTLET-01"
                )
            ]
            db.add_all(sample_res)
            db.commit()
            for r in sample_res:
                save_document("reservations", str(r.id), r.to_dict())

        # Seed default Employees if database table is empty
        if db.query(Employee).count() == 0:
            sample_emp = [
                Employee(
                    name="Subhashish Roy",
                    position="Head Chef",
                    department="Kitchen",
                    phone="+91 98000 11111",
                    status="Active",
                    outlet_id="OUTLET-01"
                ),
                Employee(
                    name="Rupali Maitra",
                    position="Floor Manager",
                    department="Service",
                    phone="+91 98000 22222",
                    status="Active",
                    outlet_id="OUTLET-01"
                )
            ]
            db.add_all(sample_emp)
            db.commit()
            for e in sample_emp:
                save_document("employees", str(e.id), e.to_dict())

    except Exception as e:
        print(f"Error seeding admin user: {e}")
    finally:
        db.close()

# Execute DB initialization immediately
init_db_and_seed_admin()

@app.on_event("startup")
def startup_event():
    init_db_and_seed_admin()

# Serve static web frontend files
app.mount("/", StaticFiles(directory=".", html=True), name="static")

