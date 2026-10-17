import os
import logging
from datetime import datetime, timezone
try:
    from app.tasks.celery_app import celery_app
except Exception:
    celery_app = None

from app.core.database import SessionLocal
from app.models import Submission, SubmissionFile, BackgroundJob
from app.services.gdrive_service import gdrive_service

logger = logging.getLogger("drive_tasks")

def _task_wrapper(func):
    if celery_app:
        return celery_app.task(bind=True, max_retries=3, default_retry_delay=60)(func)
    return func

@_task_wrapper
def upload_file_to_gdrive_task(self_or_sub_id, submission_id_or_file_id=None, file_id=None):
    """
    Asynchronous worker task to upload a local submission file to Google Drive.
    Supports being called as a Celery task (with self) or directly.
    """
    if file_id is not None:
        # Called as Celery task: self, submission_id, file_id
        submission_id = submission_id_or_file_id
    else:
        # Called directly: submission_id, file_id
        submission_id = self_or_sub_id
        file_id = submission_id_or_file_id
    db = SessionLocal()
    try:
        sub_file = db.query(SubmissionFile).filter(SubmissionFile.id == file_id).first()
        submission = db.query(Submission).filter(Submission.id == submission_id).first()

        if not sub_file or not submission:
            logger.error(f"Submission or File not found: sub={submission_id}, file={file_id}")
            return {"status": "error", "message": "Record not found"}

        # Find or create job record
        job = db.query(BackgroundJob).filter(
            BackgroundJob.submission_id == submission_id,
            BackgroundJob.file_id == file_id,
            BackgroundJob.job_type == "gdrive_upload"
        ).first()

        if not job:
            job = BackgroundJob(
                submission_id=submission_id,
                file_id=file_id,
                job_type="gdrive_upload",
                status="PROCESSING"
            )
            db.add(job)
        else:
            job.status = "PROCESSING"
        
        sub_file.upload_status = "DRIVE_UPLOADING"
        db.commit()

        # Execute upload to section/category folder
        student = submission.student
        is_backlog = bool(student and student.student_category and student.student_category.strip().lower() == "backlog")
        if is_backlog:
            section = "Backlog"
        else:
            section = student.section if student else "General"
        roll_num = student.roll_number if student else ""

        # Case A: File provided via Google Drive Link
        if sub_file.source_file_id or sub_file.source_drive_url:
            from app.services.gdrive_link_service import gdrive_link_service
            source_id = sub_file.source_file_id or gdrive_link_service.extract_file_id(sub_file.source_drive_url)
            success, drive_id, web_link, message = gdrive_link_service.transfer_to_admin_drive(
                source_file_id=source_id,
                expected_filename=sub_file.expected_filename,
                section=section,
                roll_number=roll_num,
                mime_type=sub_file.mime_type or "application/octet-stream"
            )
        else:
            # Case B: Local chunked file upload
            local_path = sub_file.temp_storage_path
            if not local_path or not os.path.exists(local_path):
                from app.services.upload_service import UploadService
                upload_dir = UploadService.get_upload_dir()
                candidate0 = os.path.join(upload_dir, section, roll_num, sub_file.expected_filename) if roll_num else ""
                candidate1 = os.path.join(upload_dir, section, sub_file.expected_filename)
                candidate2 = os.path.join(upload_dir, "completed", sub_file.expected_filename)
                if candidate0 and os.path.exists(candidate0):
                    local_path = candidate0
                elif os.path.exists(candidate1):
                    local_path = candidate1
                elif os.path.exists(candidate2):
                    local_path = candidate2

            success, drive_id, web_link, message = gdrive_service.upload_file(
                local_file_path=local_path,
                target_filename=sub_file.expected_filename,
                section=section,
                mime_type=sub_file.mime_type,
                roll_number=roll_num
            )

        if success:
            sub_file.drive_file_id = drive_id
            sub_file.admin_drive_url = web_link
            sub_file.upload_status = "DRIVE_COMPLETED"
            sub_file.verification_status = True
            sub_file.error_message = None
            job.status = "COMPLETED"
            db.commit()

            # Check if all files in submission are uploaded to Drive
            pending_files = db.query(SubmissionFile).filter(
                SubmissionFile.submission_id == submission_id,
                SubmissionFile.upload_status != "DRIVE_COMPLETED"
            ).count()

            if pending_files == 0:
                submission.status = "COMPLETED"
                submission.drive_completed_at = datetime.now(timezone.utc)
                db.commit()

            logger.info(f"Drive upload task succeeded for file {file_id}: {drive_id}")
            return {"status": "completed", "drive_id": drive_id}
        else:
            job.status = "RETRYING"
            job.retry_count += 1
            job.last_error = message
            sub_file.upload_status = "FAILED"
            sub_file.error_message = message
            db.commit()

            # Retry with exponential backoff
            retry_in = 60 * (2 ** self.request.retries)
            raise self.retry(exc=Exception(message), countdown=retry_in)

    except Exception as exc:
        logger.error(f"Exception during Drive upload task for file {file_id}: {exc}")
        if self.request.retries >= self.max_retries:
            job.status = "FAILED"
            job.last_error = str(exc)
            sub_file.upload_status = "FAILED"
            db.commit()
        raise exc
    finally:
        db.close()


