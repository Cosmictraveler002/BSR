import json
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    generate_csrf_token, verify_csrf_token, log_audit, get_client_ip, get_current_admin, require_roles
)
from app.core.db_sync import bump_db_revision, get_db_revision, attach_db_revision_headers
from app.database import get_db
from app.models import AdminUser, Employee, Order, Reservation, PrivateEvent, AuditLog
from app.core.firestore_db import save_document, update_document, delete_document, wipe_collection, get_document, query_documents
from app.schemas import (
    AdminLogin, TokenOut, AdminCreate, AdminRoleUpdate, AdminOutletUpdate, AdminPasswordReset, AdminUserOut,
    EmployeeCreate, EmployeeOut, EmployeeStatusUpdate,
    OrderOut, OrderItemSchema, OrderStatusUpdate,
    ReservationOut, ReservationStatusUpdate,
    PrivateEventOut, PrivateEventStatusUpdate,
    ChangePassword, AuditLogOut, BatchDeleteSchema
)

router = APIRouter(prefix="/api/admin", tags=["Admin Protected API"])

# In-memory simple rate limiting tracker for login attempts
# Structure: { ip_address: [timestamp1, timestamp2, ...] }
LOGIN_ATTEMPTS = {}
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_TIME_SECONDS = 300  # 5 minutes lockout

def check_rate_limit(ip_address: str):
    """Enforces rate limiting on login endpoint per IP address (bypasses localhost for development)."""
    if ip_address in ("127.0.0.1", "::1", "localhost"):
        return

    now = datetime.datetime.utcnow()
    cutoff = now - datetime.timedelta(seconds=LOCKOUT_TIME_SECONDS)
    
    # Filter out old attempts
    attempts = [t for t in LOGIN_ATTEMPTS.get(ip_address, []) if t > cutoff]
    LOGIN_ATTEMPTS[ip_address] = attempts

    if len(attempts) >= MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Please wait 5 minutes before trying again."
        )

def record_failed_attempt(ip_address: str):
    """Records a failed login timestamp for the given IP address."""
    if ip_address not in LOGIN_ATTEMPTS:
        LOGIN_ATTEMPTS[ip_address] = []
    LOGIN_ATTEMPTS[ip_address].append(datetime.datetime.utcnow())

@router.post("/login", response_model=TokenOut)
def admin_login(payload: AdminLogin, request: Request, response: Response, db: Session = Depends(get_db)):
    """
    Authenticates admin user, sets HttpOnly secure session cookie, and generates CSRF token.
    Rate-limited to 5 failed attempts per 5 minutes.
    """
    ip = get_client_ip(request)
    check_rate_limit(ip)

    username = payload.username.strip()
    password = payload.password.strip()

    admin = db.query(AdminUser).filter(func.lower(AdminUser.username) == username.lower(), AdminUser.is_active == True).first()

    if not admin or not verify_password(password, admin.hashed_password):
        record_failed_attempt(ip)
        log_audit(db, ip, username, "FAILED_LOGIN", f"Invalid login credentials attempt for user '{username}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Admin Username or Password!"
        )

    # Clear failed attempts on successful authentication
    if ip in LOGIN_ATTEMPTS:
        del LOGIN_ATTEMPTS[ip]

    # Create JWT access token
    access_token = create_access_token(data={"sub": admin.username})
    csrf_token = generate_csrf_token()

    # Update admin last login
    admin.last_login = datetime.datetime.utcnow()
    db.commit()

    # Log successful login audit
    log_audit(db, ip, admin.username, "SUCCESSFUL_LOGIN", "Master Admin authenticated successfully.")

    # Set HTTPOnly Cookie for security against XSS token theft
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=access_token,
        httponly=True,  # Inaccessible to JavaScript
        samesite="lax",
        secure=False,   # Set to True in production HTTPS
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )

    # Set CSRF Token Cookie (Readable by JS for header inclusion)
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
        username=admin.username,
        role=admin.role or "Super Admin",
        csrf_token=csrf_token
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
        "role": current_admin.role or "Super Admin",
        "last_login": current_admin.last_login,
        "created_at": current_admin.created_at,
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

