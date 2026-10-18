from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


def get_user(db: Session, user_id: str) -> User | None:
    return db.get(User, user_id)


def find_user_by_name(
    db: Session,
    first_name: str,
    last_name: str,
) -> User | None:
    normalized_first = first_name.casefold()
    normalized_last = last_name.casefold()

    statement = select(User).where(
        User.normalized_first_name == normalized_first,
        User.normalized_last_name == normalized_last,
    )

    return db.scalar(statement)


def create_user(
    db: Session,
    first_name: str,
    last_name: str,
) -> User:
    user = User(
        first_name=first_name,
        last_name=last_name,
        normalized_first_name=first_name.casefold(),
        normalized_last_name=last_name.casefold(),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def update_user(
    db: Session,
    user: User,
    first_name: str,
    last_name: str,
    age=None,
    date_of_birth=None,
    country=None,
    state_province=None,
    city=None,
    house_address=None,
) -> User:
    user.first_name = first_name
    user.last_name = last_name
    user.normalized_first_name = first_name.casefold()
    user.normalized_last_name = last_name.casefold()

    user.age = age
    user.date_of_birth = date_of_birth
    user.country = country
    user.state_province = state_province
    user.city = city
    user.house_address = house_address

    db.add(user)
    db.commit()
    db.refresh(user)

    return user
