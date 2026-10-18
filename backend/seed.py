"""Seed the SQLite database with 3 realistic users, activities, and credentials.

Run from the backend/ directory:
    python seed.py

Credentials stored:
  priya.nair@stridefit.com    / Priya@2024!
  marcus.webb@stridefit.com   / Marcus@2024!
  lena.fischer@stridefit.com  / Lena@2024!
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.exc import IntegrityError

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.user import User
from app.models.activity import Activity
from app.models.credential import Credential
from app.services.achievements import evaluate_and_award
from app.services.scoring import calculate_points


def utc(days_ago: int, hour: int = 7) -> datetime:
    base = datetime.now(timezone.utc).replace(
        hour=hour, minute=0, second=0, microsecond=0
    )
    return base - timedelta(days=days_ago)


# ── Seed data ─────────────────────────────────────────────────────────────────

USERS = [
    {
        "first_name": "Priya",
        "last_name": "Nair",
        "email": "priya.nair@stridefit.com",
        "password": "Priya@2024!",
        "activities": [
            ("running",     {"distance_km": Decimal("8.5")},  14),
            ("running",     {"distance_km": Decimal("10.0")}, 12),
            ("walking",     {"distance_km": Decimal("5.0")},  11),
            ("running",     {"distance_km": Decimal("12.0")}, 10),
            ("gym",         {"duration_seconds": 3600},        9),
            ("running",     {"distance_km": Decimal("6.0")},   8),
            ("cycling",     {"distance_km": Decimal("20.0")},  7),
            ("running",     {"distance_km": Decimal("15.0")},  6),
            ("walking",     {"distance_km": Decimal("7.0")},   5),
            ("running",     {"distance_km": Decimal("10.0")},  4),
            ("swimming",    {"duration_seconds": 2700},         3),
            ("running",     {"distance_km": Decimal("8.0")},   2),
            ("daily_steps", {"steps": 12500},                  1),
            ("running",     {"distance_km": Decimal("11.0")},  0),
        ],
    },
    {
        "first_name": "Marcus",
        "last_name": "Webb",
        "email": "marcus.webb@stridefit.com",
        "password": "Marcus@2024!",
        "activities": [
            ("gym",         {"duration_seconds": 4500},        13),
            ("cycling",     {"distance_km": Decimal("25.0")},  12),
            ("gym",         {"duration_seconds": 5400},        11),
            ("cycling",     {"distance_km": Decimal("30.0")},  10),
            ("swimming",    {"duration_seconds": 3600},         9),
            ("gym",         {"duration_seconds": 3600},         8),
            ("cycling",     {"distance_km": Decimal("40.0")},   7),
            ("gym",         {"duration_seconds": 5400},         6),
            ("daily_steps", {"steps": 9800},                    5),
            ("cycling",     {"distance_km": Decimal("35.0")},   4),
            ("gym",         {"duration_seconds": 4500},         3),
            ("swimming",    {"duration_seconds": 2700},          2),
            ("cycling",     {"distance_km": Decimal("20.0")},   1),
            ("gym",         {"duration_seconds": 3600},          0),
        ],
    },
    {
        "first_name": "Lena",
        "last_name": "Fischer",
        "email": "lena.fischer@stridefit.com",
        "password": "Lena@2024!",
        "activities": [
            ("daily_steps", {"steps": 11200},                  13),
            ("walking",     {"distance_km": Decimal("4.0")},   12),
            ("daily_steps", {"steps": 13500},                  11),
            ("walking",     {"distance_km": Decimal("6.0")},   10),
            ("daily_steps", {"steps": 10000},                   9),
            ("swimming",    {"duration_seconds": 1800},          8),
            ("walking",     {"distance_km": Decimal("5.5")},    7),
            ("daily_steps", {"steps": 14200},                   6),
            ("walking",     {"distance_km": Decimal("4.5")},    5),
            ("daily_steps", {"steps": 9900},                    4),
            ("gym",         {"duration_seconds": 2700},          3),
            ("walking",     {"distance_km": Decimal("7.0")},    2),
            ("daily_steps", {"steps": 12000},                   1),
            ("walking",     {"distance_km": Decimal("5.0")},    0),
        ],
    },
]


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        for data in USERS:
            user = User(
                first_name=data["first_name"],
                last_name=data["last_name"],
                normalized_first_name=data["first_name"].casefold(),
                normalized_last_name=data["last_name"].casefold(),
            )
            db.add(user)
            db.flush()   # get the UUID before inserting activities

            # Credential row — password stored as bcrypt hash
            cred = Credential(
                user_id=user.id,
                email=data["email"],
                password_hash=hash_password(data["password"]),
            )
            db.add(cred)

            # Activities
            hour_offset = {"Priya": 7, "Marcus": 8, "Lena": 6}[data["first_name"]]
            for sport, metric, days_ago in data["activities"]:
                pts = calculate_points(sport, **metric)
                db.add(Activity(
                    user_id=user.id,
                    sport=sport,
                    distance_km=metric.get("distance_km"),
                    duration_seconds=metric.get("duration_seconds"),
                    steps=metric.get("steps"),
                    points=pts,
                    occurred_at=utc(days_ago, hour=hour_offset),
                ))

            db.commit()

            # Evaluate achievement badges
            for sport in {s for s, _, _ in data["activities"]}:
                evaluate_and_award(db, user.id, sport)

            total_pts = sum(
                calculate_points(s, **m) for s, m, _ in data["activities"]
            )
            print(
                f"✓ {data['first_name']} {data['last_name']}"
                f"  id={user.id}"
                f"  pts={total_pts}"
            )

        print("\n─── Login credentials ───────────────────────────────────────")
        for d in USERS:
            print(f"  Email   : {d['email']}")
            print(f"  Password: {d['password']}")
            print()

    except IntegrityError as exc:
        db.rollback()
        print(f"\n✗ Already seeded (IntegrityError): {exc.orig}")
        print("  Delete fitness_challenge.db and run again to reseed.")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
