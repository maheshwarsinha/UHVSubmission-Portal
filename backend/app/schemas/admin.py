from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    admin_name: str
    admin_email: str
    is_superuser: bool

class TokenData(BaseModel):
    email: Optional[str] = None

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class AdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    full_name: str
    is_active: bool
    is_superuser: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None

class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime

class MetricsSummaryResponse(BaseModel):
    total_submissions: int
    completed_submissions: int
    drive_pending_submissions: int
    failed_submissions: int
    on_time_count: int
    late_count: int
    regular_count: int
    backlog_count: int
    section_breakdown: Dict[str, int]
    daily_breakdown: Dict[str, int]
    disk_free_gb: float
    disk_total_gb: float
    disk_used_percent: float
    email_sent_today: Optional[int] = 0
    email_daily_limit: Optional[int] = 300
    email_remaining_today: Optional[int] = 300
    email_queued_count: Optional[int] = 0

class ResetDataRequest(BaseModel):
    password: str

