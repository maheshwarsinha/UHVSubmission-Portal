from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.schemas.student import StudentCreate, StudentResponse
from app.schemas.file import SubmissionFileResponse

class SubmissionCreateRequest(BaseModel):
    student: StudentCreate
    topic: str = Field(..., min_length=3, max_length=255, description="Universal Human Values Topic")
    declaration_confirmed: bool = Field(..., description="Must check declaration before final submission")
    idempotency_key: Optional[str] = None

class SubmissionStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    submission_id: str
    tracking_id: str
    student_name: str
    roll_number: str
    section: str
    topic: str
    status: str
    deadline_classification: str
    server_received_at: datetime
    drive_completed_at: Optional[datetime] = None
    files: List[SubmissionFileResponse]
    email_status: str

class SubmissionReceiptResponse(BaseModel):
    tracking_id: str
    submission_id: str
    student_name: str
    roll_number: str
    branch: str
    section: str
    academic_year: str
    student_category: str
    student_email: str
    topic: str
    server_received_at_ist: str
    server_received_at_utc: datetime
    deadline_classification: str
    files: List[SubmissionFileResponse]
    source_folder_url: Optional[str] = None
    folder_name: Optional[str] = None
    server_storage_verified: bool
    gdrive_status: str
    email_receipt_status: str
    receipt_message: str

class SubmissionDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    tracking_id: str
    student: StudentResponse
    topic: str
    status: str
    server_received_at: datetime
    drive_completed_at: Optional[datetime] = None
    deadline_classification: str
    idempotency_key: Optional[str] = None
    ip_address: Optional[str] = None
    source_folder_url: Optional[str] = None
    source_folder_id: Optional[str] = None
    folder_name: Optional[str] = None
    folder_verification_status: Optional[str] = None
    notes: Optional[str] = None
    files: List[SubmissionFileResponse]
    created_at: datetime
    updated_at: datetime
