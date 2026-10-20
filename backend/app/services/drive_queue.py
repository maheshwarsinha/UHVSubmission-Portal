import time
import threading
import queue
import logging
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timezone

from app.db.session import SessionLocal
from app.models import Submission, SubmissionFile, BackgroundJob
from app.tasks.drive_tasks import execute_drive_transfer

logger = logging.getLogger("drive_queue")

class DriveTransferQueue:
    """
    Serial, thread-safe FIFO queue for archiving student files to Google Drive.
    Ensures that only ONE file/video is transferred at a time, completely preventing
    server memory exhaustion, bandwidth choking, and Google Drive concurrency rate limits.
    """
    def __init__(self):
        self._queue: queue.Queue[Tuple[str, str]] = queue.Queue()
        self._enqueued_file_ids: set[str] = set()
        self._lock = threading.Lock()
        self._current_task: Optional[Dict[str, Any]] = None
        self._worker_thread: Optional[threading.Thread] = None
        self._start_worker()

    def _start_worker(self):
        if self._worker_thread is None or not self._worker_thread.is_alive():
            self._worker_thread = threading.Thread(
                target=self._worker_loop,
                daemon=True,
                name="DriveTransferQueueWorker"
            )
            self._worker_thread.start()
            logger.info("DriveTransferQueue background worker thread started.")

    def enqueue(self, submission_id: str, file_id: str) -> bool:
        """
        Enqueues a file for sequential Google Drive upload.
        Returns True if enqueued, False if already in queue or completed.
        """
        with self._lock:
            if file_id in self._enqueued_file_ids:
                logger.info(f"File {file_id} already in Drive transfer queue. Skipping duplicate.")
                return False
            self._enqueued_file_ids.add(file_id)
            self._queue.put((submission_id, file_id))

        # Update DB status so UI reflects queued state immediately
        db = SessionLocal()
        try:
            sub_file = db.query(SubmissionFile).filter(SubmissionFile.id == file_id).first()
            if sub_file and sub_file.upload_status != "DRIVE_COMPLETED":
                sub_file.upload_status = "TRANSFER_QUEUED"
                db.commit()
        except Exception as e:
            logger.error(f"Error updating file {file_id} status to TRANSFER_QUEUED: {e}")
        finally:
            db.close()

        logger.info(f"Enqueued file {file_id} (submission: {submission_id}) to Drive transfer queue. Queue size: {self.size()}")
        self._start_worker()
        return True

    def enqueue_submission(self, submission_id: str) -> int:
        """
        Enqueues all pending files of a submission into the sequential queue.
        """
        db = SessionLocal()
        enqueued_count = 0
        try:
            submission = db.query(Submission).filter(Submission.id == submission_id).first()
            if not submission:
                return 0
            for f in submission.files:
                if f.upload_status != "DRIVE_COMPLETED":
                    if self.enqueue(submission_id, f.id):
                        enqueued_count += 1
        finally:
            db.close()
        return enqueued_count

    def size(self) -> int:
        return self._queue.qsize()

    def get_status(self) -> Dict[str, Any]:
        return {
            "queue_size": self.size(),
            "current_task": self._current_task,
            "is_busy": self._current_task is not None
        }

    def _worker_loop(self):
        logger.info("DriveTransferQueue worker loop active.")
        while True:
            try:
                task = self._queue.get()
                if task is None:
                    break
                submission_id, file_id = task
                self._current_task = {
                    "submission_id": submission_id,
                    "file_id": file_id,
                    "started_at": datetime.now(timezone.utc).isoformat()
                }

                logger.info(f"[DriveQueue] Processing file {file_id} (submission: {submission_id}). Remaining in queue: {self.size()}")
                try:
                    res = execute_drive_transfer(submission_id, file_id)
                    logger.info(f"[DriveQueue] Finished file {file_id}: {res.get('status')}")
                except Exception as ex:
                    logger.error(f"[DriveQueue] Error processing file {file_id}: {ex}")
                finally:
                    with self._lock:
                        self._enqueued_file_ids.discard(file_id)
                    self._current_task = None
                    self._queue.task_done()
                    # Small cooldown between heavy transfers to prevent socket/RAM saturation
                    time.sleep(1.0)
            except Exception as loop_err:
                logger.error(f"Unexpected error in DriveQueue worker loop: {loop_err}")
                time.sleep(2.0)

drive_queue = DriveTransferQueue()
