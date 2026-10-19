import json
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    generate_csrf_token, verify_csrf_token, log_audit, get_client_ip, get_current_admin, require_roles, enforce_outlet_rls
)
from app.core.db_sync import bump_db_revision, get_db_revision, attach_db_revision_headers
from app.database import get_db
from app.models import AdminUser, Employee, Order, Reservation, PrivateEvent, AuditLog
from app.core.firestore_db import (
    save_document, update_document, delete_document, wipe_collection,
    get_document, query_documents, query_document_by_field_ci, get_next_id
)
from app.schemas import (
    AdminLogin, TokenOut, AdminCreate, AdminRoleUpdate, AdminOutletUpdate, AdminPasswordReset, AdminUserOut,
    EmployeeCreate, EmployeeOut, EmployeeStatusUpdate,
    OrderOut, OrderItemSchema, OrderStatusUpdate,
    ReservationOut, ReservationStatusUpdate,
    PrivateEventOut, PrivateEventStatusUpdate,
    ChangePassword, AuditLogOut, BatchDeleteSchema
)

from app.core.limiter import limiter

router = APIRouter(prefix="/api/admin", tags=["Admin Protected API"])

# In-memory rate limiting tracker for failed login attempts
LOGIN_ATTEMPTS = {}

def reset_login_rate_limits():
    """Resets all login rate limiting attempt records (used in unit tests)."""
    LOGIN_ATTEMPTS.clear()

def check_rate_limit(ip_address: str):
    """Enforces rate limiting on login endpoint per IP address."""
    now = datetime.datetime.utcnow()
    cutoff = now - datetime.timedelta(seconds=settings.LOGIN_LOCKOUT_SECONDS)
    
    attempts = [t for t in LOGIN_ATTEMPTS.get(ip_address, []) if t > cutoff]
    LOGIN_ATTEMPTS[ip_address] = attempts

    if len(attempts) >= settings.MAX_FAILED_LOGIN_ATTEMPTS:
        oldest_attempt = min(attempts)
        seconds_left = int((oldest_attempt + datetime.timedelta(seconds=settings.LOGIN_LOCKOUT_SECONDS) - now).total_seconds())
        seconds_left = max(1, seconds_left)
        headers = {"Retry-After": str(seconds_left)}
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Please wait {seconds_left} seconds before trying again.",
            headers=headers
        )

def record_failed_attempt(ip_address: str):
    """Records a failed login timestamp for the given IP address."""
    if ip_address not in LOGIN_ATTEMPTS:
        LOGIN_ATTEMPTS[ip_address] = []
    LOGIN_ATTEMPTS[ip_address].append(datetime.datetime.utcnow())

@router.post("/login", response_model=TokenOut)
@limiter.limit(settings.ADMIN_LOGIN_RATE_LIMIT)
def admin_login(payload: AdminLogin, request: Request, response: Response, db: Session = Depends(get_db)):
    """
    Authenticates admin user, sets HttpOnly secure session cookie, and generates CSRF token.
    Rate-limited per IP address and failed attempt count.
    """

    ip = get_client_ip(request)
    check_rate_limit(ip)

    username = payload.username.strip()
    password = payload.password.strip()

    admin_username = None
    admin_hashed_pw = None
    admin_role = "Super Admin"

    if settings.IS_VERCEL:
        # Master default credentials check (Guarantees authentication regardless of Firestore state)
        if username.lower() == "admin" and password == "bsr@admin2026":
            admin_username = "admin"
            admin_role = "Super Admin"
            save_document("admin_users", "admin", {
                "id": "admin",
                "username": "admin",
                "username_lower": "admin",
                "hashed_password": get_password_hash("bsr@admin2026"),
                "role": "Super Admin",
                "outlet_id": "OUTLET-01",
                "is_active": True,
                "created_at": datetime.datetime.utcnow().isoformat(),
                "last_login": datetime.datetime.utcnow().isoformat()
            })
        elif username.lower() == "superadmin" and password == "bSr@admin2869":
            admin_username = "SuperAdmin"
            admin_role = "Super Admin"
            save_document("admin_users", "SuperAdmin", {
                "id": "SuperAdmin",
                "username": "SuperAdmin",
                "username_lower": "superadmin",
                "hashed_password": get_password_hash("bSr@admin2869"),
                "role": "Super Admin",
                "outlet_id": "OUTLET-01",
                "is_active": True,
                "created_at": datetime.datetime.utcnow().isoformat(),
                "last_login": datetime.datetime.utcnow().isoformat()
            })
        else:
            admin_doc = query_document_by_field_ci("admin_users", "username", username)
            if not admin_doc:
                record_failed_attempt(ip)
                log_audit(db, ip, username, "FAILED_LOGIN", f"Invalid login credentials attempt for user '{username}'")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Admin Username or Password!"
                )
            if not admin_doc.get("is_active", True):
                record_failed_attempt(ip)
                log_audit(db, ip, username, "FAILED_LOGIN", f"Inactive account login attempt for user '{username}'")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Admin account is inactive."
                )

            admin_username = admin_doc.get("username", username)
            admin_hashed_pw = admin_doc.get("hashed_password", "")
            admin_role = admin_doc.get("role", "Super Admin")
            doc_id = admin_doc.get("id", admin_username)

            if not verify_password(password, admin_hashed_pw):
                record_failed_attempt(ip)
                log_audit(db, ip, username, "FAILED_LOGIN", f"Invalid login credentials attempt for user '{username}'")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Admin Username or Password!"
                )

            update_document("admin_users", str(doc_id), {"last_login": datetime.datetime.utcnow().isoformat()})

    else:
        admin = db.query(AdminUser).filter(func.lower(AdminUser.username) == username.lower(), AdminUser.is_active == True).first()
        if not admin or not verify_password(password, admin.hashed_password):
            record_failed_attempt(ip)
            log_audit(db, ip, username, "FAILED_LOGIN", f"Invalid login credentials attempt for user '{username}'")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Admin Username or Password!"
            )

        admin_username = admin.username
        admin_role = admin.role or "Super Admin"
        admin.last_login = datetime.datetime.utcnow()
        db.commit()

    if ip in LOGIN_ATTEMPTS:
        del LOGIN_ATTEMPTS[ip]

    access_token = create_access_token(data={"sub": admin_username})
    csrf_token = generate_csrf_token()

    log_audit(db, ip, admin_username, "SUCCESSFUL_LOGIN", "Master Admin authenticated successfully.")

    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )

    response.set_cookie(
        key="bsr_csrf_token",
        value=csrf_token,
        httponly=False,
        samesite="lax",
        secure=False,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )

    return TokenOut(
        message="Authentication successful.",
        username=admin_username,
        role=admin_role,
        csrf_token=csrf_token,
        access_token=access_token
    )

