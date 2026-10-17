import logging
from datetime import datetime, timezone
try:
    from app.tasks.celery_app import celery_app
except Exception:
    celery_app = None

from app.core.database import SessionLocal
from app.core.config import settings
from app.models import Submission, NotificationRecord, BackgroundJob
from app.services.email_service import email_service

logger = logging.getLogger("email_tasks")

def execute_email_dispatch(submission_id: str) -> dict:
    """
    Direct asynchronous email delivery function for FastAPI BackgroundTasks.
    Runs reliably in background without requiring Celery or Redis.
    """
    db = SessionLocal()
    try:
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            logger.error(f"Submission {submission_id} not found for email task.")
            return {"status": "error", "message": "Submission not found"}

        student = submission.student
        files_info = [
            {
                "file_type": f.file_type,
                "expected_filename": f.expected_filename,
                "file_size": f.file_size,
                "upload_status": f.upload_status
            }
            for f in submission.files
        ]

        # 1. Deliver Student Email
        student_notif = NotificationRecord(
            submission_id=submission.id,
            recipient_type="STUDENT",
            recipient_address=student.email,
            notification_type="SUBMISSION_RECEIPT",
            delivery_status="PROCESSING"
        )
        db.add(student_notif)
        db.commit()

        s_success, s_msg = email_service.send_student_receipt(
            student_email=student.email,
            student_name=student.name,
            roll_number=student.roll_number,
            section=student.section,
            branch=student.branch,
            topic=submission.topic,
            tracking_id=submission.tracking_id,
            server_received_at=submission.server_received_at,
            files_info=files_info,
            deadline_classification=submission.deadline_classification
        )

        student_notif.delivery_status = "SENT" if s_success else "FAILED"
        student_notif.provider_message_id = s_msg if s_success else None
        student_notif.error_message = None if s_success else s_msg
        student_notif.sent_at = datetime.now(timezone.utc) if s_success else None
        db.commit()

        # 2. Deliver Teacher Email if configured
        teacher_email = settings.TEACHER_EMAIL or settings.EMAIL_FROM
        if teacher_email:
            teacher_notif = NotificationRecord(
                submission_id=submission.id,
                recipient_type="TEACHER",
                recipient_address=teacher_email,
                notification_type="TEACHER_ALERT",
                delivery_status="PROCESSING"
            )
            db.add(teacher_notif)
            db.commit()

            t_success, t_msg = email_service.send_teacher_notification(
                teacher_email=teacher_email,
                student_name=student.name,
                roll_number=student.roll_number,
                section=student.section,
                topic=submission.topic,
                tracking_id=submission.tracking_id,
                server_received_at=submission.server_received_at
            )

            teacher_notif.delivery_status = "SENT" if t_success else "FAILED"
            teacher_notif.provider_message_id = t_msg if t_success else None
            teacher_notif.error_message = None if t_success else t_msg
            teacher_notif.sent_at = datetime.now(timezone.utc) if t_success else None
            db.commit()

        logger.info(f"Email tasks processed successfully for submission {submission_id}")
        return {"status": "completed", "student_email_sent": s_success}
    except Exception as exc:
        logger.error(f"Error in execute_email_dispatch for {submission_id}: {exc}")
        return {"status": "error", "message": str(exc)}
    finally:
        db.close()

def _task_wrapper(func):
    if celery_app:
        return celery_app.task(bind=True, max_retries=3, default_retry_delay=30)(func)
    return func

@_task_wrapper
def send_submission_emails_task(self_or_sub_id, submission_id=None):
    """
    Celery task wrapper delegating to execute_email_dispatch.
    """
    actual_sub_id = submission_id if submission_id is not None else self_or_sub_id
    return execute_email_dispatch(actual_sub_id)