@router.get("/orders", response_model=List[OrderOut])
def get_admin_orders(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    type_filter: Optional[str] = None,
    outlet_filter: Optional[str] = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Fetches orders from database with search query and status/type/outlet filtering.
    Requires active admin session.
    """
    query = db.query(Order)

    if status_filter and status_filter != "ALL":
        query = query.filter(Order.status == status_filter)

    if type_filter and type_filter != "ALL":
        query = query.filter(Order.order_type == type_filter)

    if outlet_filter and outlet_filter != "ALL":
        query = query.filter(Order.outlet_id == outlet_filter)

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
                outlet_id=o.outlet_id or "OUTLET-01",
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
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order '{order_id}' not found."
        )

    old_status = order.status
    order.status = payload.status
    db.commit()
    db.refresh(order)
    bump_db_revision()
    update_document("orders", order_id, {"status": payload.status})

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "UPDATE_ORDER_STATUS", f"Changed order '{order_id}' status from '{old_status}' to '{payload.status}'")

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
        created_at=order.created_at
    )

@router.delete("/orders/{order_id}", dependencies=[Depends(verify_csrf_token)])
def delete_order(
    order_id: str,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Deletes a specific order from database."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order '{order_id}' not found."
        )

    db.delete(order)
    db.commit()
    bump_db_revision()
    delete_document("orders", order_id)

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "DELETE_ORDER", f"Deleted order record '{order_id}'")
    return {"message": f"Order '{order_id}' deleted successfully."}

@router.delete("/orders", dependencies=[Depends(verify_csrf_token)])
def wipe_all_orders(
    request: Request,
    current_admin: AdminUser = Depends(require_roles(["Super Admin"])),
    db: Session = Depends(get_db)
):
    """Wipes all orders from database (Super Admin only)."""
    count = db.query(Order).delete()
    db.commit()
    bump_db_revision()
    wipe_collection("orders")

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "WIPE_DATABASE", f"Wiped all {count} order records from database.")
    return {"message": f"Successfully wiped {count} test order records."}

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
        order = db.query(Order).filter(Order.id == oid).first()
        if order:
            db.delete(order)
            delete_document("orders", oid)
            count += 1
    db.commit()
    bump_db_revision()

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "BATCH_DELETE_ORDERS", f"Batch deleted {count} selected order(s).")
    return {"message": f"Successfully deleted {count} order(s).", "count": count}

@router.get("/reservations", response_model=List[ReservationOut])
def get_admin_reservations(
    search: Optional[str] = None,
    outlet_filter: Optional[str] = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Fetches list of table reservations with optional search and outlet filtering."""
    query = db.query(Reservation)
    if outlet_filter and outlet_filter != "ALL":
        query = query.filter(Reservation.outlet_id == outlet_filter)
    if search:
        s_term = f"%{search.strip().lower()}%"
        query = query.filter(
            (Reservation.guest_name.ilike(s_term)) |
            (Reservation.phone.ilike(s_term)) |
            (Reservation.email.ilike(s_term)) |
            (Reservation.special_request.ilike(s_term))
        )
    return query.order_by(Reservation.created_at.desc()).all()

@router.patch("/reservations/{res_id}/status", response_model=ReservationOut, dependencies=[Depends(verify_csrf_token)])
def update_reservation_status(
    res_id: int,
    payload: ReservationStatusUpdate,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Updates table reservation status."""
    res = db.query(Reservation).filter(Reservation.id == res_id).first()
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reservation ID {res_id} not found."
        )

    res.status = payload.status
    db.commit()
    db.refresh(res)
    bump_db_revision()
    update_document("reservations", str(res_id), {"status": payload.status})

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "UPDATE_RESERVATION_STATUS", f"Updated reservation #{res_id} status to '{payload.status}'")
    return res

@router.delete("/reservations/{res_id}", dependencies=[Depends(verify_csrf_token)])
def delete_reservation(
    res_id: int,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Deletes a table reservation record."""
    res = db.query(Reservation).filter(Reservation.id == res_id).first()
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reservation ID {res_id} not found."
        )

    db.delete(res)
    db.commit()
    bump_db_revision()
    delete_document("reservations", str(res_id))

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
    count = db.query(Reservation).delete()
    db.commit()
    bump_db_revision()
    wipe_collection("reservations")

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
        try:
            rid = int(rid_str)
            res = db.query(Reservation).filter(Reservation.id == rid).first()
            if res:
                db.delete(res)
                delete_document("reservations", str(rid))
                count += 1
        except Exception:
            continue
    db.commit()
    bump_db_revision()

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "BATCH_DELETE_RESERVATIONS", f"Batch deleted {count} selected reservation(s).")
    return {"message": f"Successfully deleted {count} reservation(s).", "count": count}