@router.post("/logout")
def admin_logout(request: Request, response: Response, current_admin: AdminUser = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Logs out admin by clearing HTTPOnly session cookie."""
    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "LOGOUT", "Admin logged out.")

    response.delete_cookie(key=settings.COOKIE_NAME, path="/")
    response.delete_cookie(key="bsr_csrf_token", path="/")
    return {"message": "Admin session logged out successfully."}

@router.get("/me")
def get_admin_me(request: Request, response: Response, current_admin: AdminUser = Depends(get_current_admin)):
    """Returns information about current logged-in admin session and ensures CSRF token availability."""
    csrf_token = request.cookies.get("bsr_csrf_token")
    if not csrf_token:
        csrf_token = generate_csrf_token()
        response.set_cookie(
            key="bsr_csrf_token",
            value=csrf_token,
            httponly=False,
            samesite="lax",
            secure=False,
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            path="/"
        )

    return {
        "authenticated": True,
        "username": current_admin.username,
        "role": getattr(current_admin, 'role', 'Super Admin'),
        "last_login": getattr(current_admin, 'last_login', None),
        "created_at": getattr(current_admin, 'created_at', None),
        "csrf_token": csrf_token
    }

@router.api_route("/sync-status", methods=["GET", "HEAD"])
def get_admin_sync_status(response: Response):
    """Lightweight sync status endpoint for client auto-refresh polling schedule."""
    state = get_db_revision()
    attach_db_revision_headers(response)
    return {
        "db_version": int(state["version"]),
        "last_updated": int(state["last_updated"])
    }

def _parse_datetime(val):
    if isinstance(val, datetime.datetime):
        return val
    if isinstance(val, str):
        try:
            return datetime.datetime.fromisoformat(val)
        except Exception:
            pass
    return datetime.datetime.utcnow()

def normalize_outlet_code(raw: Optional[str]) -> str:
    if not raw:
        return "KL01"
    clean = raw.strip().upper()
    mapping = {
        "OUTLET-01": "KL01", "OUTLET-02": "KL02", "OUTLET-03": "KL03",
        "KL01": "KL01", "KL02": "KL02", "KL03": "KL03",
        "MM01": "MM01", "OUTLET-MM01": "MM01", "MM-01": "MM01"
    }
    return mapping.get(clean, clean)

def get_outlet_search_variants(outlet_code: Optional[str]) -> List[str]:
    """Returns both standard and legacy forms (e.g. ['KL01', 'OUTLET-01'], ['MM01', 'OUTLET-MM01'])."""
    if not outlet_code or outlet_code == "ALL":
        return []
    code = normalize_outlet_code(outlet_code)
    reverse_map = {
        "KL01": "OUTLET-01",
        "KL02": "OUTLET-02",
        "KL03": "OUTLET-03",
        "MM01": "OUTLET-MM01"
    }
    variants = [code]
    if code in reverse_map:
        variants.append(reverse_map[code])
    return variants

@router.get("/orders", response_model=List[OrderOut])
def get_admin_orders(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    type_filter: Optional[str] = None,
    outlet_filter: Optional[str] = None,
    brand_filter: Optional[str] = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Fetches orders from database/Firestore with search query and status/type/outlet/brand filtering."""
    admin_role = getattr(current_admin, "role", "Staff") or "Staff"
    admin_outlet = getattr(current_admin, "outlet_id", "KL01") or "KL01"
    if admin_role not in ("Super Admin", "Super Manager"):
        outlet_filter = admin_outlet

    outlet_variants = get_outlet_search_variants(outlet_filter)

    if settings.IS_VERCEL:
        raw_docs = query_documents("orders", limit=200)
        filtered = []
        for o in raw_docs:
            if status_filter and status_filter != "ALL" and o.get("status") != status_filter:
                continue
            if type_filter and type_filter != "ALL" and o.get("order_type") != type_filter:
                continue
            if outlet_variants:
                o_outlet = o.get("outlet_id", "KL01")
                if o_outlet not in outlet_variants and normalize_outlet_code(o_outlet) not in outlet_variants:
                    continue

            # Brand filtering
            if brand_filter and brand_filter.lower() != "all":
                b_target = brand_filter.lower()
                is_cafe = (o.get("brand") == "cafe") or str(o.get("id", "")).startswith("MM-")
                if b_target == "cafe" and not is_cafe:
                    continue
                if b_target == "restaurant" and is_cafe:
                    continue

            if search:
                s_lower = search.strip().lower()
                c_name = o.get("customer_name", "").lower()
                c_phone = o.get("customer_phone", "").lower()
                oid = str(o.get("id", "")).lower()
                if s_lower not in c_name and s_lower not in c_phone and s_lower not in oid:
                    continue

            items = [OrderItemSchema(**i) for i in json.loads(o.get("items_json", "[]"))]
            o_id = o["id"]
            o_brand = o.get("brand", "cafe" if str(o_id).startswith("MM-") else "restaurant")
            filtered.append(
                OrderOut(
                    id=o_id,
                    customer_name=o.get("customer_name", ""),
                    customer_phone=o.get("customer_phone", ""),
                    order_type=o.get("order_type", "Delivery"),
                    delivery_address=o.get("delivery_address"),
                    table_number=o.get("table_number"),
                    items=items,
                    subtotal=o.get("subtotal", 0.0),
                    discount=o.get("discount", 0.0),
                    coupon_code=o.get("coupon_code"),
                    total=o.get("total", 0.0),
                    status=o.get("status", "Confirmed"),
                    outlet_id=normalize_outlet_code(o.get("outlet_id", "KL01")),
                    brand=o_brand,
                    created_at=_parse_datetime(o.get("created_at"))
                )
            )
        filtered.sort(key=lambda x: x.created_at, reverse=True)
        return filtered

    query = db.query(Order)
    if status_filter and status_filter != "ALL":
        query = query.filter(Order.status == status_filter)
    if type_filter and type_filter != "ALL":
        query = query.filter(Order.order_type == type_filter)
    if outlet_variants:
        query = query.filter(Order.outlet_id.in_(outlet_variants))
    if brand_filter and brand_filter.lower() != "all":
        if brand_filter.lower() == "cafe":
            query = query.filter((Order.brand == "cafe") | (Order.id.like("MM-%")))
        elif brand_filter.lower() == "restaurant":
            query = query.filter((Order.brand != "cafe") & (~Order.id.like("MM-%")))
    if search:
        search_term = f"%{search.strip().lower()}%"
        query = query.filter(
            (Order.id.ilike(search_term)) |
            (Order.customer_name.ilike(search_term)) |
            (Order.customer_phone.ilike(search_term))
        )

    orders = query.order_by(Order.created_at.desc()).all()
    result = []
    for o in orders:
        items = [OrderItemSchema(**i) for i in json.loads(o.items_json)]
        o_brand = getattr(o, "brand", None) or ("cafe" if str(o.id).startswith("MM-") else "restaurant")
        result.append(
            OrderOut(
                id=o.id,
                customer_name=o.customer_name,
                customer_phone=o.customer_phone,
                order_type=o.order_type,
                delivery_address=o.delivery_address,
                table_number=o.table_number,
                items=items,
                subtotal=o.subtotal,
                discount=o.discount,
                coupon_code=o.coupon_code,
                total=o.total,
                status=o.status,
                outlet_id=normalize_outlet_code(o.outlet_id or "KL01"),
                brand=o_brand,
                created_at=o.created_at
            )
        )
    return result

@router.patch("/orders/{order_id}/status", response_model=OrderOut, dependencies=[Depends(verify_csrf_token)])
def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Updates order status in database and logs audit event."""
    target_outlet = None
    fs_doc = get_document("orders", order_id)
    if fs_doc:
        target_outlet = fs_doc.get("outlet_id")
    elif not settings.IS_VERCEL:
        existing = db.query(Order).filter(Order.id == order_id).first()
        if existing:
            target_outlet = existing.outlet_id

    enforce_outlet_rls(current_admin, target_outlet)

    update_document("orders", order_id, {"status": payload.status})

    bump_db_revision()

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "UPDATE_ORDER_STATUS", f"Changed order '{order_id}' status to '{payload.status}'")

    fs_doc = get_document("orders", order_id)
    if fs_doc:
        items = [OrderItemSchema(**i) for i in json.loads(fs_doc.get("items_json", "[]"))]
        return OrderOut(
            id=fs_doc["id"],
            customer_name=fs_doc.get("customer_name", ""),
            customer_phone=fs_doc.get("customer_phone", ""),
            order_type=fs_doc.get("order_type", "Delivery"),
            delivery_address=fs_doc.get("delivery_address"),
            table_number=fs_doc.get("table_number"),
            items=items,
            subtotal=fs_doc.get("subtotal", 0.0),
            discount=fs_doc.get("discount", 0.0),
            coupon_code=fs_doc.get("coupon_code"),
            total=fs_doc.get("total", 0.0),
            status=payload.status,
            outlet_id=fs_doc.get("outlet_id", "OUTLET-01"),
            created_at=_parse_datetime(fs_doc.get("created_at"))
        )

    if not settings.IS_VERCEL:
        order = db.query(Order).filter(Order.id == order_id).first()
        if order:
            order.status = payload.status
            db.commit()
            db.refresh(order)
            items = [OrderItemSchema(**i) for i in json.loads(order.items_json)]
            return OrderOut(
                id=order.id,
                customer_name=order.customer_name,
                customer_phone=order.customer_phone,
                order_type=order.order_type,
                delivery_address=order.delivery_address,
                table_number=order.table_number,
                items=items,
                subtotal=order.subtotal,
                discount=order.discount,
                coupon_code=order.coupon_code,
                total=order.total,
                status=order.status,
                outlet_id=order.outlet_id or "OUTLET-01",
                created_at=order.created_at
            )

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Order '{order_id}' not found.")

@router.delete("/orders/{order_id}", dependencies=[Depends(verify_csrf_token)])
def delete_order(
    order_id: str,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Deletes a specific order from database."""
    delete_document("orders", order_id)
    bump_db_revision()

    if not settings.IS_VERCEL:
        order = db.query(Order).filter(Order.id == order_id).first()
        if order:
            db.delete(order)
            db.commit()

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "DELETE_ORDER", f"Deleted order record '{order_id}'")
    return {"message": f"Order '{order_id}' deleted successfully."}

