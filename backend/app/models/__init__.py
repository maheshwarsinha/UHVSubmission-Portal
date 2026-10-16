import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, BigInteger, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class Student(Base):
    __tablename__ = "students"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    roll_number = Column(String(50), nullable=False, index=True)
    name = Column(String(150), nullable=False, index=True)
    branch = Column(String(100), nullable=False)
    section = Column(String(50), nullable=False, index=True)
    academic_year = Column(String(50), nullable=False)
    student_category = Column(String(20), nullable=False, default="Regular")  # Regular or Backlog
    email = Column(String(150), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    submissions = relationship("Submission", back_populates="student", cascade="all, delete-orphan")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tracking_id = Column(String(50), unique=True, nullable=False, index=True)  # Human-readable e.g. UHV-2026-ABCD12
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False, index=True)
    topic = Column(String(255), nullable=False)
    status = Column(String(30), nullable=False, default="RECEIVED", index=True)  # RECEIVED, DRIVE_PENDING, COMPLETED, FAILED
    server_received_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    drive_completed_at = Column(DateTime(timezone=True), nullable=True)
    deadline_classification = Column(String(20), nullable=False, default="ON_TIME")  # ON_TIME, LATE
    idempotency_key = Column(String(100), unique=True, nullable=True, index=True)
    ip_address = Column(String(45), nullable=True)
    source_folder_url = Column(String(500), nullable=True)  # Student's shared Google Drive folder URL
    source_folder_id = Column(String(100), nullable=True, index=True)  # Extracted Google Drive folder ID
    folder_name = Column(String(150), nullable=True)  # Detected folder name
    folder_verification_status = Column(String(50), nullable=True, default="UNVERIFIED")  # ACCESSIBLE, RESTRICTED, MISMATCH
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    student = relationship("Student", back_populates="submissions")
    files = relationship("SubmissionFile", back_populates="submission", cascade="all, delete-orphan")
    jobs = relationship("BackgroundJob", back_populates="submission", cascade="all, delete-orphan")
    notifications = relationship("NotificationRecord", back_populates="submission", cascade="all, delete-orphan")


class SubmissionFile(Base):
    __tablename__ = "submission_files"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id = Column(String(36), ForeignKey("submissions.id"), nullable=False, index=True)
    file_type = Column(String(20), nullable=False)  # ppt, pdf, video
    original_filename = Column(String(255), nullable=False)
    expected_filename = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    sha256_checksum = Column(String(64), nullable=True)
    temp_storage_path = Column(String(500), nullable=True)
    source_drive_url = Column(String(500), nullable=True)  # Student's shared Google Drive link
    source_file_id = Column(String(100), nullable=True, index=True)  # Extracted Google Drive file ID
    link_accessibility_status = Column(String(50), nullable=True, default="UNVERIFIED")  # ACCESSIBLE, RESTRICTED, INVALID
    drive_file_id = Column(String(100), nullable=True, index=True)  # File ID in Admin's Google Drive
    admin_drive_url = Column(String(500), nullable=True)  # Link to file in Admin's Google Drive
    upload_status = Column(String(30), nullable=False, default="RECEIVED")  # RECEIVED, TRANSFER_QUEUED, TRANSFERRING, DRIVE_COMPLETED, FAILED
    verification_status = Column(Boolean, default=False, nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    submission = relationship("Submission", back_populates="files")


class BackgroundJob(Base):
    __tablename__ = "background_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id = Column(String(36), ForeignKey("submissions.id"), nullable=False, index=True)
    file_id = Column(String(36), ForeignKey("submission_files.id"), nullable=True, index=True)
    job_type = Column(String(50), nullable=False)  # gdrive_upload, email_student, email_teacher, temp_cleanup
    status = Column(String(30), nullable=False, default="QUEUED", index=True)  # QUEUED, PROCESSING, COMPLETED, RETRYING, FAILED
    retry_count = Column(Integer, default=0, nullable=False)
    max_retries = Column(Integer, default=3, nullable=False)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    submission = relationship("Submission", back_populates="jobs")


class NotificationRecord(Base):
    __tablename__ = "notification_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id = Column(String(36), ForeignKey("submissions.id"), nullable=False, index=True)
    recipient_type = Column(String(20), nullable=False)  # STUDENT, TEACHER
    recipient_address = Column(String(150), nullable=False)
    notification_type = Column(String(50), nullable=False)  # SUBMISSION_RECEIPT, DRIVE_VERIFIED, TEACHER_ALERT
    delivery_status = Column(String(30), nullable=False, default="PENDING")  # PENDING, SENT, FAILED
    attempt_count = Column(Integer, default=0, nullable=False)
    provider_message_id = Column(String(100), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)

    submission = relationship("Submission", back_populates="notifications")


class Administrator(Base):
    __tablename__ = "administrators"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(150), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    audit_logs = relationship("AuditLog", back_populates="admin")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    admin_id = Column(String(36), ForeignKey("administrators.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False)  # e.g. CONFIG_UPDATE, JOB_RETRY, RESUBMISSION_ALLOW, CSV_EXPORT
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    admin = relationship("Administrator", back_populates="audit_logs")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True)
    value = Column(JSON, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
