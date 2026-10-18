from pydantic import BaseModel, EmailStr, Field


class CredentialCreate(BaseModel):
    """Attaches email + password to an existing user_id."""
    user_id: str = Field(min_length=36, max_length=36)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class SignInRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class SignInResponse(BaseModel):
    user_id: str
    first_name: str
    last_name: str
    email: str
    created_at: str
