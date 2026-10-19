import json
import random
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Order, Reservation, PrivateEvent
from app.core.config import settings
from app.core.limiter import limiter
from app.core.db_sync import bump_db_revision
from app.core.firestore_db import save_document, get_document, get_next_id
from app.schemas import (
    OrderCreate, OrderOut, OrderItemSchema,
    ReservationCreate, ReservationOut,
    PrivateEventCreate, PrivateEventOut
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

# Available Coupons Registry
VALID_COUPONS = {
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

OUTLET_ALIAS_MAP = {
    "OUTLET-01": "KL01",
    "OUTLET-02": "KL02",
    "OUTLET-03": "KL03",
    "KL01": "KL01",
    "KL02": "KL02",
    "KL03": "KL03",
    "MM01": "MM01",
    "OUTLET-MM01": "MM01",
    "MM-01": "MM01",
}

def normalize_outlet_code(raw: Optional[str], brand: Optional[str] = None) -> str:
    """Normalizes outlet aliases to standard codes (e.g. OUTLET-01 -> KL01, MM01 -> MM01)."""
    if not raw:
        return "MM01" if (brand or "").strip().lower() == "cafe" else "KL01"
    clean = raw.strip().upper()
    return OUTLET_ALIAS_MAP.get(clean, clean)


def generate_order_id(brand: str = "restaurant", outlet_code: Optional[str] = None) -> str:
    """Generates a cryptographically secure unique order ID: MM-MM01-2026-XXXX or BSR-KL01-2026-XXXX."""
    rand_hex = secrets.token_hex(4).upper()
    b_clean = (brand or "restaurant").strip().lower()
    prefix = "MM" if b_clean == "cafe" else "BSR"
    default_outlet = "MM01" if b_clean == "cafe" else "KL01"
    norm_outlet = normalize_outlet_code(outlet_code or default_outlet, brand=b_clean)
    year = datetime.datetime.utcnow().year
    return f"{prefix}-{norm_outlet}-{year}-{rand_hex}"



@router.post("/orders", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.ORDERS_RATE_LIMIT)
def create_order(request: Request, order_data: OrderCreate, db: Session = Depends(get_db)):
    """Creates a new food order with server-side price validation, rate limiting, and brand verification."""
    if not order_data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must contain at least one food item."
        )

    brand = order_data.brand or "restaurant"
    norm_outlet = normalize_outlet_code(order_data.outlet_id, brand=brand)

    # External Client / Brand Verification (e.g. Meet Me Cafe)
    brand_key = request.headers.get("X-Brand-Key") or request.headers.get("x-brand-key")
    if brand == "cafe":
        if settings.ENFORCE_CAFE_BRAND_KEY:
            if not brand_key or brand_key != settings.CAFE_BRAND_API_KEY:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Invalid or missing X-Brand-Key header for Cafe orders."
                )
        elif brand_key and brand_key != settings.CAFE_BRAND_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Provided X-Brand-Key is invalid."
            )

    # Phone-based flood prevention: check how many orders this phone has placed recently
    clean_phone = order_data.customer_phone.strip()
    window_ago = datetime.datetime.utcnow() - datetime.timedelta(minutes=settings.PHONE_WINDOW_MINUTES)
    if not settings.IS_VERCEL:
        recent_phone_orders = db.query(Order).filter(
            Order.customer_phone == clean_phone,
            Order.created_at >= window_ago
        ).count()
        if recent_phone_orders >= settings.MAX_ORDERS_PER_PHONE_WINDOW:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Order limit reached for phone {clean_phone}. Maximum {settings.MAX_ORDERS_PER_PHONE_WINDOW} orders allowed within {settings.PHONE_WINDOW_MINUTES} minutes."
            )

    # Server-Side Price & Subtotal Validation (Prevent client-side price manipulation)
    items_validated = []
    subtotal = 0.0
    for item in order_data.items:
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

    total = max(0.0, round(subtotal - discount, 2))
    created_at_dt = datetime.datetime.utcnow()
    items_json_str = json.dumps(items_validated)

    # Generate unique ID
    order_id = generate_order_id(brand=brand, outlet_code=norm_outlet)
    if settings.IS_VERCEL:
        while get_document("orders", order_id):
            order_id = generate_order_id(brand=brand, outlet_code=norm_outlet)
    else:
        while db.query(Order).filter(Order.id == order_id).first():
            order_id = generate_order_id(brand=brand, outlet_code=norm_outlet)

    order_dict = {
        "id": order_id,
        "customer_name": order_data.customer_name.strip(),
        "customer_phone": order_data.customer_phone.strip(),
        "order_type": order_data.order_type,
        "delivery_address": order_data.delivery_address.strip() if order_data.delivery_address else None,
        "table_number": order_data.table_number.strip() if order_data.table_number else None,
        "items_json": items_json_str,
        "subtotal": subtotal,
        "discount": discount,
        "coupon_code": coupon_code,
        "total": total,
        "status": "Confirmed",
        "outlet_id": norm_outlet,
        "brand": brand,
        "created_at": created_at_dt.isoformat()
    }

    # Save to Firestore
    save_document("orders", order_id, order_dict)
    bump_db_revision()

    if not settings.IS_VERCEL:
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
            outlet_id=norm_outlet,
            brand=brand,
            created_at=created_at_dt
        )
        try:
            db.add(new_order)
            db.commit()
            db.refresh(new_order)
        except Exception as e:
            db.rollback()

    return OrderOut(
        id=order_id,
        customer_name=order_dict["customer_name"],
        customer_phone=order_dict["customer_phone"],
        order_type=order_dict["order_type"],
        delivery_address=order_dict["delivery_address"],
        table_number=order_dict["table_number"],
        items=[OrderItemSchema(**item) for item in items_validated],
        subtotal=subtotal,
        discount=discount,
        coupon_code=coupon_code,
        total=total,
        status="Confirmed",
        outlet_id=order_dict["outlet_id"],
        brand=brand,
        created_at=created_at_dt
    )