@router.get("/private-events", response_model=List[PrivateEventOut])
def get_admin_private_events(
    search: Optional[str] = None,
    outlet_filter: Optional[str] = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Fetches list of private event inquiries with optional search and outlet filtering."""
    query = db.query(PrivateEvent)
    if outlet_filter and outlet_filter != "ALL":
        query = query.filter(PrivateEvent.outlet_id == outlet_filter)
    if search:
        s_term = f"%{search.strip().lower()}%"
        query = query.filter(
            (PrivateEvent.organizer_name.ilike(s_term)) |
            (PrivateEvent.phone.ilike(s_term)) |
            (PrivateEvent.email.ilike(s_term)) |
            (PrivateEvent.event_type.ilike(s_term)) |
            (PrivateEvent.special_notes.ilike(s_term))
        )
    return query.order_by(PrivateEvent.created_at.desc()).all()

@router.patch("/private-events/{event_id}/status", response_model=PrivateEventOut, dependencies=[Depends(verify_csrf_token)])
def update_private_event_status(
    event_id: int,
    payload: PrivateEventStatusUpdate,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Updates status of a private event inquiry."""
    event = db.query(PrivateEvent).filter(PrivateEvent.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Private Event ID {event_id} not found."
        )

    event.status = payload.status
    db.commit()
    db.refresh(event)
    bump_db_revision()
    update_document("private_events", str(event_id), {"status": payload.status})

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "UPDATE_PRIVATE_EVENT_STATUS", f"Updated private event #{event_id} status to '{payload.status}'")
    return event

