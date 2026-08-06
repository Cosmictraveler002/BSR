import datetime
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime
from app.database import Base

class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

class Order(Base):
    __tablename__ = "orders"

    id = Column(String(50), primary_key=True, index=True)
    customer_name = Column(String(100), nullable=False)
    customer_phone = Column(String(20), nullable=False)
    order_type = Column(String(20), nullable=False)  # Delivery, Dine-In, Takeaway
    delivery_address = Column(Text, nullable=True)
    table_number = Column(String(20), nullable=True)
    items_json = Column(Text, nullable=False)  # Stored as JSON string
    subtotal = Column(Float, nullable=False, default=0.0)
    discount = Column(Float, nullable=False, default=0.0)
    coupon_code = Column(String(50), nullable=True)
    total = Column(Float, nullable=False, default=0.0)
    status = Column(String(30), nullable=False, default="Confirmed")  # Confirmed, Kitchen Prep, Out for Delivery, Completed, Cancelled
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    guest_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(100), nullable=True)
    guests_count = Column(Integer, nullable=False, default=2)
    reservation_date = Column(String(20), nullable=False)
    reservation_time = Column(String(20), nullable=False)
    special_request = Column(Text, nullable=True)
    event_type = Column(String(50), nullable=False, default="Table Booking")  # Table Booking or Private Event
    status = Column(String(30), nullable=False, default="Pending")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class PrivateEvent(Base):
    __tablename__ = "private_events"

    id = Column(Integer, primary_key=True, index=True)
    organizer_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(100), nullable=True)
    event_type = Column(String(50), nullable=False, default="Private Dining")  # Banquet, Birthday, Corporate, Private Dining
    guest_count = Column(Integer, nullable=False, default=10)
    event_date = Column(String(20), nullable=False)
    event_time = Column(String(20), nullable=True)
    special_notes = Column(Text, nullable=True)
    status = Column(String(30), nullable=False, default="Pending")  # Pending, Confirmed, Completed, Cancelled
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    ip_address = Column(String(50), nullable=False)
    username = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
