from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class AssignmentPublicConfig(BaseModel):
    assignment_title: str
    deadline_iso: str
    deadline_formatted_ist: str
    is_open: bool
    allowed_sections: List[str]
    allowed_branches: List[str]
    allowed_years: List[str]
    max_ppt_size_mb: int
    max_pdf_size_mb: int
    max_video_size_mb: int
    pdf_optional_allowed: bool
    pdf_required: bool
    video_allowed_extensions: List[str]
    current_time_ist: str

class SystemSettingsUpdate(BaseModel):
    submission_deadline: Optional[str] = None
    submissions_open: Optional[bool] = None
    allowed_sections: Optional[List[str]] = None
    max_ppt_size_mb: Optional[int] = None
    max_pdf_size_mb: Optional[int] = None
    max_video_size_mb: Optional[int] = None
    pdf_optional_allowed: Optional[bool] = None
    pdf_required: Optional[bool] = None
    teacher_email: Optional[str] = None
    gdrive_root_folder_name: Optional[str] = None