@router.delete("/private-events/{event_id}", dependencies=[Depends(verify_csrf_token)])
def delete_private_event(
    event_id: int,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Deletes a private event record."""
    event = db.query(PrivateEvent).filter(PrivateEvent.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Private Event ID {event_id} not found."
        )

    db.delete(event)
    db.commit()
    bump_db_revision()
    delete_document("private_events", str(event_id))

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
    count = db.query(PrivateEvent).delete()
    db.commit()
    bump_db_revision()
    wipe_collection("private_events")

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
        try:
            eid = int(eid_str)
            evt = db.query(PrivateEvent).filter(PrivateEvent.id == eid).first()
            if evt:
                db.delete(evt)
                delete_document("private_events", str(eid))
                count += 1
        except Exception:
            continue
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

    current_admin.hashed_password = get_password_hash(payload.new_password)
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
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()

# ==========================================
# ==========================================
# EMPLOYEE MANAGEMENT ENDPOINTS
# ==========================================

@router.get("/employees", response_model=List[EmployeeOut])
def get_employees(
    search: Optional[str] = None,
    outlet_filter: Optional[str] = None,
    sort_by: Optional[str] = None,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager", "Manager"])),
    db: Session = Depends(get_db)
):
    """
    Fetches employee directory with search, outlet filtering, sorting, and RBAC outlet scoping.
    Super Admin and Super Manager can view all outlets.
    Normal Managers can ONLY view employees assigned to their designated outlet.
    """
    query = db.query(Employee)

    if current_admin.role in ["Super Admin", "Super Manager"]:
        if outlet_filter and outlet_filter != "ALL":
            query = query.filter(Employee.outlet_id == outlet_filter)
    else:
        assigned_outlet = current_admin.outlet_id or "OUTLET-01"
        query = query.filter(Employee.outlet_id == assigned_outlet)

    if search:
        s_term = f"%{search.strip().lower()}%"
        query = query.filter(
            (Employee.name.ilike(s_term)) |
            (Employee.position.ilike(s_term)) |
            (Employee.department.ilike(s_term)) |
            (Employee.phone.ilike(s_term))
        )

    if sort_by == "outlet":
        query = query.order_by(Employee.outlet_id.asc(), Employee.name.asc())
    elif sort_by == "name":
        query = query.order_by(Employee.name.asc())
    elif sort_by == "position":
        query = query.order_by(Employee.position.asc())
    elif sort_by == "status":
        query = query.order_by(Employee.status.asc())
    else:
        query = query.order_by(Employee.created_at.desc())

    return query.all()

@router.post("/employees", response_model=EmployeeOut, dependencies=[Depends(verify_csrf_token)])
def create_employee(
    payload: EmployeeCreate,
    request: Request,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager", "Manager"])),
    db: Session = Depends(get_db)
):
    """Adds a new employee record."""
    if current_admin.role in ["Super Admin", "Super Manager"]:
        assigned_outlet = payload.outlet_id or "OUTLET-01"
    else:
        assigned_outlet = current_admin.outlet_id or "OUTLET-01"

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
    bump_db_revision()
    save_document("employees", str(emp.id), emp.to_dict())

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "CREATE_EMPLOYEE", f"Added new employee '{emp.name}' as '{emp.position}' in outlet '{emp.outlet_id}'")
    return emp

@router.patch("/employees/{emp_id}/status", response_model=EmployeeOut, dependencies=[Depends(verify_csrf_token)])
def update_employee_status(
    emp_id: int,
    payload: EmployeeStatusUpdate,
    request: Request,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager", "Manager"])),
    db: Session = Depends(get_db)
):
    """Updates status of an existing employee."""
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Employee ID {emp_id} not found.")

    old_status = emp.status
    emp.status = payload.status
    db.commit()
    db.refresh(emp)
    bump_db_revision()
    update_document("employees", str(emp_id), {"status": payload.status})

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "UPDATE_EMPLOYEE_STATUS", f"Changed status for employee #{emp_id} '{emp.name}' from '{old_status}' to '{payload.status}'")
    return emp

@router.patch("/employees/{emp_id}/outlet", response_model=EmployeeOut, dependencies=[Depends(verify_csrf_token)])
def update_employee_outlet(
    emp_id: int,
    payload: AdminOutletUpdate,
    request: Request,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager"])),
    db: Session = Depends(get_db)
):
    """Reassigns an employee's outlet location (Super Admin & Super Manager only)."""
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Employee ID {emp_id} not found.")

    old_outlet = emp.outlet_id
    emp.outlet_id = payload.outlet_id
    db.commit()
    db.refresh(emp)
    bump_db_revision()
    update_document("employees", str(emp_id), {"outlet_id": payload.outlet_id})

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "UPDATE_EMPLOYEE_OUTLET", f"Reassigned employee #{emp_id} '{emp.name}' from '{old_outlet}' to '{payload.outlet_id}'")
    return emp

@router.delete("/employees/{emp_id}", dependencies=[Depends(verify_csrf_token)])
def delete_employee(
    emp_id: int,
    request: Request,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager", "Manager"])),
    db: Session = Depends(get_db)
):
    """Deletes an employee record."""
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Employee ID {emp_id} not found.")

    emp_name = emp.name
    db.delete(emp)
    db.commit()
    bump_db_revision()
    delete_document("employees", str(emp_id))

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "DELETE_EMPLOYEE", f"Deleted employee record #{emp_id} '{emp_name}'")
    return {"message": f"Employee '{emp_name}' removed successfully."}

# ==========================================
# ADMIN RBAC USER MANAGEMENT ENDPOINTS
# ==========================================

@router.get("/users", response_model=List[AdminUserOut])
def get_admin_users(
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager"])),
    db: Session = Depends(get_db)
):
    """Lists all admin user accounts (Super Admin & Super Manager authority)."""
    return db.query(AdminUser).order_by(AdminUser.created_at.desc()).all()