def execute_drive_transfer(submission_id: str, file_id: str) -> dict:
    """
    Executes Google Drive transfer directly without requiring a Celery worker.
    Used for local testing, fallback background tasks, or direct admin manual trigger.
    """
    db = SessionLocal()
    try:
        sub_file = db.query(SubmissionFile).filter(SubmissionFile.id == file_id).first()
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not sub_file or not submission:
            return {"status": "error", "message": "Record not found"}

        sub_file.upload_status = "TRANSFERRING"
        db.commit()

        student = submission.student
        is_backlog = bool(student and student.student_category and student.student_category.strip().lower() == "backlog")
        section = "Backlog" if is_backlog else (student.section if student else "General")
        roll_num = student.roll_number if student else ""

        if sub_file.source_file_id or sub_file.source_drive_url:
            from app.services.gdrive_link_service import gdrive_link_service
            source_id = sub_file.source_file_id or gdrive_link_service.extract_file_id(sub_file.source_drive_url)
            success, drive_id, web_link, message = gdrive_link_service.transfer_to_admin_drive(
                source_file_id=source_id,
                expected_filename=sub_file.expected_filename,
                section=section,
                roll_number=roll_num,
                mime_type=sub_file.mime_type or "application/octet-stream"
            )
        else:
            local_path = sub_file.temp_storage_path or ""
            success, drive_id, web_link, message = gdrive_service.upload_file(
                local_file_path=local_path,
                target_filename=sub_file.expected_filename,
                section=section,
                mime_type=sub_file.mime_type or "application/octet-stream",
                roll_number=roll_num
            )

        if success:
            sub_file.drive_file_id = drive_id
            sub_file.admin_drive_url = web_link
            sub_file.upload_status = "DRIVE_COMPLETED"
            sub_file.verification_status = True
            sub_file.error_message = None
            db.commit()

            pending_files = db.query(SubmissionFile).filter(
                SubmissionFile.submission_id == submission_id,
                SubmissionFile.upload_status != "DRIVE_COMPLETED"
            ).count()

            if pending_files == 0:
                submission.status = "COMPLETED"
                submission.drive_completed_at = datetime.now(timezone.utc)
                db.commit()
            return {"status": "completed", "drive_id": drive_id, "web_link": web_link}
        else:
            sub_file.upload_status = "FAILED"
            sub_file.error_message = message
            db.commit()
            return {"status": "failed", "message": message}
    except Exception as e:
        logger.error(f"Error in execute_drive_transfer: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()
