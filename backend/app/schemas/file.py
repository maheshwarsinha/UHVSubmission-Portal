from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class ExpectedFilenamesResponse(BaseModel):
    base_name: str
    ppt_filename: str
    pdf_filename: str
    video_filename: str
    naming_rules: str

class FileValidationResult(BaseModel):
    file_type: str  # ppt, pdf, video
    filename: str
    is_valid: bool
    error_message: Optional[str] = None
    expected_filename: str
    detected_mime: Optional[str] = None
    file_size_bytes: int
    file_size_mb: float

class SubmissionFileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    file_type: str
    original_filename: str
    expected_filename: str
    mime_type: str
    file_size: int
    sha256_checksum: Optional[str] = None
    source_drive_url: Optional[str] = None
    source_file_id: Optional[str] = None
    link_accessibility_status: Optional[str] = None
    drive_file_id: Optional[str] = None
    admin_drive_url: Optional[str] = None
    upload_status: str
    verification_status: bool
    created_at: datetime

class ChunkUploadResponse(BaseModel):
    upload_id: str
    chunk_index: int
    total_chunks: int
    bytes_received: int
    is_complete: bool
    file_id: Optional[str] = None
    sha256_checksum: Optional[str] = None