@router.delete("/orders", dependencies=[Depends(verify_csrf_token)])
def wipe_all_orders(
    request: Request,
    brand_filter: Optional[str] = None,
    current_admin: AdminUser = Depends(require_roles(["Super Admin"])),
    db: Session = Depends(get_db)
):
    """Wipes orders from database with brand scoping (Super Admin only)."""
    count = 0
    b_target = (brand_filter or "").strip().lower()

    if b_target in ("cafe", "restaurant"):
        if settings.IS_VERCEL:
            raw_docs = query_documents("orders", limit=500)
            for doc in raw_docs:
                oid = doc.get("id", "")
                is_cafe = (doc.get("brand") == "cafe") or str(oid).startswith("MM-")
                if (b_target == "cafe" and is_cafe) or (b_target == "restaurant" and not is_cafe):
                    delete_document("orders", oid)
                    count += 1
        else:
            if b_target == "cafe":
                orders_to_del = db.query(Order).filter((Order.brand == "cafe") | (Order.id.like("MM-%"))).all()
            else:
                orders_to_del = db.query(Order).filter((Order.brand != "cafe") & (~Order.id.like("MM-%"))).all()
            count = len(orders_to_del)
            for o in orders_to_del:
                db.delete(o)
            db.commit()
    else:
        count = wipe_collection("orders")
        if not settings.IS_VERCEL:
            count = db.query(Order).delete()
            db.commit()

    bump_db_revision()
    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "WIPE_DATABASE", f"Wiped {count} order records (brand_filter: '{b_target or 'ALL'}').")
    return {"message": f"Successfully wiped {count} order records.", "count": count}

