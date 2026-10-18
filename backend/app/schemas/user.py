from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)

    @field_validator("first_name", "last_name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise ValueError("Name cannot be blank")
        return value


class UserUpdate(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)

    # Profile details
    age: Optional[int] = Field(default=None, ge=1, le=120)
    date_of_birth: Optional[date] = None

    # Location details
    country: Optional[str] = Field(default=None, max_length=100)
    state_province: Optional[str] = Field(default=None, max_length=100)
    city: Optional[str] = Field(default=None, max_length=100)
    house_address: Optional[str] = Field(default=None, max_length=255)

    @field_validator("first_name", "last_name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise ValueError("Name cannot be blank")
        return value


class UserRead(BaseModel):
    id: str          # UUID string
    first_name: str
    last_name: str

    # Profile details
    age: Optional[int] = None
    date_of_birth: Optional[date] = None

    # Location details
    country: Optional[str] = None
    state_province: Optional[str] = None
    city: Optional[str] = None
    house_address: Optional[str] = None

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
