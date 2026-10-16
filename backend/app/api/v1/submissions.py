import os
import shutil
import uuid
import secrets
from datetime import datetime, timezone
import pytz
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status, Request
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.core.config import settings
from app.models import Student, Submission, SubmissionFile, BackgroundJob, SystemSetting
from app.schemas.student import StudentCreate
from app.schemas.submission import SubmissionReceiptResponse, SubmissionStatusResponse
from app.services.upload_service import UploadService
from app.services.email_service import EmailService

from app.tasks.drive_tasks import execute_drive_transfer
from app.services.gdrive_link_service import gdrive_link_service

# Task triggers (Celery with fallback)
try:
    from app.tasks.drive_tasks import upload_file_to_gdrive_task
    from app.tasks.email_tasks import send_submission_emails_task
    CELERY_AVAILABLE = True
except Exception:
    CELERY_AVAILABLE = False

router = APIRouter()

@router.get("/check-roll/{roll_number}")
def check_roll_submission(roll_number: str, db: Session = Depends(get_db)):
    """
    Checks if a student with this roll number has already submitted an assignment.
    """
    clean_roll = roll_number.strip().upper()
    existing_sub = (
        db.query(Submission)
        .join(Student)
        .filter(func.upper(Student.roll_number) == clean_roll)
        .first()
    )
    if existing_sub:
        return {
            "already_submitted": True,
            "tracking_id": existing_sub.tracking_id,
            "student_name": existing_sub.student.name,
            "topic": existing_sub.topic
        }
    return {"already_submitted": False}

class FileSubmissionItem(BaseModel):
    file_type: str  # ppt, pdf, video
    expected_filename: str
    file_token: Optional[str] = None
    original_filename: Optional[str] = None
    mime_type: Optional[str] = None
    file_size: Optional[int] = 0
    sha256: Optional[str] = None
    source_drive_url: Optional[str] = None
    source_file_id: Optional[str] = None
    link_accessibility_status: Optional[str] = None

class FinalSubmissionPayload(BaseModel):
    student: StudentCreate
    topic: str
    declaration_confirmed: bool
    files: List[FileSubmissionItem]
    source_folder_url: Optional[str] = None
    source_folder_id: Optional[str] = None
    folder_name: Optional[str] = None
    folder_verification_status: Optional[str] = None
    idempotency_key: Optional[str] = None

def generate_tracking_id() -> str:
    # Format: UHV-2026-XXXXXX (6 alphanumeric chars)
    random_part = secrets.token_hex(3).upper()
    return f"UHV-2026-{random_part}"

def check_deadline_status(db: Session, server_time_utc: datetime) -> str:
    setting = db.query(SystemSetting).filter(SystemSetting.key == "submission_deadline").first()
    deadline_str = setting.value if setting else settings.SUBMISSION_DEADLINE

    ist_tz = pytz.timezone(settings.TIMEZONE)
    try:
        deadline_dt = datetime.fromisoformat(deadline_str)
        if deadline_dt.tzinfo is None:
            deadline_dt = ist_tz.localize(deadline_dt)
        # Convert deadline to UTC for strict comparison
        deadline_utc = deadline_dt.astimezone(timezone.utc)
        return "ON_TIME" if server_time_utc <= deadline_utc else "LATE"
    except Exception:
        return "ON_TIME"

@router.post("", response_model=SubmissionReceiptResponse)
def submit_assignment(
    payload: FinalSubmissionPayload,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Submits student's assignment, generates submission receipt with IST timestamp,
    and initiates asynchronous Google Drive backup and email receipt dispatch.
    """
    # 1. Verify Declaration
    if not payload.declaration_confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must accept the declaration confirming your files follow assignment rules."
        )

    # 2. Check if portal is open
    open_setting = db.query(SystemSetting).filter(SystemSetting.key == "submissions_open").first()
    is_open = open_setting.value if open_setting else settings.SUBMISSIONS_OPEN
    if not is_open:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Assignment submissions are currently closed by the university administrator."
        )

    # 3. Check Idempotency Key to prevent duplicate submissions on double-clicks
    if payload.idempotency_key:
        existing = db.query(Submission).filter(Submission.idempotency_key == payload.idempotency_key).first()
        if existing:
            # Return existing receipt immediately
            return build_receipt_response(existing)

    # 4. Validate Files Requirements
    file_types_present = {f.file_type for f in payload.files}
    if "ppt" not in file_types_present:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PowerPoint presentation (.ppt/.pptx) is required."
        )
    if "video" not in file_types_present:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Presentation video (.mp4) is required."
        )

    # Check if PDF is mandatory
    pdf_req_setting = db.query(SystemSetting).filter(SystemSetting.key == "pdf_required").first()
    pdf_required = pdf_req_setting.value if pdf_req_setting else settings.PDF_REQUIRED
    if pdf_required and "pdf" not in file_types_present:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PDF presentation companion copy is currently required by administrator configuration."
        )

    # 5. Timestamp and Deadline classification
    server_now_utc = datetime.now(timezone.utc)
    deadline_status = check_deadline_status(db, server_now_utc)

    # 6. Strict Roll Number Check: Only one submission per student roll number allowed!
    clean_roll = payload.student.roll_number.strip().upper()
    existing_sub = (
        db.query(Submission)
        .join(Student)
        .filter(func.upper(Student.roll_number) == clean_roll)
        .first()
    )
    if existing_sub:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A submission has already been recorded for University Roll Number '{payload.student.roll_number}' (Tracking ID: {existing_sub.tracking_id}). Each student is only permitted one submission."
        )

    # 7. Locate or Create Student
    student = db.query(Student).filter(
        Student.roll_number == payload.student.roll_number,
        Student.section == payload.student.section
    ).first()

    if not student:
        student = Student(
            roll_number=payload.student.roll_number,
            name=payload.student.name,
            branch=payload.student.branch,
            section=payload.student.section,
            academic_year=payload.student.academic_year,
            student_category=payload.student.student_category,
            email=str(payload.student.email)
        )
        db.add(student)
        db.flush()
    else:
        # Update details if student updated them
        student.name = payload.student.name
        student.branch = payload.student.branch
        student.email = str(payload.student.email)
        student.student_category = payload.student.student_category

    # 8. Create Submission Record
    client_ip = None
    if request:
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        elif request.headers.get("X-Real-IP"):
            client_ip = request.headers.get("X-Real-IP").strip()
        elif request.client:
            client_ip = request.client.host

    folder_url = payload.source_folder_url.strip() if payload.source_folder_url else None
    folder_id = payload.source_folder_id or (gdrive_link_service.extract_folder_id(folder_url) if folder_url else None)

    tracking_id = generate_tracking_id()
    submission = Submission(
        tracking_id=tracking_id,
        student_id=student.id,
        topic=payload.topic.strip(),
        status="RECEIVED",
        server_received_at=server_now_utc,
        deadline_classification=deadline_status,
        idempotency_key=payload.idempotency_key,
        ip_address=client_ip,
        source_folder_url=folder_url,
        source_folder_id=folder_id,
        folder_name=payload.folder_name,
        folder_verification_status=payload.folder_verification_status or "ACCESSIBLE"
    )
    db.add(submission)
    db.flush()

    upload_dir = UploadService.get_upload_dir()
    is_backlog = bool(payload.student.student_category and payload.student.student_category.strip().lower() == "backlog")
    folder_category = "Backlog" if is_backlog else (payload.student.section or "GENERAL").upper()
    student_roll_dir = os.path.join(upload_dir, folder_category, clean_roll)
    os.makedirs(student_roll_dir, exist_ok=True)

    # 9. Create Submission Files
    created_files: List[SubmissionFile] = []
    for f_item in payload.files:
        is_drive_link = bool(f_item.source_drive_url and f_item.source_drive_url.strip())
        
        if is_drive_link:
            drive_url = f_item.source_drive_url.strip()
            source_id = f_item.source_file_id or gdrive_link_service.extract_file_id(drive_url)
            default_mime = "video/mp4" if f_item.file_type == "video" else ("application/vnd.openxmlformats-officedocument.presentationml.presentation" if f_item.file_type == "ppt" else "application/pdf")
            sub_file = SubmissionFile(
                submission_id=submission.id,
                file_type=f_item.file_type,
                original_filename=f_item.original_filename or f_item.expected_filename,
                expected_filename=f_item.expected_filename,
                mime_type=f_item.mime_type or default_mime,
                file_size=f_item.file_size or 0,
                sha256_checksum=f_item.sha256 or None,
                source_drive_url=drive_url,
                source_file_id=source_id,
                link_accessibility_status=f_item.link_accessibility_status or "ACCESSIBLE",
                temp_storage_path=None,
                upload_status="TRANSFER_QUEUED",
                verification_status=False
            )
        else:
            full_temp_path = os.path.join(upload_dir, "completed", f_item.file_token) if f_item.file_token else ""
            target_final_path = os.path.join(student_roll_dir, f_item.expected_filename)

            if full_temp_path and os.path.exists(full_temp_path):
                try:
                    shutil.copy2(full_temp_path, target_final_path)
                    storage_path = target_final_path
                except Exception:
                    storage_path = full_temp_path
            else:
                storage_path = full_temp_path

            sub_file = SubmissionFile(
                submission_id=submission.id,
                file_type=f_item.file_type,
                original_filename=f_item.original_filename or f_item.expected_filename,
                expected_filename=f_item.expected_filename,
                mime_type=f_item.mime_type or "application/octet-stream",
                file_size=f_item.file_size or 0,
                sha256_checksum=f_item.sha256,
                temp_storage_path=storage_path,
                upload_status="RECEIVED",
                verification_status=False
            )

        db.add(sub_file)
        created_files.append(sub_file)

    db.commit()
    db.refresh(submission)

    # 10. Trigger Asynchronous Background Tasks
    # Drive uploads & Email dispatch
    for sub_file in created_files:
        if CELERY_AVAILABLE:
            try:
                upload_file_to_gdrive_task.delay(submission.id, sub_file.id)
            except Exception:
                background_tasks.add_task(execute_drive_transfer, submission.id, sub_file.id)
        else:
            background_tasks.add_task(execute_drive_transfer, submission.id, sub_file.id)

    if CELERY_AVAILABLE:
        try:
            send_submission_emails_task.delay(submission.id)
        except Exception:
            pass

    return build_receipt_response(submission)

@router.get("/{tracking_id}", response_model=SubmissionReceiptResponse)
def get_submission_by_tracking(tracking_id: str, db: Session = Depends(get_db)):
    """
    Looks up a student submission receipt by unique tracking ID (e.g. UHV-2026-ABCD12).
    """
    submission = db.query(Submission).filter(Submission.tracking_id == tracking_id.upper()).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No submission found with tracking ID '{tracking_id}'"
        )
    return build_receipt_response(submission)

def build_receipt_response(submission: Submission) -> SubmissionReceiptResponse:
    student = submission.student
    ist_tz = pytz.timezone(settings.TIMEZONE)
    server_time_ist = submission.server_received_at.astimezone(ist_tz).strftime("%d %B %Y, %I:%M:%S %p IST")

    files_list = [
        {
            "id": f.id,
            "file_type": f.file_type,
            "original_filename": f.original_filename,
            "expected_filename": f.expected_filename,
            "mime_type": f.mime_type,
            "file_size": f.file_size,
            "sha256_checksum": f.sha256_checksum,
            "source_drive_url": f.source_drive_url,
            "source_file_id": f.source_file_id,
            "link_accessibility_status": f.link_accessibility_status,
            "drive_file_id": f.drive_file_id,
            "admin_drive_url": f.admin_drive_url,
            "upload_status": f.upload_status,
            "verification_status": f.verification_status,
            "created_at": f.created_at
        }
        for f in submission.files
    ]

    all_in_drive = all(f.upload_status == "DRIVE_COMPLETED" for f in submission.files)
    gdrive_status = "ARCHIVED_IN_GDRIVE" if all_in_drive else "QUEUED_FOR_GDRIVE"

    return SubmissionReceiptResponse(
        tracking_id=submission.tracking_id,
        submission_id=submission.id,
        student_name=student.name,
        roll_number=student.roll_number,
        branch=student.branch,
        section=student.section,
        academic_year=student.academic_year,
        student_category=student.student_category,
        student_email=student.email,
        topic=submission.topic,
        server_received_at_ist=server_time_ist,
        server_received_at_utc=submission.server_received_at,
        deadline_classification=submission.deadline_classification,
        files=files_list,
        source_folder_url=submission.source_folder_url,
        folder_name=submission.folder_name,
        server_storage_verified=True,
        gdrive_status=gdrive_status,
        email_receipt_status="DELIVERED_OR_QUEUED",
        receipt_message="Your submission has been safely recorded by the university server. Please retain this tracking ID."
    )
