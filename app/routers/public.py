import json
import random
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Order, Reservation, PrivateEvent
from app.core.config import settings
from app.core.db_sync import bump_db_revision
from app.core.firestore_db import save_document, get_document
from app.schemas import (
    OrderCreate, OrderOut, OrderItemSchema,
    ReservationCreate, ReservationOut,
    PrivateEventCreate, PrivateEventOut,
    CouponVerify, CouponVerifyOut
)

router = APIRouter(prefix="/api", tags=["Public Frontend API"])

@router.get("/config/firebase")
def get_firebase_web_config():
    """Returns public Firebase Web SDK configuration."""
    return {
        "apiKey": settings.FIREBASE_API_KEY,
        "authDomain": settings.FIREBASE_AUTH_DOMAIN,
        "projectId": settings.FIREBASE_PROJECT_ID,
        "storageBucket": settings.FIREBASE_STORAGE_BUCKET,
        "messagingSenderId": settings.FIREBASE_MESSAGING_SENDER_ID,
        "appId": settings.FIREBASE_APP_ID,
        "measurementId": settings.FIREBASE_MEASUREMENT_ID
    }

@router.get("/debug/firestore")
def debug_firestore_status():
    """Diagnostic endpoint to inspect Google Cloud Firestore connection status on serverless host."""
    import os
    has_json_env = bool(settings.FIREBASE_CREDENTIALS_JSON and len(settings.FIREBASE_CREDENTIALS_JSON.strip()) > 10)
    has_file_env = bool(settings.FIREBASE_CREDENTIALS_PATH and os.path.exists(settings.FIREBASE_CREDENTIALS_PATH))
    
    status_info = {
        "use_firestore_setting": settings.USE_FIRESTORE,
        "firebase_project_id": settings.FIREBASE_PROJECT_ID,
        "has_credentials_json_env": has_json_env,
        "has_credentials_file": has_file_env,
        "firestore_client_connected": False,
        "orders_count": 0,
        "reservations_count": 0,
        "error": None
    }

    try:
        from app.database import get_firestore_db
        db = get_firestore_db()
        if db:
            status_info["firestore_client_connected"] = True
            orders = list(db.collection("orders").limit(10).stream())
            reservations = list(db.collection("reservations").limit(10).stream())
            status_info["orders_count"] = len(orders)
            status_info["reservations_count"] = len(reservations)
        else:
            status_info["error"] = "Firestore Client returned None. Check FIREBASE_CREDENTIALS_JSON in Vercel Environment Variables."
    except Exception as e:
        status_info["error"] = str(e)

    return status_info

# Available Coupons Registry
VALID_COUPONS = {
    "BENGAL10": {"rate": 0.10, "message": "10% Bengal Festival Discount Applied!"},
    "SHOKHER20": {"rate": 0.20, "message": "20% Royal Feast Special Discount Applied!"},
    "WELCOME50": {"flat": 50.0, "message": "₹50 Welcome Discount Applied!"},
    "WELCOME5": {"rate": 0.05, "message": "5% Welcome Discount Applied!"}
}

import secrets

# Official Menu Catalog Prices for Server-Side Validation
MENU_PRICES = {
    "Sorshe Ilish": 850.0,
    "Kosha Mangsho": 750.0,
    "Chingri Malai": 650.0,
    "Artisanal Mishti": 350.0,
    "Kachchi Biryani": 450.0,
    "Basmati Rice": 120.0,
    "Luchi": 40.0,
}

def generate_order_id() -> str:
    """Generates a cryptographically secure unique order ID."""
    rand_hex = secrets.token_hex(4).upper()
    return f"BSR-2026-{rand_hex}"

@router.post("/coupons/verify", response_model=CouponVerifyOut)
def verify_coupon(payload: CouponVerify):
    """Verifies a promo coupon code and returns discount rate."""
    code_upper = payload.code.strip().upper()
    if code_upper in VALID_COUPONS:
        info = VALID_COUPONS[code_upper]
        return CouponVerifyOut(
            valid=True,
            code=code_upper,
            rate=info.get("rate", 0.0),
            message=info["message"]
        )
    return CouponVerifyOut(
        valid=False,
        code=code_upper,
        rate=0.0,
        message="Invalid or expired coupon code."
    )

