from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from typing import Optional
from datetime import datetime
import re

class StudentBase(BaseModel):
    roll_number: str = Field(..., description="University Roll Number, e.g. 25001390001", min_length=3, max_length=50)
    name: str = Field(..., description="Full Name of the student", min_length=2, max_length=150)
    branch: str = Field(..., description="Branch/Department", min_length=2, max_length=100)
    section: str = Field(..., description="Section, e.g. CSE1, CSE2, CSE3, CSE-AI", min_length=2, max_length=50)
    academic_year: str = Field(..., description="Academic Year, e.g. 2nd Year", min_length=2, max_length=50)
    student_category: str = Field(default="Regular", description="Regular or Backlog")
    email: EmailStr = Field(..., description="Official/valid student email address")

    @field_validator("roll_number", mode="before")
    def clean_roll_number(cls, v: str) -> str:
        if isinstance(v, str):
            cleaned = re.sub(r"[^a-zA-Z0-9_\-]", "", v.strip().upper())
            if not cleaned:
                raise ValueError("University roll number cannot be empty after trimming")
            return cleaned
        return v

    @field_validator("name", mode="before")
    def clean_name(cls, v: str) -> str:
        if isinstance(v, str):
            cleaned = " ".join(v.strip().split())
            if not cleaned:
                raise ValueError("Student name cannot be empty")
            return cleaned
        return v

    @field_validator("section", mode="before")
    def clean_section(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().upper()
        return v

    @field_validator("student_category", mode="before")
    def clean_category(cls, v: str) -> str:
        if isinstance(v, str):
            val = v.strip().capitalize()
            if val not in ["Regular", "Backlog"]:
                return "Regular"
            return val
        return v

class StudentCreate(StudentBase):
    pass

class StudentResponse(StudentBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime
