"""Milestone configuration for each sport.

Each entry describes the thresholds at which a badge is awarded and how to
build the slug and human-readable label for that badge.

To add milestones for a new sport, append an entry to MILESTONE_CONFIG.
The 'unit' field is used only for display; the values are always in the
natural unit for that sport (km for distance, minutes for duration, hundreds
for steps).

For distance sports the thresholds list contains explicit values.
The 'repeat_after' field means: after the last explicit threshold, keep
awarding a badge every <repeat_after> units.
"""

from decimal import Decimal
from dataclasses import dataclass, field


@dataclass(frozen=True)
class SportMilestones:
    sport: str
    unit: str                    # display label, e.g. "km", "min", "steps"
    thresholds: list[float]      # explicit milestone values in ascending order
    repeat_after: float | None   # if set, extend with this step beyond last threshold


# ── Distance sports (km) ──────────────────────────────────────────────────────

_DISTANCE_THRESHOLDS = [10.0, 50.0, 100.0]
_DISTANCE_REPEAT = 100.0

# ── Duration sports (completed minutes) ───────────────────────────────────────
# Configurable; no thresholds set yet → no badges awarded until values are added

_SWIMMING_THRESHOLDS: list[float] = [
    60.0,    # 1 hour total
    300.0,   # 5 hours total
    600.0,   # 10 hours total
]
_SWIMMING_REPEAT = 600.0  # every additional 10 hours

_GYM_THRESHOLDS: list[float] = [
    60.0,    # 1 hour total
    300.0,   # 5 hours total
    600.0,   # 10 hours total
]
_GYM_REPEAT = 600.0  # every additional 10 hours

# ── Steps (raw step count) ────────────────────────────────────────────────────

_STEPS_THRESHOLDS: list[float] = [
    10_000.0,    # first 10 k steps
    50_000.0,
    100_000.0,
]
_STEPS_REPEAT = 100_000.0  # every additional 100 k steps


MILESTONE_CONFIG: dict[str, SportMilestones] = {
    "running": SportMilestones(
        sport="running",
        unit="km",
        thresholds=_DISTANCE_THRESHOLDS,
        repeat_after=_DISTANCE_REPEAT,
    ),
    "walking": SportMilestones(
        sport="walking",
        unit="km",
        thresholds=_DISTANCE_THRESHOLDS,
        repeat_after=_DISTANCE_REPEAT,
    ),
    "cycling": SportMilestones(
        sport="cycling",
        unit="km",
        thresholds=_DISTANCE_THRESHOLDS,
        repeat_after=_DISTANCE_REPEAT,
    ),
    "swimming": SportMilestones(
        sport="swimming",
        unit="min",
        thresholds=_SWIMMING_THRESHOLDS,
        repeat_after=_SWIMMING_REPEAT,
    ),
    "gym": SportMilestones(
        sport="gym",
        unit="min",
        thresholds=_GYM_THRESHOLDS,
        repeat_after=_GYM_REPEAT,
    ),
    "daily_steps": SportMilestones(
        sport="daily_steps",
        unit="steps",
        thresholds=_STEPS_THRESHOLDS,
        repeat_after=_STEPS_REPEAT,
    ),
}


def milestones_up_to(config: SportMilestones, cumulative: float) -> list[float]:
    """Return every milestone value that is ≤ cumulative.

    Starts with the explicit thresholds then extends with repeat_after until
    the generated value exceeds the cumulative total.
    """
    result: list[float] = []

    for t in config.thresholds:
        if t <= cumulative:
            result.append(t)

    if config.repeat_after is not None and config.thresholds:
        next_val = config.thresholds[-1] + config.repeat_after
        while next_val <= cumulative:
            result.append(next_val)
            next_val += config.repeat_after

    return result


def slug_for(sport: str, threshold: float, unit: str) -> str:
    """Build a stable machine-readable slug for a badge.

    Examples:
        running_10km   running_100km   cycling_200km
        swimming_60min gym_300min      daily_steps_10000steps
    """
    # Format the threshold: drop the decimal point when it is a whole number
    if threshold == int(threshold):
        value_str = str(int(threshold))
    else:
        value_str = str(threshold)

    return f"{sport}_{value_str}{unit}"


def label_for(sport: str, threshold: float, unit: str) -> str:
    """Human-readable badge label shown on the frontend."""
    sport_display = sport.replace("_", " ").title()

    if threshold == int(threshold):
        value_str = str(int(threshold))
    else:
        value_str = str(threshold)

    return f"{sport_display} — {value_str} {unit}"