@router.post("/orders/batch-delete", dependencies=[Depends(verify_csrf_token)])
def batch_delete_orders(
    payload: BatchDeleteSchema,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Deletes selected orders by ID from database and Firestore."""
    count = 0
    for oid in payload.ids:
        delete_document("orders", oid)
        if not settings.IS_VERCEL:
            order = db.query(Order).filter(Order.id == oid).first()
            if order:
                db.delete(order)
        count += 1

    if not settings.IS_VERCEL:
        db.commit()

    bump_db_revision()
    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "BATCH_DELETE_ORDERS", f"Batch deleted {count} selected order(s).")
    return {"message": f"Successfully deleted {count} order(s).", "count": count}

@router.get("/reservations", response_model=List[ReservationOut])
def get_admin_reservations(
    search: Optional[str] = None,
    outlet_filter: Optional[str] = None,
    brand_filter: Optional[str] = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Fetches list of table reservations with optional search, brand, and outlet filtering."""
    admin_role = getattr(current_admin, "role", "Staff") or "Staff"
    admin_outlet = getattr(current_admin, "outlet_id", "KL01") or "KL01"
    if admin_role not in ("Super Admin", "Super Manager"):
        outlet_filter = admin_outlet

    outlet_variants = get_outlet_search_variants(outlet_filter)

    if settings.IS_VERCEL:
        raw_docs = query_documents("reservations", limit=200)
        filtered = []
        for r in raw_docs:
            if outlet_variants:
                r_outlet = r.get("outlet_id", "KL01")
                if r_outlet not in outlet_variants and normalize_outlet_code(r_outlet) not in outlet_variants:
                    continue

            if brand_filter and brand_filter.lower() != "all":
                r_brand = r.get("brand", "restaurant")
                if r_brand != brand_filter.lower():
                    continue

            if search:
                s_lower = search.strip().lower()
                g_name = r.get("guest_name", "").lower()
                phone = r.get("phone", "").lower()
                email = (r.get("email") or "").lower()
                req = (r.get("special_request") or "").lower()
                if s_lower not in g_name and s_lower not in phone and s_lower not in email and s_lower not in req:
                    continue

            filtered.append(
                ReservationOut(
                    id=int(r.get("id", 0)),
                    guest_name=r.get("guest_name", ""),
                    phone=r.get("phone", ""),
                    email=r.get("email"),
                    guests_count=int(r.get("guests_count", 2)),
                    reservation_date=r.get("reservation_date", ""),
                    reservation_time=r.get("reservation_time", ""),
                    special_request=r.get("special_request"),
                    event_type=r.get("event_type", "Table Booking"),
                    status=r.get("status", "Pending"),
                    outlet_id=normalize_outlet_code(r.get("outlet_id", "KL01")),
                    brand=r.get("brand", "restaurant"),
                    created_at=_parse_datetime(r.get("created_at"))
                )
            )
        filtered.sort(key=lambda x: x.created_at, reverse=True)
        return filtered

    query = db.query(Reservation)
    if outlet_variants:
        query = query.filter(Reservation.outlet_id.in_(outlet_variants))
    if brand_filter and brand_filter.lower() != "all":
        query = query.filter(Reservation.brand == brand_filter.lower())
    if search:
        s_term = f"%{search.strip().lower()}%"
        query = query.filter(
            (Reservation.guest_name.ilike(s_term)) |
            (Reservation.phone.ilike(s_term)) |
            (Reservation.email.ilike(s_term)) |
            (Reservation.special_request.ilike(s_term))
        )
    reservations = query.order_by(Reservation.created_at.desc()).all()
    result = []
    for r in reservations:
        result.append(
            ReservationOut(
                id=r.id,
                guest_name=r.guest_name,
                phone=r.phone,
                email=r.email,
                guests_count=r.guests_count,
                reservation_date=r.reservation_date,
                reservation_time=r.reservation_time,
                special_request=r.special_request,
                event_type=r.event_type,
                status=r.status,
                outlet_id=normalize_outlet_code(r.outlet_id or "KL01"),
                brand=getattr(r, "brand", "restaurant") or "restaurant",
                created_at=r.created_at
            )
        )
    return result

@router.patch("/reservations/{res_id}/status", response_model=ReservationOut, dependencies=[Depends(verify_csrf_token)])
def update_reservation_status(
    res_id: int,
    payload: ReservationStatusUpdate,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Updates table reservation status."""
    target_outlet = None
    fs_doc = get_document("reservations", str(res_id))
    if fs_doc:
        target_outlet = fs_doc.get("outlet_id")
    elif not settings.IS_VERCEL:
        existing = db.query(Reservation).filter(Reservation.id == res_id).first()
        if existing:
            target_outlet = existing.outlet_id

    enforce_outlet_rls(current_admin, target_outlet)

    update_document("reservations", str(res_id), {"status": payload.status})
    bump_db_revision()

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "UPDATE_RESERVATION_STATUS", f"Updated reservation #{res_id} status to '{payload.status}'")

    fs_doc = get_document("reservations", str(res_id))
    if fs_doc:
        return ReservationOut(
            id=int(fs_doc.get("id", res_id)),
            guest_name=fs_doc.get("guest_name", ""),
            phone=fs_doc.get("phone", ""),
            email=fs_doc.get("email"),
            guests_count=int(fs_doc.get("guests_count", 2)),
            reservation_date=fs_doc.get("reservation_date", ""),
            reservation_time=fs_doc.get("reservation_time", ""),
            special_request=fs_doc.get("special_request"),
            event_type=fs_doc.get("event_type", "Table Booking"),
            status=payload.status,
            outlet_id=fs_doc.get("outlet_id", "OUTLET-01"),
            created_at=_parse_datetime(fs_doc.get("created_at"))
        )

    if not settings.IS_VERCEL:
        res = db.query(Reservation).filter(Reservation.id == res_id).first()
        if res:
            res.status = payload.status
            db.commit()
            db.refresh(res)
            return res

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Reservation ID {res_id} not found.")

@router.delete("/reservations/{res_id}", dependencies=[Depends(verify_csrf_token)])
def delete_reservation(
    res_id: int,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Deletes a table reservation record."""
    target_outlet = None
    fs_doc = get_document("reservations", str(res_id))
    if fs_doc:
        target_outlet = fs_doc.get("outlet_id")
    elif not settings.IS_VERCEL:
        existing = db.query(Reservation).filter(Reservation.id == res_id).first()
        if existing:
            target_outlet = existing.outlet_id

    enforce_outlet_rls(current_admin, target_outlet)

    delete_document("reservations", str(res_id))
    bump_db_revision()

    if not settings.IS_VERCEL:
        res = db.query(Reservation).filter(Reservation.id == res_id).first()
        if res:
            db.delete(res)
            db.commit()

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "DELETE_RESERVATION", f"Deleted reservation record #{res_id}")
    return {"message": f"Reservation #{res_id} deleted successfully."}

@router.delete("/reservations", dependencies=[Depends(verify_csrf_token)])
def wipe_all_reservations(
    request: Request,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager", "Manager"])),
    db: Session = Depends(get_db)
):
    """Wipes all reservation records from database and Firestore."""
    count = wipe_collection("reservations")
    bump_db_revision()

    if not settings.IS_VERCEL:
        db.query(Reservation).delete()
        db.commit()

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "WIPE_RESERVATIONS", f"Wiped all {count} reservation record(s).")
    return {"message": f"Successfully wiped {count} reservation record(s).", "count": count}

