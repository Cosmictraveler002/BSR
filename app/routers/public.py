import json
import random
import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Order, Reservation, PrivateEvent
from app.schemas import (
    OrderCreate, OrderOut, OrderItemSchema,
    ReservationCreate, ReservationOut,
    PrivateEventCreate, PrivateEventOut,
    CouponVerify, CouponVerifyOut
)

router = APIRouter(prefix="/api", tags=["Public Frontend API"])

# Available Coupons Registry
VALID_COUPONS = {
    "BENGAL10": {"rate": 0.10, "message": "10% Bengal Festival Discount Applied!"},
    "SHOKHER20": {"rate": 0.20, "message": "20% Royal Feast Special Discount Applied!"},
    "WELCOME50": {"flat": 50.0, "message": "₹50 Welcome Discount Applied!"},
    "WELCOME5": {"rate": 0.05, "message": "5% Welcome Discount Applied!"}
}

def generate_order_id() -> str:
    """Generates a formatted unique order ID."""
    rand_num = random.randint(1000, 9999)
    return f"BSR-2026-{rand_num}"

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
    """Creates a new food order in the database."""
    if not order_data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must contain at least one food item."
        )

    # Calculate subtotal
    subtotal = sum(item.price * item.qty for item in order_data.items)
    
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
    items_dicts = [item.dict() for item in order_data.items]
    items_json_str = json.dumps(items_dicts)

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
        status="Confirmed"
    )

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    # Convert back items for schema response
    return OrderOut(
        id=new_order.id,
        customer_name=new_order.customer_name,
        customer_phone=new_order.customer_phone,
        order_type=new_order.order_type,
        delivery_address=new_order.delivery_address,
        table_number=new_order.table_number,
        items=[OrderItemSchema(**item) for item in items_dicts],
        subtotal=new_order.subtotal,
        discount=new_order.discount,
        coupon_code=new_order.coupon_code,
        total=new_order.total,
        status=new_order.status,
        created_at=new_order.created_at
    )

@router.get("/orders/{order_id}", response_model=OrderOut)
def get_order_by_id(order_id: str, db: Session = Depends(get_db)):
    """Retrieves a single order by ID."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID '{order_id}' was not found."
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
        status="Pending"
    )

    db.add(new_res)
    db.commit()
    db.refresh(new_res)
    return new_res

@router.get("/reservations/{res_id}", response_model=ReservationOut)
def get_reservation_by_id(res_id: int, db: Session = Depends(get_db)):
    """Retrieves table reservation details by ID."""
    res = db.query(Reservation).filter(Reservation.id == res_id).first()
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reservation ID {res_id} not found."
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
        status="Pending"
    )

    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event
