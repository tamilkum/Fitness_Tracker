from datetime import date
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.activity import Sport


class ActivityDaySummary(BaseModel):
    date: date
    points: int
    activities: int


class SportBreakdown(BaseModel):
    sport: Sport
    activities: int
    points: int
    distance_km: Decimal
    duration_minutes: int
    steps: int


class DashboardRead(BaseModel):
    total_points: int
    activity_count: int
    history: list[ActivityDaySummary]
    sport_breakdown: list[SportBreakdown]


class CoachRead(BaseModel):
    active_days_last_7: int
    message: str
    disclaimer: str
