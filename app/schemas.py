import html
import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

def sanitize_text(v: Optional[str]) -> Optional[str]:
    """Utility validator to sanitize input strings and escape HTML tags."""
    if v is None:
        return None
    cleaned = v.strip()
    return html.escape(cleaned)

class OrderItemSchema(BaseModel):
    id: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=150)
    price: float = Field(..., ge=0.0)
    qty: int = Field(..., ge=1, le=100)

    @field_validator("id", "name", mode="before")
    def sanitize_inputs(cls, v):
        return sanitize_text(v)

class OrderCreate(BaseModel):
    customer_name: str = Field(..., min_length=2, max_length=100)
    customer_phone: str = Field(..., min_length=5, max_length=20, pattern=r"^\+?[0-9\s\-]{5,20}$")
    order_type: str = Field(..., pattern="^(Delivery|Dine-In|Takeaway)$")
    delivery_address: Optional[str] = Field(None, max_length=300)
    table_number: Optional[str] = Field(None, max_length=50)
    items: List[OrderItemSchema]
    coupon_code: Optional[str] = Field(None, max_length=30)
    outlet_id: Optional[str] = Field("OUTLET-01", max_length=50)

    @field_validator("customer_name", "delivery_address", "table_number", "coupon_code", "outlet_id", mode="before")
    def sanitize_inputs(cls, v):
        return sanitize_text(v)

class OrderOut(BaseModel):
    id: str
    customer_name: str
    customer_phone: str
    order_type: str
    delivery_address: Optional[str] = None
    table_number: Optional[str] = None
    items: List[OrderItemSchema]
    subtotal: float
    discount: float
    coupon_code: Optional[str] = None
    total: float
    status: str
    outlet_id: Optional[str] = "OUTLET-01"
    created_at: datetime.datetime

    @field_validator("outlet_id", mode="before")
    def default_outlet(cls, v):
        return v or "OUTLET-01"

    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(Confirmed|Kitchen Prep|Out for Delivery|Completed|Cancelled)$")

class ReservationCreate(BaseModel):
    guest_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=5, max_length=25, pattern=r"^\+?[0-9\s\-\(\)]{5,25}$")
    email: Optional[str] = Field(None, max_length=100)
    guests_count: int = Field(2, ge=1, le=100)
    reservation_date: str = Field(..., max_length=30)
    reservation_time: str = Field(..., max_length=30)
    special_request: Optional[str] = Field(None, max_length=500)
    event_type: Optional[str] = Field("Table Booking", max_length=50)
    outlet_id: Optional[str] = Field("OUTLET-01", max_length=50)

    @field_validator("guest_name", "email", "special_request", "event_type", "outlet_id", mode="before")
    def sanitize_inputs(cls, v):
        return sanitize_text(v)

class ReservationOut(BaseModel):
    id: int
    guest_name: str
    phone: str
    email: Optional[str] = None
    guests_count: int
    reservation_date: str
    reservation_time: str
    special_request: Optional[str] = None
    event_type: Optional[str] = "Table Booking"
    status: str
    outlet_id: Optional[str] = "OUTLET-01"
    created_at: datetime.datetime

    @field_validator("event_type", mode="before")
    def default_event_type(cls, v):
        return v or "Table Booking"

    @field_validator("outlet_id", mode="before")
    def default_outlet(cls, v):
        return v or "OUTLET-01"

    class Config:
        from_attributes = True

class ReservationStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(Pending|Confirmed|Completed|Cancelled)$")

class PrivateEventCreate(BaseModel):
    organizer_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=5, max_length=25, pattern=r"^\+?[0-9\s\-\(\)]{5,25}$")
    email: Optional[str] = Field(None, max_length=100)
    event_type: str = Field("Private Dining", max_length=50)
    guest_count: int = Field(10, ge=1, le=500)
    event_date: str = Field(..., max_length=30)
    event_time: Optional[str] = Field(None, max_length=30)
    special_notes: Optional[str] = Field(None, max_length=1000)
    outlet_id: Optional[str] = Field("OUTLET-01", max_length=50)

    @field_validator("organizer_name", "email", "event_type", "special_notes", "outlet_id", mode="before")
    def sanitize_inputs(cls, v):
        return sanitize_text(v)

class PrivateEventOut(BaseModel):
    id: int
    organizer_name: str
    phone: str
    email: Optional[str] = None
    event_type: str
    guest_count: int
    event_date: str
    event_time: Optional[str] = None
    special_notes: Optional[str] = None
    status: str
    outlet_id: Optional[str] = "OUTLET-01"
    created_at: datetime.datetime

    @field_validator("outlet_id", mode="before")
    def default_outlet(cls, v):
        return v or "OUTLET-01"

    class Config:
        from_attributes = True

class PrivateEventStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(Pending|Confirmed|Completed|Cancelled)$")

class AdminLogin(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1, max_length=100)

    @field_validator("username", mode="before")
    def sanitize_user(cls, v):
        return sanitize_text(v)

class TokenOut(BaseModel):
    message: str
    username: str
    role: str = "Super Admin"
    csrf_token: str
    access_token: Optional[str] = None

class AdminCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=100)
    role: str = Field("Staff", pattern="^(Super Admin|Super Manager|Manager|Staff)$")
    outlet_id: Optional[str] = Field("OUTLET-01", max_length=50)

    @field_validator("username", mode="before")
    def sanitize_user(cls, v):
        return sanitize_text(v)

class AdminRoleUpdate(BaseModel):
    role: str = Field(..., pattern="^(Super Admin|Super Manager|Manager|Staff)$")

class AdminOutletUpdate(BaseModel):
    outlet_id: str = Field(..., max_length=50)

class AdminPasswordReset(BaseModel):
    new_password: str = Field(..., min_length=8, max_length=100)

class AdminUserOut(BaseModel):
    id: int
    username: str
    role: str
    outlet_id: str = "OUTLET-01"
    is_active: bool
    created_at: datetime.datetime
    last_login: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

class EmployeeCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: Optional[str] = Field(None, max_length=100)
    phone: str = Field(..., min_length=5, max_length=20, pattern=r"^\+?[0-9\s\-]{5,20}$")
    position: str = Field(..., min_length=2, max_length=50)
    department: str = Field(..., min_length=2, max_length=50)
    salary: float = Field(0.0, ge=0.0)
    status: str = Field("Active", pattern="^(Active|On Leave|Inactive)$")
    outlet_id: Optional[str] = Field("OUTLET-01", max_length=50)

    @field_validator("name", "email", "position", "department", "outlet_id", mode="before")
    def sanitize_inputs(cls, v):
        return sanitize_text(v)

class EmployeeStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(Active|On Leave|Inactive)$")

class EmployeeOut(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    phone: str
    position: str
    department: str
    salary: float
    status: str
    outlet_id: str = "OUTLET-01"
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class ChangePassword(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=100)
    new_password: str = Field(..., min_length=8, max_length=100)

class AuditLogOut(BaseModel):
    id: int
    timestamp: datetime.datetime
    ip_address: str
    username: str
    action: str
    details: Optional[str] = None

    class Config:
        from_attributes = True

class CouponVerify(BaseModel):
    code: str = Field(..., min_length=1, max_length=30)

    @field_validator("code", mode="before")
    def sanitize_code(cls, v):
        return sanitize_text(v)

class CouponVerifyOut(BaseModel):
    valid: bool
    code: str
    rate: float
    message: str

class BatchDeleteSchema(BaseModel):
    ids: List[str]
