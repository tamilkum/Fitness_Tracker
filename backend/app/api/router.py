from fastapi import APIRouter

from app.api.routes import (
    achievements,
    activities,
    auth,
    chat,
    dashboard,
    leaderboard,
    users,
)


api_router = APIRouter(prefix="/api")

api_router.include_router(users.router)
api_router.include_router(auth.router)
api_router.include_router(activities.router)
api_router.include_router(leaderboard.router)
api_router.include_router(dashboard.router)
api_router.include_router(achievements.router)
api_router.include_router(chat.router)
