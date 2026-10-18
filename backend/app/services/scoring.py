from decimal import Decimal, ROUND_FLOOR


DISTANCE_RATES = {
    "running": Decimal("100"),
    "walking": Decimal("50"),
    "cycling": Decimal("25"),
}


def calculate_points(
    sport: str,
    *,
    distance_km: Decimal | None = None,
    duration_seconds: int | None = None,
    steps: int | None = None,
) -> int:
    if sport in DISTANCE_RATES and distance_km is not None:
        points = distance_km * DISTANCE_RATES[sport]
        return int(points.to_integral_value(rounding=ROUND_FLOOR))

    if sport == "swimming" and duration_seconds is not None:
        completed_minutes = duration_seconds // 60
        return completed_minutes * 15

    if sport == "gym" and duration_seconds is not None:
        completed_minutes = duration_seconds // 60
        return completed_minutes * 5

    if sport == "daily_steps" and steps is not None:
        return steps // 100

    raise ValueError("The sport and measurement do not match.")