@router.post("/orders", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(order_data: OrderCreate, db: Session = Depends(get_db)):
    """Creates a new food order with server-side price validation."""
    if not order_data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must contain at least one food item."
        )

    # Server-Side Price & Subtotal Validation (Prevent client-side price manipulation)
    items_validated = []
    subtotal = 0.0
    for item in order_data.items:
        # Use canonical price from MENU_PRICES if matched, otherwise rely on validated schema price
        canonical_price = MENU_PRICES.get(item.name, item.price)
        line_subtotal = round(canonical_price * item.qty, 2)
        subtotal += line_subtotal
        items_validated.append({
            "id": item.id,
            "name": item.name,
            "price": canonical_price,
            "qty": item.qty
        })

    subtotal = round(subtotal, 2)
    
    # Calculate discount
    discount = 0.0
    coupon_code = None
    if order_data.coupon_code:
        code_upper = order_data.coupon_code.strip().upper()
        if code_upper in VALID_COUPONS:
            coupon_code = code_upper
            info = VALID_COUPONS[code_upper]
            if "flat" in info:
                discount = min(subtotal, float(info["flat"]))
            elif "rate" in info:
                discount = round(subtotal * info["rate"], 2)

    total = max(0.0, round(subtotal - discount, 2))

    # Generate unique ID
    order_id = generate_order_id()
    while db.query(Order).filter(Order.id == order_id).first():
        order_id = generate_order_id()

    # Convert items list to JSON text for DB storage
    items_json_str = json.dumps(items_validated)

    new_order = Order(
        id=order_id,
        customer_name=order_data.customer_name.strip(),
        customer_phone=order_data.customer_phone.strip(),
        order_type=order_data.order_type,
        delivery_address=order_data.delivery_address.strip() if order_data.delivery_address else None,
        table_number=order_data.table_number.strip() if order_data.table_number else None,
        items_json=items_json_str,
        subtotal=subtotal,
        discount=discount,
        coupon_code=coupon_code,
        total=total,
        status="Confirmed",
        outlet_id=order_data.outlet_id or "OUTLET-01"
    )

    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    bump_db_revision()
    save_document("orders", new_order.id, new_order.to_dict())

    # Convert back items for schema response
    return OrderOut(
        id=new_order.id,
        customer_name=new_order.customer_name,
        customer_phone=new_order.customer_phone,
        order_type=new_order.order_type,
        delivery_address=new_order.delivery_address,
        table_number=new_order.table_number,
        items=[OrderItemSchema(**item) for item in items_validated],
        subtotal=new_order.subtotal,
        discount=new_order.discount,
        coupon_code=new_order.coupon_code,
        total=new_order.total,
        status=new_order.status,
        outlet_id=new_order.outlet_id,
        created_at=new_order.created_at
    )

@router.get("/orders/{order_id}", response_model=OrderOut)
def get_order_by_id(order_id: str, phone: Optional[str] = None, db: Session = Depends(get_db)):
    """Retrieves a single order by ID with optional phone verification for IDOR protection."""
    query = db.query(Order).filter(Order.id == order_id)
    if phone:
        query = query.filter(Order.customer_phone == phone.strip())
    
    order = query.first()
    if not order:
        # Check Firestore if missing in SQLite
        fs_order = get_document("orders", order_id)
        if fs_order and (not phone or fs_order.get("customer_phone") == phone.strip()):
            items = [OrderItemSchema(**i) for i in json.loads(fs_order.get("items_json", "[]"))]
            return OrderOut(
                id=fs_order["id"],
                customer_name=fs_order.get("customer_name", ""),
                customer_phone=fs_order.get("customer_phone", ""),
                order_type=fs_order.get("order_type", "Delivery"),
                delivery_address=fs_order.get("delivery_address"),
                table_number=fs_order.get("table_number"),
                items=items,
                subtotal=fs_order.get("subtotal", 0.0),
                discount=fs_order.get("discount", 0.0),
                coupon_code=fs_order.get("coupon_code"),
                total=fs_order.get("total", 0.0),
                status=fs_order.get("status", "Confirmed"),
                outlet_id=fs_order.get("outlet_id", "OUTLET-01"),
                created_at=fs_order.get("created_at")
            )

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID '{order_id}' was not found or verification failed."
        )
    
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

@router.post("/reservations", response_model=ReservationOut, status_code=status.HTTP_201_CREATED)
def create_reservation(res_data: ReservationCreate, db: Session = Depends(get_db)):
    """Submits a new table reservation request."""
    new_res = Reservation(
        guest_name=res_data.guest_name.strip(),
        phone=res_data.phone.strip(),
        email=res_data.email.strip() if res_data.email else None,
        guests_count=res_data.guests_count,
        reservation_date=res_data.reservation_date,
        reservation_time=res_data.reservation_time,
        special_request=res_data.special_request.strip() if res_data.special_request else None,
        event_type=res_data.event_type or "Table Booking",
        status="Pending",
        outlet_id=res_data.outlet_id or "OUTLET-01"
    )

    db.add(new_res)
    db.commit()
    db.refresh(new_res)
    bump_db_revision()
    save_document("reservations", str(new_res.id), new_res.to_dict())
    return new_res

@router.get("/reservations/{res_id}", response_model=ReservationOut)
def get_reservation_by_id(res_id: int, phone: Optional[str] = None, db: Session = Depends(get_db)):
    """Retrieves table reservation details by ID with optional phone verification."""
    query = db.query(Reservation).filter(Reservation.id == res_id)
    if phone:
        query = query.filter(Reservation.phone == phone.strip())

    res = query.first()
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reservation ID {res_id} not found or verification failed."
        )
    return res

@router.post("/private-events", response_model=PrivateEventOut, status_code=status.HTTP_201_CREATED)
def create_private_event(event_data: PrivateEventCreate, db: Session = Depends(get_db)):
    """Submits a new private dining event / banquet inquiry to the database."""
    new_event = PrivateEvent(
        organizer_name=event_data.organizer_name.strip(),
        phone=event_data.phone.strip(),
        email=event_data.email.strip() if event_data.email else None,
        event_type=event_data.event_type.strip() if event_data.event_type else "Private Dining",
        guest_count=event_data.guest_count,
        event_date=event_data.event_date.strip(),
        event_time=event_data.event_time.strip() if event_data.event_time else "TBD",
        special_notes=event_data.special_notes.strip() if event_data.special_notes else None,
        status="Pending",
        outlet_id=event_data.outlet_id or "OUTLET-01"
    )

    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    bump_db_revision()
    save_document("private_events", str(new_event.id), new_event.to_dict())
    return new_event
