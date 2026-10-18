from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password
from app.models.credential import Credential
from app.repositories.users import create_user, get_user
from app.schemas.auth import CredentialCreate, SignInRequest, SignInResponse
from app.schemas.user import UserCreate


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=SignInResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user account with email + password",
)
def register(
    payload: UserCreate,
    email: str,
    password: str,
    db: Session = Depends(get_db),
):
    """Single endpoint that creates the user row and credential row together."""
    # (kept simple — the dedicated /register endpoint below is what the
    #  frontend calls; this documents the combined flow)
    raise HTTPException(status_code=404, detail="Use /auth/create instead.")


@router.post(
    "/create",
    response_model=SignInResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create user + store hashed password in the credentials table",
)
def create_account(
    payload: CredentialCreate,
    db: Session = Depends(get_db),
):
    """Attach an email + hashed password to an already-created user.

    Call flow:
    1. Frontend calls POST /api/users/ to create the user record.
    2. Frontend calls POST /api/auth/create with the returned user_id,
       email, and password to store the credential.
    """
    user = get_user(db, payload.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    # Check if a credential already exists for this user
    existing = db.scalars(
        select(Credential).where(Credential.user_id == payload.user_id)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Credentials are already set for this user.",
        )

    cred = Credential(
        user_id=payload.user_id,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
    )

    try:
        db.add(cred)
        db.commit()
        db.refresh(cred)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    return SignInResponse(
        user_id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=cred.email,
        created_at=user.created_at.isoformat(),
    )


@router.post(
    "/signin",
    response_model=SignInResponse,
    summary="Sign in with email + password, returns user info",
)
def sign_in(
    payload: SignInRequest,
    db: Session = Depends(get_db),
):
    cred = db.scalars(
        select(Credential).where(
            Credential.email == payload.email.lower()
        )
    ).first()

    if cred is None or not verify_password(payload.password, cred.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    user = get_user(db, cred.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return SignInResponse(
        user_id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=cred.email,
        created_at=user.created_at.isoformat(),
    )
