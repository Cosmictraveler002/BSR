import json
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    generate_csrf_token, log_audit, get_client_ip, get_current_admin
)
from app.database import get_db
from app.models import AdminUser, Order, Reservation, PrivateEvent, AuditLog
from app.schemas import (
    AdminLogin, TokenOut, OrderOut, OrderItemSchema, OrderStatusUpdate,
    ReservationOut, ReservationStatusUpdate,
    PrivateEventOut, PrivateEventStatusUpdate,
    ChangePassword, AuditLogOut
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

    admin = db.query(AdminUser).filter(AdminUser.username == username, AdminUser.is_active == True).first()

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
def get_admin_me(current_admin: AdminUser = Depends(get_current_admin)):
    """Returns information about current logged-in admin session."""
    return {
        "authenticated": True,
        "username": current_admin.username,
        "last_login": current_admin.last_login,
        "created_at": current_admin.created_at
    }

@router.get("/orders", response_model=List[OrderOut])
def get_admin_orders(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    type_filter: Optional[str] = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Fetches orders from database with search query and status/type filtering.
    Requires active admin session.
    """
    query = db.query(Order)

    if status_filter and status_filter != "ALL":
        query = query.filter(Order.status == status_filter)

    if type_filter and type_filter != "ALL":
        query = query.filter(Order.order_type == type_filter)

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
                created_at=o.created_at
            )
        )
    return result

@router.patch("/orders/{order_id}/status", response_model=OrderOut)
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

@router.delete("/orders/{order_id}")
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

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "DELETE_ORDER", f"Deleted order record '{order_id}'")
    return {"message": f"Order '{order_id}' deleted successfully."}

@router.delete("/orders")
def wipe_all_orders(
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Wipes all orders from database (Test Database Wipe)."""
    count = db.query(Order).delete()
    db.commit()

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "WIPE_DATABASE", f"Wiped all {count} order records from database.")
    return {"message": f"Successfully wiped {count} test order records."}

@router.get("/reservations", response_model=List[ReservationOut])
def get_admin_reservations(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Fetches list of table reservations."""
    return db.query(Reservation).order_by(Reservation.created_at.desc()).all()

@router.patch("/reservations/{res_id}/status", response_model=ReservationOut)
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

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "UPDATE_RESERVATION_STATUS", f"Updated reservation #{res_id} status to '{payload.status}'")
    return res

@router.delete("/reservations/{res_id}")
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

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "DELETE_RESERVATION", f"Deleted reservation record #{res_id}")
    return {"message": f"Reservation #{res_id} deleted successfully."}

@router.get("/private-events", response_model=List[PrivateEventOut])
def get_admin_private_events(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Fetches list of private event inquiries."""
    return db.query(PrivateEvent).order_by(PrivateEvent.created_at.desc()).all()

@router.patch("/private-events/{event_id}/status", response_model=PrivateEventOut)
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

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "UPDATE_PRIVATE_EVENT_STATUS", f"Updated private event #{event_id} status to '{payload.status}'")
    return event

@router.delete("/private-events/{event_id}")
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

    ip = get_client_ip(request)
    log_audit(db, ip, current_admin.username, "DELETE_PRIVATE_EVENT", f"Deleted private event record #{event_id}")
    return {"message": f"Private Event #{event_id} deleted successfully."}

@router.post("/change-password")
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
    limit: int = 50,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Retrieves server audit logs for administrative monitoring."""
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