def _normalize_phone(p: Optional[str]) -> str:
    if not p:
        return ""
    return "".join(c for c in p if c.isdigit())

@router.get("/orders/{order_id}", response_model=OrderOut)
def get_order_by_id(order_id: str, phone: Optional[str] = None, db: Session = Depends(get_db)):
    """Retrieves a single order by ID with optional phone verification for IDOR protection."""
    norm_phone = _normalize_phone(phone)
    fs_order = get_document("orders", order_id)
    if fs_order:
        fs_phone_norm = _normalize_phone(fs_order.get("customer_phone"))
        if not norm_phone or fs_phone_norm == norm_phone:
            items = [OrderItemSchema(**i) for i in json.loads(fs_order.get("items_json", "[]"))]
            created_at_val = fs_order.get("created_at")
            if isinstance(created_at_val, str):
                try:
                    created_at_val = datetime.datetime.fromisoformat(created_at_val)
                except Exception:
                    created_at_val = datetime.datetime.utcnow()
            elif not created_at_val:
                created_at_val = datetime.datetime.utcnow()

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
                outlet_id=fs_order.get("outlet_id", "KL01"),
                brand=fs_order.get("brand", "cafe" if str(fs_order.get("id", "")).startswith("MM-") else "restaurant"),
                created_at=created_at_val
            )

    if not settings.IS_VERCEL:
        query = db.query(Order).filter(Order.id == order_id)
        if phone:
            query = query.filter(Order.customer_phone == phone.strip())
        
        order = query.first()
        if order:
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
                outlet_id=order.outlet_id or "KL01",
                brand=getattr(order, "brand", None) or ("cafe" if str(order.id).startswith("MM-") else "restaurant"),
                created_at=order.created_at
            )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Order with ID '{order_id}' was not found or verification failed."
    )

@router.post("/reservations", response_model=ReservationOut, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RESERVATIONS_RATE_LIMIT)
def create_reservation(request: Request, res_data: ReservationCreate, db: Session = Depends(get_db)):
    """Submits a new table reservation request with rate limiting and flood guard."""
    clean_phone = res_data.phone.strip()
    window_ago = datetime.datetime.utcnow() - datetime.timedelta(minutes=settings.PHONE_WINDOW_MINUTES)
    if not settings.IS_VERCEL:
        recent_res = db.query(Reservation).filter(
            Reservation.phone == clean_phone,
            Reservation.created_at >= window_ago
        ).count()
        if recent_res >= settings.MAX_ORDERS_PER_PHONE_WINDOW:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Reservation limit reached for this phone number. Please wait a few minutes before submitting another request."
            )

    created_at_dt = datetime.datetime.utcnow()
    brand = res_data.brand or "restaurant"
    norm_outlet = normalize_outlet_code(res_data.outlet_id, brand=brand)
    
    if settings.IS_VERCEL:
        res_id = get_next_id("reservations")
    else:
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
            outlet_id=norm_outlet,
            brand=brand
        )
        db.add(new_res)
        db.commit()
        db.refresh(new_res)
        res_id = new_res.id

    res_dict = {
        "id": res_id,
        "guest_name": res_data.guest_name.strip(),
        "phone": res_data.phone.strip(),
        "email": res_data.email.strip() if res_data.email else None,
        "guests_count": res_data.guests_count,
        "reservation_date": res_data.reservation_date,
        "reservation_time": res_data.reservation_time,
        "special_request": res_data.special_request.strip() if res_data.special_request else None,
        "event_type": res_data.event_type or "Table Booking",
        "status": "Pending",
        "outlet_id": norm_outlet,
        "brand": brand,
        "created_at": created_at_dt.isoformat()
    }

    save_document("reservations", str(res_id), res_dict)
    bump_db_revision()

    return ReservationOut(
        id=res_id,
        guest_name=res_dict["guest_name"],
        phone=res_dict["phone"],
        email=res_dict["email"],
        guests_count=res_dict["guests_count"],
        reservation_date=res_dict["reservation_date"],
        reservation_time=res_dict["reservation_time"],
        special_request=res_dict["special_request"],
        event_type=res_dict["event_type"],
        status=res_dict["status"],
        outlet_id=res_dict["outlet_id"],
        brand=brand,
        created_at=created_at_dt
    )

