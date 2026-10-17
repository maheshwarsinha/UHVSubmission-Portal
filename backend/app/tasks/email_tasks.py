import logging
from datetime import datetime, timezone
try:
    from app.tasks.celery_app import celery_app
except Exception:
    celery_app = None

from app.core.database import SessionLocal
from app.core.config import settings
import pytz
from app.models import Submission, NotificationRecord, BackgroundJob, SystemSetting
from app.services.email_service import email_service

logger = logging.getLogger("email_tasks")

def execute_email_dispatch(submission_id: str) -> dict:
    """
    Direct asynchronous email delivery function for FastAPI BackgroundTasks.
    Runs reliably in background without requiring Celery or Redis.
    Tracks 300/day free quota: if exceeded, queues student receipt for next day without user-facing error.
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

        # Check daily email quota (300/day Brevo limit)
        ist_tz = pytz.timezone(settings.TIMEZONE)
        now_ist = datetime.now(ist_tz)
        start_of_today_utc = now_ist.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)

        sent_today = db.query(NotificationRecord).filter(
            NotificationRecord.delivery_status == "SENT",
            NotificationRecord.sent_at >= start_of_today_utc
        ).count()

        daily_limit = 300

        # 1. Deliver or Queue Student Receipt
        if sent_today >= daily_limit:
            logger.info(f"Daily email limit ({daily_limit}) reached ({sent_today} sent today). Queuing student receipt for next day.")
            student_notif = NotificationRecord(
                submission_id=submission.id,
                recipient_type="STUDENT",
                recipient_address=student.email,
                notification_type="SUBMISSION_RECEIPT",
                delivery_status="QUEUED_DAILY_LIMIT",
                error_message="Daily free tier quota reached (300/300). Queued for automated dispatch tomorrow."
            )
            db.add(student_notif)
            db.commit()
            s_success = True
            s_msg = "QUEUED_DAILY_LIMIT"
        else:
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

        # 2. Deliver Teacher Email if configured (Dynamically check SystemSetting from UI first!)
        teacher_setting = db.query(SystemSetting).filter(SystemSetting.key == "teacher_email").first()
        teacher_email = (teacher_setting.value if teacher_setting and teacher_setting.value else None) or settings.TEACHER_EMAIL or settings.EMAIL_FROM

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

def dispatch_queued_notifications() -> dict:
    """
    Scans and dispatches any notifications queued due to daily quota limit (300/day).
    Runs when quota resets or on manual admin trigger.
    """
    db = SessionLocal()
    try:
        ist_tz = pytz.timezone(settings.TIMEZONE)
        now_ist = datetime.now(ist_tz)
        start_of_today_utc = now_ist.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)

        sent_today = db.query(NotificationRecord).filter(
            NotificationRecord.delivery_status == "SENT",
            NotificationRecord.sent_at >= start_of_today_utc
        ).count()

        daily_limit = 300
        available_slots = max(0, daily_limit - sent_today)

        if available_slots <= 0:
            return {"dispatched": 0, "available_slots": 0, "message": "Daily email quota currently exhausted."}

        queued_records = db.query(NotificationRecord).filter(
            NotificationRecord.delivery_status == "QUEUED_DAILY_LIMIT"
        ).order_by(NotificationRecord.created_at.asc()).limit(available_slots).all()

        dispatched_count = 0
        for notif in queued_records:
            sub = notif.submission
            if not sub:
                continue
            student = sub.student
            files_info = [
                {
                    "file_type": f.file_type,
                    "expected_filename": f.expected_filename,
                    "file_size": f.file_size,
                    "upload_status": f.upload_status
                }
                for f in sub.files
            ]
            ok, msg = email_service.send_student_receipt(
                student_email=student.email,
                student_name=student.name,
                roll_number=student.roll_number,
                section=student.section,
                branch=student.branch,
                topic=sub.topic,
                tracking_id=sub.tracking_id,
                server_received_at=sub.server_received_at,
                files_info=files_info,
                deadline_classification=sub.deadline_classification
            )
            if ok:
                notif.delivery_status = "SENT"
                notif.provider_message_id = msg
                notif.error_message = None
                notif.sent_at = datetime.now(timezone.utc)
                dispatched_count += 1
                db.commit()

        return {
            "dispatched": dispatched_count,
            "remaining_slots": max(0, available_slots - dispatched_count),
            "message": f"Successfully dispatched {dispatched_count} queued notification(s)."
        }
    except Exception as e:
        logger.error(f"Error dispatching queued notifications: {e}")
        return {"status": "error", "message": str(e)}
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
