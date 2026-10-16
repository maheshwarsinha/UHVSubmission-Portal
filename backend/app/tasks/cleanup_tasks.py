import os
import time
import shutil
import logging
from datetime import datetime, timezone, timedelta
from app.tasks.celery_app import celery_app
from app.core.database import SessionLocal
from app.core.config import settings
from app.models import SubmissionFile
from app.services.upload_service import UploadService

logger = logging.getLogger("cleanup_tasks")

@celery_app.task
def cleanup_expired_files_task():
    """
    Cleans up local temporary files whose Google Drive transfer has been verified,
    and removes abandoned chunk directories older than 24 hours.
    """
    db = SessionLocal()
    upload_dir = UploadService.get_upload_dir()
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=settings.TEMP_FILE_RETENTION_HOURS)

    try:
        # 1. Clean completed files verified in Drive
        completed_files = db.query(SubmissionFile).filter(
            SubmissionFile.upload_status == "DRIVE_COMPLETED",
            SubmissionFile.verification_status == True,
            SubmissionFile.created_at <= cutoff_time
        ).all()

        deleted_count = 0
        for f in completed_files:
            if f.temp_storage_path and os.path.exists(f.temp_storage_path):
                try:
                    os.remove(f.temp_storage_path)
                    f.temp_storage_path = None
                    deleted_count += 1
                except Exception as err:
                    logger.warning(f"Could not remove local temp file {f.temp_storage_path}: {err}")
        db.commit()

        # 2. Clean abandoned chunk folders older than 24h
        chunks_dir = os.path.join(upload_dir, "chunks")
        now_ts = time.time()
        abandoned_count = 0
        if os.path.exists(chunks_dir):
            for entry in os.listdir(chunks_dir):
                entry_path = os.path.join(chunks_dir, entry)
                if os.path.isdir(entry_path):
                    # Check age
                    stat = os.stat(entry_path)
                    if now_ts - stat.st_mtime > 86400:  # 24 hours
                        shutil.rmtree(entry_path, ignore_errors=True)
                        abandoned_count += 1

        logger.info(f"Cleanup run finished. Removed {deleted_count} uploaded files and {abandoned_count} abandoned chunk dirs.")
        return {"deleted_files": deleted_count, "abandoned_chunks": abandoned_count}
    except Exception as e:
        logger.error(f"Error during cleanup task: {e}")
        return {"error": str(e)}
    finally:
        db.close()