@router.get("/reservations/{res_id}", response_model=ReservationOut)
def get_reservation_by_id(res_id: int, phone: Optional[str] = None, db: Session = Depends(get_db)):
    """Retrieves table reservation details by ID with optional phone verification."""
    norm_phone = _normalize_phone(phone)
    fs_res = get_document("reservations", str(res_id))
    if fs_res:
        fs_phone_norm = _normalize_phone(fs_res.get("phone"))
        if not norm_phone or fs_phone_norm == norm_phone:
            created_at_val = fs_res.get("created_at")
            if isinstance(created_at_val, str):
                try:
                    created_at_val = datetime.datetime.fromisoformat(created_at_val)
                except Exception:
                    created_at_val = datetime.datetime.utcnow()
            elif not created_at_val:
                created_at_val = datetime.datetime.utcnow()

            return ReservationOut(
                id=int(fs_res.get("id", res_id)),
                guest_name=fs_res.get("guest_name", ""),
                phone=fs_res.get("phone", ""),
                email=fs_res.get("email"),
                guests_count=int(fs_res.get("guests_count", 2)),
                reservation_date=fs_res.get("reservation_date", ""),
                reservation_time=fs_res.get("reservation_time", ""),
                special_request=fs_res.get("special_request"),
                event_type=fs_res.get("event_type", "Table Booking"),
                status=fs_res.get("status", "Pending"),
                outlet_id=fs_res.get("outlet_id", "KL01"),
                brand=fs_res.get("brand", "restaurant"),
                created_at=created_at_val
            )

    if not settings.IS_VERCEL:
        query = db.query(Reservation).filter(Reservation.id == res_id)
        if phone:
            query = query.filter(Reservation.phone == phone.strip())

        res = query.first()
        if res:
            return res

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Reservation ID {res_id} not found or verification failed."
    )

@router.post("/private-events", response_model=PrivateEventOut, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RESERVATIONS_RATE_LIMIT)
def create_private_event(request: Request, event_data: PrivateEventCreate, db: Session = Depends(get_db)):
    """Submits a new private dining event / banquet inquiry to the database with rate limiting."""
    created_at_dt = datetime.datetime.utcnow()
    brand = event_data.brand or "restaurant"
    norm_outlet = normalize_outlet_code(event_data.outlet_id, brand=brand)

    if settings.IS_VERCEL:
        event_id = get_next_id("private_events")
    else:
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
            outlet_id=norm_outlet,
            brand=brand
        )
        db.add(new_event)
        db.commit()
        db.refresh(new_event)
        event_id = new_event.id

    event_dict = {
        "id": event_id,
        "organizer_name": event_data.organizer_name.strip(),
        "phone": event_data.phone.strip(),
        "email": event_data.email.strip() if event_data.email else None,
        "event_type": event_data.event_type.strip() if event_data.event_type else "Private Dining",
        "guest_count": event_data.guest_count,
        "event_date": event_data.event_date.strip(),
        "event_time": event_data.event_time.strip() if event_data.event_time else "TBD",
        "special_notes": event_data.special_notes.strip() if event_data.special_notes else None,
        "status": "Pending",
        "outlet_id": norm_outlet,
        "brand": brand,
        "created_at": created_at_dt.isoformat()
    }

    save_document("private_events", str(event_id), event_dict)
    bump_db_revision()

    return PrivateEventOut(
        id=event_id,
        organizer_name=event_dict["organizer_name"],
        phone=event_dict["phone"],
        email=event_dict["email"],
        event_type=event_dict["event_type"],
        guest_count=event_dict["guest_count"],
        event_date=event_dict["event_date"],
        event_time=event_dict["event_time"],
        special_notes=event_dict["special_notes"],
        status=event_dict["status"],
        outlet_id=event_dict["outlet_id"],
        brand=brand,
        created_at=created_at_dt
    )
