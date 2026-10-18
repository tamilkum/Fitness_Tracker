from pydantic import BaseModel


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str          # UUID string
    name: str
    total_points: int
    consistency_days: int
    rank_change: int | None = None
