"""
BSR Demo Data Seed Script
Populates SQLite (bsr_restaurant.db) and Google Cloud Firestore with sample Orders, Reservations, and Private Events.
"""

import sys
import json
import datetime
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal, get_firestore_db
from app.models import Order, Reservation, PrivateEvent
from app.core.firestore_db import save_document

def seed():
    print("=" * 60)
    print("  BSR Data Seeder: SQLite & Google Cloud Firestore")
    print("=" * 60)

    db = SessionLocal()
    firestore_db = get_firestore_db()

    today_str = datetime.date.today().isoformat()

    # Sample Orders
    sample_orders = [
        {
            "id": "BSR-2026-A1B2",
            "customer_name": "Anirban Roy",
            "customer_phone": "+91 98765 43210",
            "order_type": "Dine-In",
            "delivery_address": None,
            "table_number": "Table 04",
            "items_json": json.dumps([
                {"id": "1", "name": "Sorshe Ilish", "price": 850.0, "qty": 1},
                {"id": "6", "name": "Basmati Rice", "price": 120.0, "qty": 2},
                {"id": "4", "name": "Artisanal Mishti", "price": 350.0, "qty": 1}
            ]),
            "subtotal": 1440.0,
            "discount": 144.0,
            "coupon_code": "BENGAL10",
            "total": 1296.0,
            "status": "Confirmed",
            "outlet_id": "OUTLET-01"
        },
        {
            "id": "BSR-2026-C3D4",
            "customer_name": "Priyanka Chatterjee",
            "customer_phone": "+91 98310 12345",
            "order_type": "Delivery",
            "delivery_address": "A9, Phase 3, Kalyani, Nadia, WB - 741235",
            "table_number": None,
            "items_json": json.dumps([
                {"id": "2", "name": "Kosha Mangsho", "price": 750.0, "qty": 2},
                {"id": "7", "name": "Luchi", "price": 40.0, "qty": 8}
            ]),
            "subtotal": 1820.0,
            "discount": 0.0,
            "coupon_code": None,
            "total": 1820.0,
            "status": "In Preparation",
            "outlet_id": "OUTLET-01"
        },
        {
            "id": "BSR-2026-E5F6",
            "customer_name": "Subhabrata Das",
            "customer_phone": "+91 94330 67890",
            "order_type": "Takeaway",
            "delivery_address": None,
            "table_number": None,
            "items_json": json.dumps([
                {"id": "3", "name": "Chingri Malai", "price": 650.0, "qty": 1},
                {"id": "5", "name": "Kachchi Biryani", "price": 450.0, "qty": 2}
            ]),
            "subtotal": 1550.0,
            "discount": 155.0,
            "coupon_code": "BENGAL10",
            "total": 1395.0,
            "status": "Ready",
            "outlet_id": "OUTLET-01"
        }
    ]

    # Sample Reservations
    sample_reservations = [
        {
            "guest_name": "Dr. Debasis Banerjee",
            "phone": "+91 98300 99887",
            "email": "debasis.b@example.com",
            "guests_count": 4,
            "reservation_date": today_str,
            "reservation_time": "07:30 PM (Dinner)",
            "special_request": "Window table preferred",
            "event_type": "Table Booking",
            "status": "Confirmed",
            "outlet_id": "OUTLET-01"
        },
        {
            "guest_name": "Sutapa Sengupta",
            "phone": "+91 91234 56789",
            "email": "sutapa.s@example.com",
            "guests_count": 6,
            "reservation_date": today_str,
            "reservation_time": "01:30 PM (Lunch)",
            "special_request": "Anniversary celebration setup",
            "event_type": "Table Booking",
            "status": "Pending",
            "outlet_id": "OUTLET-01"
        }
    ]

    # Sample Private Events
    sample_events = [
        {
            "organizer_name": "Kalyani Cultural Society",
            "phone": "+91 98000 11223",
            "email": "events@kalyanicultural.org",
            "event_type": "Banquet Hall",
            "guest_count": 35,
            "event_date": today_str,
            "event_time": "06:00 PM",
            "special_notes": "Annual meet & traditional Bengali buffet menu setup",
            "status": "Confirmed",
            "outlet_id": "OUTLET-01"
        }
    ]

    try:
        # Seed Orders
        for o_data in sample_orders:
            existing = db.query(Order).filter(Order.id == o_data["id"]).first()
            if not existing:
                order_obj = Order(**o_data)
                db.add(order_obj)
                db.commit()
                db.refresh(order_obj)
                save_document("orders", order_obj.id, order_obj.to_dict())
                print(f"[+] Seeded Order: {order_obj.id}")

        # Seed Reservations
        for r_data in sample_reservations:
            existing = db.query(Reservation).filter(
                Reservation.guest_name == r_data["guest_name"],
                Reservation.reservation_date == r_data["reservation_date"]
            ).first()
            if not existing:
                res_obj = Reservation(**r_data)
                db.add(res_obj)
                db.commit()
                db.refresh(res_obj)
                save_document("reservations", str(res_obj.id), res_obj.to_dict())
                print(f"[+] Seeded Reservation #{res_obj.id} for {res_obj.guest_name}")

        # Seed Private Events
        for e_data in sample_events:
            existing = db.query(PrivateEvent).filter(
                PrivateEvent.organizer_name == e_data["organizer_name"]
            ).first()
            if not existing:
                evt_obj = PrivateEvent(**e_data)
                db.add(evt_obj)
                db.commit()
                db.refresh(evt_obj)
                save_document("private_events", str(evt_obj.id), evt_obj.to_dict())
                print(f"[+] Seeded Private Event #{evt_obj.id} for {evt_obj.organizer_name}")

        print("=" * 60)
        print("  Data Seeding Complete! Records pushed to SQLite & Firestore.")
        print("=" * 60)
    except Exception as e:
        print(f"[!] Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