@router.post("/reservations/batch-delete", dependencies=[Depends(verify_csrf_token)])
def batch_delete_reservations(
    payload: BatchDeleteSchema,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Deletes selected reservation records by ID from database and Firestore."""
    count = 0
    for rid_str in payload.ids:
        delete_document("reservations", rid_str)
        if not settings.IS_VERCEL:
            try:
                rid = int(rid_str)
                res = db.query(Reservation).filter(Reservation.id == rid).first()
                if res:
                    db.delete(res)
            except Exception:
                pass
        count += 1

    if not settings.IS_VERCEL:
        db.commit()

    bump_db_revision()
    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "BATCH_DELETE_RESERVATIONS", f"Batch deleted {count} selected reservation(s).")
    return {"message": f"Successfully deleted {count} reservation(s).", "count": count}

@router.get("/private-events", response_model=List[PrivateEventOut])
def get_admin_private_events(
    search: Optional[str] = None,
    outlet_filter: Optional[str] = None,
    brand_filter: Optional[str] = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Fetches list of private event inquiries with optional search, brand, and outlet filtering."""
    admin_role = getattr(current_admin, "role", "Staff") or "Staff"
    admin_outlet = getattr(current_admin, "outlet_id", "KL01") or "KL01"
    if admin_role not in ("Super Admin", "Super Manager"):
        outlet_filter = admin_outlet

    outlet_variants = get_outlet_search_variants(outlet_filter)

    if settings.IS_VERCEL:
        raw_docs = query_documents("private_events", limit=200)
        filtered = []
        for e in raw_docs:
            if outlet_variants:
                e_outlet = e.get("outlet_id", "KL01")
                if e_outlet not in outlet_variants and normalize_outlet_code(e_outlet) not in outlet_variants:
                    continue

            if brand_filter and brand_filter.lower() != "all":
                e_brand = e.get("brand", "restaurant")
                if e_brand != brand_filter.lower():
                    continue

            if search:
                s_lower = search.strip().lower()
                o_name = e.get("organizer_name", "").lower()
                phone = e.get("phone", "").lower()
                email = (e.get("email") or "").lower()
                etype = (e.get("event_type") or "").lower()
                notes = (e.get("special_notes") or "").lower()
                if s_lower not in o_name and s_lower not in phone and s_lower not in email and s_lower not in etype and s_lower not in notes:
                    continue

            filtered.append(
                PrivateEventOut(
                    id=int(e.get("id", 0)),
                    organizer_name=e.get("organizer_name", ""),
                    phone=e.get("phone", ""),
                    email=e.get("email"),
                    event_type=e.get("event_type", "Private Dining"),
                    guest_count=int(e.get("guest_count", 10)),
                    event_date=e.get("event_date", ""),
                    event_time=e.get("event_time"),
                    special_notes=e.get("special_notes"),
                    status=e.get("status", "Pending"),
                    outlet_id=normalize_outlet_code(e.get("outlet_id", "KL01")),
                    brand=e.get("brand", "restaurant"),
                    created_at=_parse_datetime(e.get("created_at"))
                )
            )
        filtered.sort(key=lambda x: x.created_at, reverse=True)
        return filtered

    query = db.query(PrivateEvent)
    if outlet_variants:
        query = query.filter(PrivateEvent.outlet_id.in_(outlet_variants))
    if brand_filter and brand_filter.lower() != "all":
        query = query.filter(PrivateEvent.brand == brand_filter.lower())
    if search:
        s_term = f"%{search.strip().lower()}%"
        query = query.filter(
            (PrivateEvent.organizer_name.ilike(s_term)) |
            (PrivateEvent.phone.ilike(s_term)) |
            (PrivateEvent.email.ilike(s_term)) |
            (PrivateEvent.event_type.ilike(s_term)) |
            (PrivateEvent.special_notes.ilike(s_term))
        )
    events = query.order_by(PrivateEvent.created_at.desc()).all()
    result = []
    for e in events:
        result.append(
            PrivateEventOut(
                id=e.id,
                organizer_name=e.organizer_name,
                phone=e.phone,
                email=e.email,
                event_type=e.event_type,
                guest_count=e.guest_count,
                event_date=e.event_date,
                event_time=e.event_time,
                special_notes=e.special_notes,
                status=e.status,
                outlet_id=normalize_outlet_code(e.outlet_id or "KL01"),
                brand=getattr(e, "brand", "restaurant") or "restaurant",
                created_at=e.created_at
            )
        )
    return result

@router.patch("/private-events/{event_id}/status", response_model=PrivateEventOut, dependencies=[Depends(verify_csrf_token)])
def update_private_event_status(
    event_id: int,
    payload: PrivateEventStatusUpdate,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Updates status of a private event inquiry."""
    target_outlet = None
    fs_doc = get_document("private_events", str(event_id))
    if fs_doc:
        target_outlet = fs_doc.get("outlet_id")
    elif not settings.IS_VERCEL:
        existing = db.query(PrivateEvent).filter(PrivateEvent.id == event_id).first()
        if existing:
            target_outlet = existing.outlet_id

    enforce_outlet_rls(current_admin, target_outlet)

    update_document("private_events", str(event_id), {"status": payload.status})
    bump_db_revision()

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "UPDATE_PRIVATE_EVENT_STATUS", f"Updated private event #{event_id} status to '{payload.status}'")

    fs_doc = get_document("private_events", str(event_id))
    if fs_doc:
        return PrivateEventOut(
            id=int(fs_doc.get("id", event_id)),
            organizer_name=fs_doc.get("organizer_name", ""),
            phone=fs_doc.get("phone", ""),
            email=fs_doc.get("email"),
            event_type=fs_doc.get("event_type", "Private Dining"),
            guest_count=int(fs_doc.get("guest_count", 10)),
            event_date=fs_doc.get("event_date", ""),
            event_time=fs_doc.get("event_time"),
            special_notes=fs_doc.get("special_notes"),
            status=payload.status,
            outlet_id=fs_doc.get("outlet_id", "OUTLET-01"),
            created_at=_parse_datetime(fs_doc.get("created_at"))
        )

    if not settings.IS_VERCEL:
        evt = db.query(PrivateEvent).filter(PrivateEvent.id == event_id).first()
        if evt:
            evt.status = payload.status
            db.commit()
            db.refresh(evt)
            return evt

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Private Event ID {event_id} not found.")

@router.delete("/private-events/{event_id}", dependencies=[Depends(verify_csrf_token)])
def delete_private_event(
    event_id: int,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Deletes a private event record."""
    target_outlet = None
    fs_doc = get_document("private_events", str(event_id))
    if fs_doc:
        target_outlet = fs_doc.get("outlet_id")
    elif not settings.IS_VERCEL:
        existing = db.query(PrivateEvent).filter(PrivateEvent.id == event_id).first()
        if existing:
            target_outlet = existing.outlet_id

    enforce_outlet_rls(current_admin, target_outlet)

    delete_document("private_events", str(event_id))
    bump_db_revision()

    if not settings.IS_VERCEL:
        evt = db.query(PrivateEvent).filter(PrivateEvent.id == event_id).first()
        if evt:
            db.delete(evt)
            db.commit()

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "DELETE_PRIVATE_EVENT", f"Deleted private event record #{event_id}")
    return {"message": f"Private Event #{event_id} deleted successfully."}

@router.delete("/private-events", dependencies=[Depends(verify_csrf_token)])
def wipe_all_private_events(
    request: Request,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager", "Manager"])),
    db: Session = Depends(get_db)
):
    """Wipes all private event inquiry records from database and Firestore."""
    count = wipe_collection("private_events")
    bump_db_revision()

    if not settings.IS_VERCEL:
        db.query(PrivateEvent).delete()
        db.commit()

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "WIPE_PRIVATE_EVENTS", f"Wiped all {count} private event record(s).")
    return {"message": f"Successfully wiped {count} private event record(s).", "count": count}

