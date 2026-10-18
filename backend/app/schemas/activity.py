from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


Sport = Literal[
    "running",
    "walking",
    "cycling",
    "gym",
    "swimming",
    "daily_steps",
]


class ActivityCreate(BaseModel):
    user_id: str = Field(
        min_length=36,
        max_length=36,
        description="UUID of the registered user who completed the activity",
    )
    sport: Sport = Field(
        description="Activity type; determines which one metric is required",
    )

    distance_km: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=10,
        decimal_places=3,
        description="Distance for running, walking, or cycling",
    )
    duration_seconds: int | None = Field(
        default=None,
        ge=1,
        le=86400,
        description="Duration for gym or swimming",
    )
    steps: int | None = Field(
        default=None,
        ge=1,
        le=2_000_000,
        description="Step count for daily_steps",
    )
    occurred_at: datetime | None = Field(
        default=None,
        description="When the activity occurred; omitted values use the current UTC time",
    )

    @model_validator(mode="after")
    def metric_matches_sport(self):
        expected_metric = {
            "running": "distance_km",
            "walking": "distance_km",
            "cycling": "distance_km",
            "gym": "duration_seconds",
            "swimming": "duration_seconds",
            "daily_steps": "steps",
        }[self.sport]

        supplied_metrics = [
            name
            for name, value in (
                ("distance_km", self.distance_km),
                ("duration_seconds", self.duration_seconds),
                ("steps", self.steps),
            )
            if value is not None
        ]

        if supplied_metrics != [expected_metric]:
            raise ValueError(
                f"{self.sport} requires only the {expected_metric} metric"
            )

        return self


class ActivityRead(BaseModel):
    id: int
    user_id: str     # UUID string
    sport: Sport
    distance_km: Decimal | None
    duration_seconds: int | None
    steps: int | None
    points: int
    occurred_at: datetime

    model_config = ConfigDict(from_attributes=True)
