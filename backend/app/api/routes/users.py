from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.repositories.users import create_user, get_user, update_user
from app.schemas.user import UserCreate, UserRead, UserUpdate


router = APIRouter(
    prefix="/users",
    tags=["users"],
)


@router.post(
    "/",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
):
    try:
        return create_user(
            db,
            first_name=payload.first_name,
            last_name=payload.last_name,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this first and last name is already registered.",
        )


@router.get(
    "/{user_id}",
    response_model=UserRead,
)
def read_user(
    user_id: str,
    db: Session = Depends(get_db),
):
    user: User | None = get_user(db, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return user


@router.patch(
    "/{user_id}",
    response_model=UserRead,
)
def patch_user(
    user_id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
):
    user: User | None = get_user(db, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    # Only skip the DB write if truly nothing changed
    if (
        user.normalized_first_name == payload.first_name.casefold()
        and user.normalized_last_name == payload.last_name.casefold()
        and user.age == payload.age
        and str(user.date_of_birth) == str(payload.date_of_birth)
        and (user.country or None) == (payload.country or None)
        and (user.state_province or None) == (payload.state_province or None)
        and (user.city or None) == (payload.city or None)
        and (user.house_address or None) == (payload.house_address or None)
    ):
        return user

    try:
        return update_user(
            db,
            user,
            first_name=payload.first_name,
            last_name=payload.last_name,
            age=payload.age,
            date_of_birth=payload.date_of_birth,
            country=payload.country,
            state_province=payload.state_province,
            city=payload.city,
            house_address=payload.house_address,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this first and last name is already registered.",
        )