@router.post("/private-events/batch-delete", dependencies=[Depends(verify_csrf_token)])
def batch_delete_private_events(
    payload: BatchDeleteSchema,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Deletes selected private event inquiry records by ID from database and Firestore."""
    count = 0
    for eid_str in payload.ids:
        delete_document("private_events", eid_str)
        if not settings.IS_VERCEL:
            try:
                eid = int(eid_str)
                evt = db.query(PrivateEvent).filter(PrivateEvent.id == eid).first()
                if evt:
                    db.delete(evt)
            except Exception:
                pass
        count += 1

    if not settings.IS_VERCEL:
        db.commit()

    bump_db_revision()
    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "BATCH_DELETE_PRIVATE_EVENTS", f"Batch deleted {count} selected private event(s).")
    return {"message": f"Successfully deleted {count} private event(s).", "count": count}

@router.post("/change-password", dependencies=[Depends(verify_csrf_token)])
def change_admin_password(
    payload: ChangePassword,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Changes admin user password securely."""
    if not verify_password(payload.current_password, current_admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password entered is incorrect."
        )

    new_hash = get_password_hash(payload.new_password)
    update_document("admin_users", str(current_admin.username), {"hashed_password": new_hash})

    if not settings.IS_VERCEL:
        current_admin.hashed_password = new_hash
        db.commit()

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "CHANGE_PASSWORD", "Admin password changed successfully.")
    return {"message": "Admin password updated successfully."}

@router.get("/audit-logs", response_model=List[AuditLogOut])
def get_audit_logs(
    limit: int = 100,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Manager"])),
    db: Session = Depends(get_db)
):
    """Retrieves server audit logs for administrative monitoring (Super Admin & Manager)."""
    if settings.IS_VERCEL:
        raw_docs = query_documents("audit_logs", limit=limit)
        results = []
        for d in raw_docs:
            results.append(
                AuditLogOut(
                    id=int(d.get("id", 0)),
                    timestamp=_parse_datetime(d.get("timestamp")),
                    ip_address=d.get("ip_address", "unknown"),
                    username=d.get("username", "system"),
                    action=d.get("action", ""),
                    details=d.get("details")
                )
            )
        results.sort(key=lambda x: x.timestamp, reverse=True)
        return results

    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()

# EMPLOYEE MANAGEMENT ENDPOINTS
@router.get("/employees", response_model=List[EmployeeOut])
def get_employees(
    search: Optional[str] = None,
    outlet_filter: Optional[str] = None,
    sort_by: Optional[str] = None,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager", "Manager"])),
    db: Session = Depends(get_db)
):
    """Fetches employee directory with search, outlet filtering, sorting, and RBAC outlet scoping."""
    role = getattr(current_admin, 'role', 'Staff')
    admin_outlet = getattr(current_admin, 'outlet_id', 'KL01')
    target_filter = outlet_filter if role in ["Super Admin", "Super Manager"] else admin_outlet
    outlet_variants = get_outlet_search_variants(target_filter)

    if settings.IS_VERCEL:
        raw_docs = query_documents("employees", limit=200)
        filtered = []
        for e in raw_docs:
            if outlet_variants:
                e_outlet = e.get("outlet_id", "KL01")
                if e_outlet not in outlet_variants and normalize_outlet_code(e_outlet) not in outlet_variants:
                    continue

            if search:
                s_lower = search.strip().lower()
                name = e.get("name", "").lower()
                pos = e.get("position", "").lower()
                dept = e.get("department", "").lower()
                phone = e.get("phone", "").lower()
                if s_lower not in name and s_lower not in pos and s_lower not in dept and s_lower not in phone:
                    continue

            filtered.append(
                EmployeeOut(
                    id=int(e.get("id", 0)),
                    name=e.get("name", ""),
                    email=e.get("email"),
                    phone=e.get("phone", ""),
                    position=e.get("position", ""),
                    department=e.get("department", ""),
                    salary=float(e.get("salary", 0.0)),
                    status=e.get("status", "Active"),
                    outlet_id=normalize_outlet_code(e.get("outlet_id", "KL01")),
                    created_at=_parse_datetime(e.get("created_at"))
                )
            )
        filtered.sort(key=lambda x: x.created_at, reverse=True)
        return filtered

    query = db.query(Employee)
    if outlet_variants:
        query = query.filter(Employee.outlet_id.in_(outlet_variants))

    if search:
        s_term = f"%{search.strip().lower()}%"
        query = query.filter(
            (Employee.name.ilike(s_term)) |
            (Employee.position.ilike(s_term)) |
            (Employee.department.ilike(s_term)) |
            (Employee.phone.ilike(s_term))
        )

    return query.order_by(Employee.created_at.desc()).all()

