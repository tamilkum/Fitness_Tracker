from datetime import datetime

from pydantic import BaseModel, ConfigDict, computed_field

from app.services.milestones import MILESTONE_CONFIG, label_for


class AchievementRead(BaseModel):
    """Represents a single earned badge returned by the API."""

    id: int
    slug: str
    unlocked_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @computed_field  # type: ignore[misc]
    @property
    def label(self) -> str:
        """Human-readable label derived from the slug.

        slug format: <sport>_<value><unit>  e.g. running_10km
        We build the label from the milestone config when possible,
        falling back to the slug itself.
        """
        for sport, config in MILESTONE_CONFIG.items():
            prefix = f"{sport}_"
            if self.slug.startswith(prefix):
                suffix = self.slug[len(prefix):]          # e.g. "10km"
                unit = config.unit                         # e.g. "km"
                if suffix.endswith(unit):
                    value_str = suffix[: -len(unit)]
                    try:
                        threshold = float(value_str)
                        return label_for(sport, threshold, unit)
                    except ValueError:
                        pass
        return self.slug  # fallback
