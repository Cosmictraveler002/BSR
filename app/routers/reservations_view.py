import json
import datetime
from typing import Optional
from fastapi import APIRouter, Request, Form, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Reservation
from app.core.security import log_audit, get_client_ip

router = APIRouter(prefix="", tags=["Jinja Multi-Step Reservation"])

if os.path.exists("templates"):
    templates = Jinja2Templates(directory="templates")
else:
    templates = None

SESSION_COOKIE_NAME = "bsr_res_session"

def get_session_data(request: Request) -> dict:
    """Helper to parse session cookie JSON."""
    raw = request.cookies.get(SESSION_COOKIE_NAME)
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except Exception:
        return {}

def set_session_cookie(response: RedirectResponse, data: dict):
    """Helper to store session dictionary into cookie."""
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=json.dumps(data),
        max_age=3600,  # 1 hour expiration
        httponly=True,
        samesite="lax"
    )

@router.get("/reserve", response_class=HTMLResponse)
def get_reserve_step1(request: Request):
    """Renders Step 1: Select Experience & Party Size."""
    session_data = get_session_data(request)
    return templates.TemplateResponse(request=request, name="reservation_step1.html", context={
        "booking_type": session_data.get("booking_type", "table"),
        "guests_count": int(session_data.get("guests_count", 2))
    })

@router.post("/reserve/step1")
def post_reserve_step1(
    request: Request,
    booking_type: str = Form("table"),
    guests_count: int = Form(2)
):
    """Processes Step 1 and redirects to Step 2."""
    session_data = get_session_data(request)
    session_data["booking_type"] = booking_type
    session_data["guests_count"] = guests_count

    response = RedirectResponse(url="/reserve/step2", status_code=status.HTTP_303_SEE_OTHER)
    set_session_cookie(response, session_data)
    return response

@router.get("/reserve/step2", response_class=HTMLResponse)
def get_reserve_step2(request: Request):
    """Renders Step 2: Date, Time & Seating Atmosphere."""
    session_data = get_session_data(request)
    today_str = datetime.date.today().isoformat()

    return templates.TemplateResponse(request=request, name="reservation_step2.html", context={
        "reservation_date": session_data.get("reservation_date", today_str),
        "reservation_time": session_data.get("reservation_time", "19:00"),
        "seating_zone": session_data.get("seating_zone", "Main Royal Hall"),
        "min_date": today_str
    })

@router.post("/reserve/step2")
def post_reserve_step2(
    request: Request,
    reservation_date: str = Form(...),
    reservation_time: str = Form("19:00"),
    seating_zone: str = Form("Main Royal Hall")
):
    """Processes Step 2 and redirects to Step 3."""
    session_data = get_session_data(request)
    session_data["reservation_date"] = reservation_date
    session_data["reservation_time"] = reservation_time
    session_data["seating_zone"] = seating_zone

    response = RedirectResponse(url="/reserve/step3", status_code=status.HTTP_303_SEE_OTHER)
    set_session_cookie(response, session_data)
    return response

@router.get("/reserve/step3", response_class=HTMLResponse)
def get_reserve_step3(request: Request):
    """Renders Step 3: Guest Contact & Preferences."""
    session_data = get_session_data(request)
    today_str = datetime.date.today().isoformat()

    return templates.TemplateResponse(request=request, name="reservation_step3.html", context={
        "booking_type": session_data.get("booking_type", "table"),
        "guests_count": session_data.get("guests_count", 2),
        "reservation_date": session_data.get("reservation_date", today_str),
        "reservation_time": session_data.get("reservation_time", "19:00"),
        "seating_zone": session_data.get("seating_zone", "Main Royal Hall"),
        "guest_name": session_data.get("guest_name", ""),
        "phone": session_data.get("phone", ""),
        "email": session_data.get("email", ""),
        "special_request": session_data.get("special_request", "")
    })

@router.post("/reserve/submit")
def post_reserve_submit(
    request: Request,
    guest_name: str = Form(...),
    phone: str = Form(...),
    email: Optional[str] = Form(None),
    occasion: Optional[str] = Form("Regular Dining"),
    special_request: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Finalizes reservation submission, saves to SQLite DB, and redirects to Confirmation."""
    session_data = get_session_data(request)
    today_str = datetime.date.today().isoformat()

    booking_type = session_data.get("booking_type", "table")
    guests_count = int(session_data.get("guests_count", 2))
    res_date = session_data.get("reservation_date", today_str)
    res_time = session_data.get("reservation_time", "19:00")
    seating_zone = session_data.get("seating_zone", "Main Royal Hall")

    notes = []
    if seating_zone:
        notes.append(f"Atmosphere Zone: {seating_zone}")
    if occasion:
        notes.append(f"Occasion: {occasion}")
    if special_request and special_request.strip():
        notes.append(special_request.strip())
    
    full_special_request = " | ".join(notes)

    # Save to SQLite Database
    new_res = Reservation(
        guest_name=guest_name.strip(),
        phone=phone.strip(),
        email=email.strip() if email else None,
        guests_count=guests_count,
        reservation_date=res_date,
        reservation_time=res_time,
        special_request=full_special_request,
        status="Confirmed"
    )

    db.add(new_res)
    db.commit()
    db.refresh(new_res)

    from app.core.firestore_db import save_document
    save_document("reservations", str(new_res.id), new_res.to_dict())

    ip = get_client_ip(request)
    log_audit(db, ip, "GUEST", "CREATE_RESERVATION", f"Created table reservation #{new_res.id} for guest '{guest_name}'")

    response = RedirectResponse(url=f"/reserve/confirmation/{new_res.id}", status_code=status.HTTP_303_SEE_OTHER)
    response.delete_cookie(key=SESSION_COOKIE_NAME)
    return response

@router.get("/reserve/confirmation/{res_id}", response_class=HTMLResponse)
def get_reserve_confirmation(res_id: int, request: Request, db: Session = Depends(get_db)):
    """Renders Step 4 Confirmation Page."""
    res = db.query(Reservation).filter(Reservation.id == res_id).first()
    if not res:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

    return templates.TemplateResponse(request=request, name="reservation_confirmation.html", context={
        "reservation": res
    })
