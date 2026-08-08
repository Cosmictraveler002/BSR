import datetime
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime
from app.database import Base

class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(30), default="Super Admin", nullable=False)  # Super Admin, Super Manager, Manager, Staff
    outlet_id = Column(String(50), default="OUTLET-01", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "hashed_password": self.hashed_password,
            "role": self.role,
            "outlet_id": self.outlet_id,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime.datetime) else self.created_at,
            "last_login": self.last_login.isoformat() if isinstance(self.last_login, datetime.datetime) else self.last_login,
        }

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=False)
    position = Column(String(50), nullable=False)  # Manager, Chef, Waiter, Cashier, Receptionist
    department = Column(String(50), nullable=False)  # Kitchen, Dining, Administration, Service
    salary = Column(Float, nullable=False, default=0.0)
    status = Column(String(20), nullable=False, default="Active")  # Active, On Leave, Inactive
    outlet_id = Column(String(50), nullable=False, default="OUTLET-01")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "position": self.position,
            "department": self.department,
            "salary": self.salary,
            "status": self.status,
            "outlet_id": self.outlet_id,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime.datetime) else self.created_at,
        }

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
    outlet_id = Column(String(50), nullable=False, default="OUTLET-01")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "customer_name": self.customer_name,
            "customer_phone": self.customer_phone,
            "order_type": self.order_type,
            "delivery_address": self.delivery_address,
            "table_number": self.table_number,
            "items_json": self.items_json,
            "subtotal": self.subtotal,
            "discount": self.discount,
            "coupon_code": self.coupon_code,
            "total": self.total,
            "status": self.status,
            "outlet_id": self.outlet_id,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime.datetime) else self.created_at,
        }

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
    outlet_id = Column(String(50), nullable=False, default="OUTLET-01")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "guest_name": self.guest_name,
            "phone": self.phone,
            "email": self.email,
            "guests_count": self.guests_count,
            "reservation_date": self.reservation_date,
            "reservation_time": self.reservation_time,
            "special_request": self.special_request,
            "event_type": self.event_type,
            "status": self.status,
            "outlet_id": self.outlet_id,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime.datetime) else self.created_at,
        }

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
    outlet_id = Column(String(50), nullable=False, default="OUTLET-01")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "organizer_name": self.organizer_name,
            "phone": self.phone,
            "email": self.email,
            "event_type": self.event_type,
            "guest_count": self.guest_count,
            "event_date": self.event_date,
            "event_time": self.event_time,
            "special_notes": self.special_notes,
            "status": self.status,
            "outlet_id": self.outlet_id,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime.datetime) else self.created_at,
        }

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    ip_address = Column(String(50), nullable=False)
    username = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if isinstance(self.timestamp, datetime.datetime) else self.timestamp,
            "ip_address": self.ip_address,
            "username": self.username,
            "action": self.action,
            "details": self.details,
        }