@router.post("/users", response_model=AdminUserOut, dependencies=[Depends(verify_csrf_token)])
def create_admin_user(
    payload: AdminCreate,
    request: Request,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager"])),
    db: Session = Depends(get_db)
):
    """Creates a new administrative account with designated RBAC role (Super Admin & Super Manager authority)."""
    existing = db.query(AdminUser).filter(func.lower(AdminUser.username) == payload.username.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Username '{payload.username}' is already in use.")

    hashed = get_password_hash(payload.password)
    new_user = AdminUser(
        username=payload.username.strip(),
        hashed_password=hashed,
        role=payload.role,
        outlet_id=payload.outlet_id or "OUTLET-01",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    bump_db_revision()
    save_document("admin_users", str(new_user.id), new_user.to_dict())

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "CREATE_ADMIN_USER", f"Created new admin account '{new_user.username}' with role '{new_user.role}' in '{new_user.outlet_id}'")
    return new_user

@router.patch("/users/{user_id}/role", response_model=AdminUserOut, dependencies=[Depends(verify_csrf_token)])
def update_admin_role(
    user_id: int,
    payload: AdminRoleUpdate,
    request: Request,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager"])),
    db: Session = Depends(get_db)
):
    """Updates RBAC role of an admin user (Super Admin & Super Manager authority)."""
    user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Admin User ID {user_id} not found.")

    if user.username == current_admin.username and payload.role != current_admin.role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Self-demotion protection: You cannot demote your own account role while logged in."
        )

    old_role = user.role
    user.role = payload.role
    db.commit()
    db.refresh(user)
    bump_db_revision()
    update_document("admin_users", str(user_id), {"role": payload.role})

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "UPDATE_ADMIN_ROLE", f"Changed role for user '{user.username}' from '{old_role}' to '{payload.role}'")
    return user

@router.patch("/users/{user_id}/outlet", response_model=AdminUserOut, dependencies=[Depends(verify_csrf_token)])
def update_admin_outlet(
    user_id: int,
    payload: AdminOutletUpdate,
    request: Request,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager"])),
    db: Session = Depends(get_db)
):
    """Reassigns an admin account's designated outlet location (Super Admin & Super Manager only)."""
    user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Admin User ID {user_id} not found.")

    old_outlet = user.outlet_id
    user.outlet_id = payload.outlet_id
    db.commit()
    db.refresh(user)
    bump_db_revision()
    update_document("admin_users", str(user_id), {"outlet_id": payload.outlet_id})

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "UPDATE_ADMIN_OUTLET", f"Reassigned admin #{user_id} '{user.username}' from '{old_outlet}' to '{payload.outlet_id}'")
    return user

@router.delete("/users/{user_id}", dependencies=[Depends(verify_csrf_token)])
def delete_admin_user(
    user_id: int,
    request: Request,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager"])),
    db: Session = Depends(get_db)
):
    """Deletes an admin account (Super Admin & Super Manager only). Cannot delete self."""
    user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Admin User ID {user_id} not found.")

    if user.username == current_admin.username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own admin account while logged in.")

    uname = user.username
    db.delete(user)
    db.commit()
    bump_db_revision()
    delete_document("admin_users", str(user_id))

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "DELETE_ADMIN_USER", f"Deleted admin user account '{uname}'")
    return {"message": f"Admin user '{uname}' deleted successfully."}

@router.patch("/users/{user_id}/password", response_model=AdminUserOut, dependencies=[Depends(verify_csrf_token)])
def reset_admin_user_password(
    user_id: int,
    payload: AdminPasswordReset,
    request: Request,
    current_admin: AdminUser = Depends(require_roles(["Super Admin", "Super Manager"])),
    db: Session = Depends(get_db)
):
    """Resets/updates password for any admin account in RBAC (Super Admin & Super Manager authority)."""
    user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Admin User ID {user_id} not found.")

    hashed = get_password_hash(payload.new_password)
    user.hashed_password = hashed
    db.commit()
    db.refresh(user)
    bump_db_revision()

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "RESET_ADMIN_PASSWORD", f"Reset password for admin account '{user.username}' ({user.role})")
    return user