@router.post("/employees", response_model=EmployeeOut, dependencies=[Depends(verify_csrf_token)])
def create_employee(
    payload: EmployeeCreate,
    request: Request,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager", "Manager"])),
    db: Session = Depends(get_db)
):
    """Adds a new employee record."""
    role = getattr(current_admin, 'role', 'Staff')
    admin_outlet = getattr(current_admin, 'outlet_id', 'OUTLET-01')
    assigned_outlet = payload.outlet_id or admin_outlet if role in ["Super Admin", "Super Manager"] else admin_outlet
    created_at_dt = datetime.datetime.utcnow()

    if settings.IS_VERCEL:
        emp_id = get_next_id("employees")
    else:
        emp = Employee(
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            position=payload.position,
            department=payload.department,
            salary=payload.salary,
            status=payload.status,
            outlet_id=assigned_outlet
        )
        db.add(emp)
        db.commit()
        db.refresh(emp)
        emp_id = emp.id

    emp_dict = {
        "id": emp_id,
        "name": payload.name,
        "email": payload.email,
        "phone": payload.phone,
        "position": payload.position,
        "department": payload.department,
        "salary": payload.salary,
        "status": payload.status,
        "outlet_id": assigned_outlet,
        "created_at": created_at_dt.isoformat()
    }

    save_document("employees", str(emp_id), emp_dict)
    bump_db_revision()

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "CREATE_EMPLOYEE", f"Added new employee '{payload.name}' as '{payload.position}' in outlet '{assigned_outlet}'")
    return EmployeeOut(
        id=emp_id,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        position=payload.position,
        department=payload.department,
        salary=payload.salary,
        status=payload.status,
        outlet_id=assigned_outlet,
        created_at=created_at_dt
    )

@router.patch("/employees/{emp_id}/status", response_model=EmployeeOut, dependencies=[Depends(verify_csrf_token)])
def update_employee_status(
    emp_id: int,
    payload: EmployeeStatusUpdate,
    request: Request,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager", "Manager"])),
    db: Session = Depends(get_db)
):
    """Updates status of an existing employee."""
    update_document("employees", str(emp_id), {"status": payload.status})
    bump_db_revision()

    if not settings.IS_VERCEL:
        emp = db.query(Employee).filter(Employee.id == emp_id).first()
        if emp:
            emp.status = payload.status
            db.commit()

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "UPDATE_EMPLOYEE_STATUS", f"Changed status for employee #{emp_id} to '{payload.status}'")

    fs_doc = get_document("employees", str(emp_id))
    if fs_doc:
        return EmployeeOut(
            id=int(fs_doc.get("id", emp_id)),
            name=fs_doc.get("name", ""),
            email=fs_doc.get("email"),
            phone=fs_doc.get("phone", ""),
            position=fs_doc.get("position", ""),
            department=fs_doc.get("department", ""),
            salary=float(fs_doc.get("salary", 0.0)),
            status=payload.status,
            outlet_id=fs_doc.get("outlet_id", "OUTLET-01"),
            created_at=_parse_datetime(fs_doc.get("created_at"))
        )

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Employee ID {emp_id} not found.")

@router.patch("/employees/{emp_id}/outlet", response_model=EmployeeOut, dependencies=[Depends(verify_csrf_token)])
def update_employee_outlet(
    emp_id: int,
    payload: AdminOutletUpdate,
    request: Request,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager"])),
    db: Session = Depends(get_db)
):
    """Reassigns an employee's outlet location (Super Admin & Super Manager only)."""
    update_document("employees", str(emp_id), {"outlet_id": payload.outlet_id})
    bump_db_revision()

    if not settings.IS_VERCEL:
        emp = db.query(Employee).filter(Employee.id == emp_id).first()
        if emp:
            emp.outlet_id = payload.outlet_id
            db.commit()

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "UPDATE_EMPLOYEE_OUTLET", f"Reassigned employee #{emp_id} to outlet '{payload.outlet_id}'")

    fs_doc = get_document("employees", str(emp_id))
    if fs_doc:
        return EmployeeOut(
            id=int(fs_doc.get("id", emp_id)),
            name=fs_doc.get("name", ""),
            email=fs_doc.get("email"),
            phone=fs_doc.get("phone", ""),
            position=fs_doc.get("position", ""),
            department=fs_doc.get("department", ""),
            salary=float(fs_doc.get("salary", 0.0)),
            status=fs_doc.get("status", "Active"),
            outlet_id=payload.outlet_id,
            created_at=_parse_datetime(fs_doc.get("created_at"))
        )

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Employee ID {emp_id} not found.")

@router.delete("/employees/{emp_id}", dependencies=[Depends(verify_csrf_token)])
def delete_employee(
    emp_id: int,
    request: Request,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager", "Manager"])),
    db: Session = Depends(get_db)
):
    """Deletes an employee record."""
    target_outlet = None
    fs_doc = get_document("employees", str(emp_id))
    if fs_doc:
        target_outlet = fs_doc.get("outlet_id")
    elif not settings.IS_VERCEL:
        existing = db.query(Employee).filter(Employee.id == emp_id).first()
        if existing:
            target_outlet = existing.outlet_id

    enforce_outlet_rls(current_admin, target_outlet)

    delete_document("employees", str(emp_id))
    bump_db_revision()

    if not settings.IS_VERCEL:
        emp = db.query(Employee).filter(Employee.id == emp_id).first()
        if emp:
            db.delete(emp)
            db.commit()

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "DELETE_EMPLOYEE", f"Deleted employee record #{emp_id}")
    return {"message": f"Employee removed successfully."}

# ADMIN RBAC USER MANAGEMENT ENDPOINTS
@router.get("/users", response_model=List[AdminUserOut])
def get_admin_users(
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager"])),
    db: Session = Depends(get_db)
):
    """Lists all admin user accounts."""
    if settings.IS_VERCEL:
        raw_docs = query_documents("admin_users", limit=200)
        results = []
        for u in raw_docs:
            results.append(
                AdminUserOut(
                    id=int(u.get("id")) if str(u.get("id")).isdigit() else 1,
                    username=u.get("username", ""),
                    role=u.get("role", "Staff"),
                    outlet_id=u.get("outlet_id", "OUTLET-01"),
                    is_active=u.get("is_active", True),
                    created_at=_parse_datetime(u.get("created_at")),
                    last_login=_parse_datetime(u["last_login"]) if u.get("last_login") else None
                )
            )
        return results

    return db.query(AdminUser).order_by(AdminUser.created_at.desc()).all()

