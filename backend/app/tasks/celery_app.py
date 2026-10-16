import os
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "uhv_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.drive_tasks",
        "app.tasks.email_tasks",
        "app.tasks.cleanup_tasks"
    ]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone=settings.TIMEZONE,
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_concurrency=settings.MAX_CONCURRENT_PROCESSING_JOBS,
    task_routes={
        "app.tasks.drive_tasks.*": {"queue": "gdrive_uploads"},
        "app.tasks.email_tasks.*": {"queue": "email_notifications"},
        "app.tasks.cleanup_tasks.*": {"queue": "maintenance"},
    }
)

from celery.signals import worker_process_init

@worker_process_init.connect
def reset_db_engine(**kwargs):
    try:
        from app.core.database import engine
        engine.dispose()
    except Exception:
        pass