@router.post("/users", response_model=AdminUserOut, dependencies=[Depends(verify_csrf_token)])
def create_admin_user(
    payload: AdminCreate,
    request: Request,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager"])),
    db: Session = Depends(get_db)
):
    """Creates a new administrative account with designated RBAC role."""
    uname = payload.username.strip()
    hashed = get_password_hash(payload.password)
    created_at_dt = datetime.datetime.utcnow()

    if settings.IS_VERCEL:
        if query_document_by_field_ci("admin_users", "username", uname):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Username '{uname}' is already in use.")
        u_id = get_next_id("admin_users")
    else:
        existing = db.query(AdminUser).filter(func.lower(AdminUser.username) == uname.lower()).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Username '{uname}' is already in use.")

        new_user = AdminUser(
            username=uname,
            hashed_password=hashed,
            role=payload.role,
            outlet_id=payload.outlet_id or "OUTLET-01",
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        u_id = new_user.id

    user_dict = {
        "id": u_id,
        "username": uname,
        "username_lower": uname.lower(),
        "hashed_password": hashed,
        "role": payload.role,
        "outlet_id": payload.outlet_id or "OUTLET-01",
        "is_active": True,
        "created_at": created_at_dt.isoformat(),
        "last_login": None
    }

    save_document("admin_users", str(u_id), user_dict)
    save_document("admin_users", uname, user_dict)
    bump_db_revision()

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "CREATE_ADMIN_USER", f"Created new admin account '{uname}' with role '{payload.role}'")
    return AdminUserOut(
        id=u_id if isinstance(u_id, int) else 1,
        username=uname,
        role=payload.role,
        outlet_id=payload.outlet_id or "OUTLET-01",
        is_active=True,
        created_at=created_at_dt,
        last_login=None
    )

@router.patch("/users/{user_id}/role", response_model=AdminUserOut, dependencies=[Depends(verify_csrf_token)])
def update_admin_role(
    user_id: int,
    payload: AdminRoleUpdate,
    request: Request,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager"])),
    db: Session = Depends(get_db)
):
    """Updates RBAC role of an admin user."""
    update_document("admin_users", str(user_id), {"role": payload.role})
    bump_db_revision()

    if not settings.IS_VERCEL:
        user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
        if user:
            user.role = payload.role
            db.commit()

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "UPDATE_ADMIN_ROLE", f"Changed role for user #{user_id} to '{payload.role}'")

    fs_doc = get_document("admin_users", str(user_id))
    if fs_doc:
        return AdminUserOut(
            id=user_id,
            username=fs_doc.get("username", ""),
            role=payload.role,
            outlet_id=fs_doc.get("outlet_id", "OUTLET-01"),
            is_active=fs_doc.get("is_active", True),
            created_at=_parse_datetime(fs_doc.get("created_at")),
            last_login=_parse_datetime(fs_doc["last_login"]) if fs_doc.get("last_login") else None
        )

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Admin User ID {user_id} not found.")

@router.patch("/users/{user_id}/outlet", response_model=AdminUserOut, dependencies=[Depends(verify_csrf_token)])
def update_admin_outlet(
    user_id: int,
    payload: AdminOutletUpdate,
    request: Request,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager"])),
    db: Session = Depends(get_db)
):
    """Reassigns an admin account's designated outlet location."""
    update_document("admin_users", str(user_id), {"outlet_id": payload.outlet_id})
    bump_db_revision()

    if not settings.IS_VERCEL:
        user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
        if user:
            user.outlet_id = payload.outlet_id
            db.commit()

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "UPDATE_ADMIN_OUTLET", f"Reassigned admin #{user_id} to outlet '{payload.outlet_id}'")

    fs_doc = get_document("admin_users", str(user_id))
    if fs_doc:
        return AdminUserOut(
            id=user_id,
            username=fs_doc.get("username", ""),
            role=fs_doc.get("role", "Staff"),
            outlet_id=payload.outlet_id,
            is_active=fs_doc.get("is_active", True),
            created_at=_parse_datetime(fs_doc.get("created_at")),
            last_login=_parse_datetime(fs_doc["last_login"]) if fs_doc.get("last_login") else None
        )

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Admin User ID {user_id} not found.")

@router.delete("/users/{user_id}", dependencies=[Depends(verify_csrf_token)])
def delete_admin_user(
    user_id: int,
    request: Request,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager"])),
    db: Session = Depends(get_db)
):
    """Deletes an admin account."""
    delete_document("admin_users", str(user_id))
    bump_db_revision()

    if not settings.IS_VERCEL:
        user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
        if user:
            db.delete(user)
            db.commit()

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "DELETE_ADMIN_USER", f"Deleted admin user account #{user_id}")
    return {"message": "Admin user deleted successfully."}

@router.patch("/users/{user_id}/password", response_model=AdminUserOut, dependencies=[Depends(verify_csrf_token)])
def reset_admin_user_password(
    user_id: int,
    payload: AdminPasswordReset,
    request: Request,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager"])),
    db: Session = Depends(get_db)
):
    """Resets/updates password for any admin account in RBAC."""
    hashed = get_password_hash(payload.new_password)
    update_document("admin_users", str(user_id), {"hashed_password": hashed})
    bump_db_revision()

    if not settings.IS_VERCEL:
        user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
        if user:
            user.hashed_password = hashed
            db.commit()

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "RESET_ADMIN_PASSWORD", f"Reset password for admin account #{user_id}")

    fs_doc = get_document("admin_users", str(user_id))
    if fs_doc:
        return AdminUserOut(
            id=user_id,
            username=fs_doc.get("username", ""),
            role=fs_doc.get("role", "Staff"),
            outlet_id=fs_doc.get("outlet_id", "OUTLET-01"),
            is_active=fs_doc.get("is_active", True),
            created_at=_parse_datetime(fs_doc.get("created_at")),
            last_login=_parse_datetime(fs_doc["last_login"]) if fs_doc.get("last_login") else None
        )

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Admin User ID {user_id} not found.")
