import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.security import get_password_hash
from app.models import Administrator
from app.services.upload_service import UploadService

# Import routers
from app.api.v1.system import router as system_router
from app.api.v1.uploads import router as uploads_router
from app.api.v1.submissions import router as submissions_router
from app.api.v1.auth import router as auth_router
from app.api.v1.admin import router as admin_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("uhv_portal")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing UHV Portal backend services...")
    
    # 1. Initialize DB tables
    Base.metadata.create_all(bind=engine)
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        sub_cols = [c['name'] for c in inspector.get_columns('submissions')]
        file_cols = [c['name'] for c in inspector.get_columns('submission_files')]
        with engine.connect() as conn:
            if 'ip_address' not in sub_cols:
                conn.execute(text("ALTER TABLE submissions ADD COLUMN ip_address VARCHAR(45);"))
            if 'source_folder_url' not in sub_cols:
                conn.execute(text("ALTER TABLE submissions ADD COLUMN source_folder_url VARCHAR(500);"))
            if 'source_folder_id' not in sub_cols:
                conn.execute(text("ALTER TABLE submissions ADD COLUMN source_folder_id VARCHAR(100);"))
            if 'folder_name' not in sub_cols:
                conn.execute(text("ALTER TABLE submissions ADD COLUMN folder_name VARCHAR(150);"))
            if 'folder_verification_status' not in sub_cols:
                conn.execute(text("ALTER TABLE submissions ADD COLUMN folder_verification_status VARCHAR(50);"))
            if 'source_drive_url' not in file_cols:
                conn.execute(text("ALTER TABLE submission_files ADD COLUMN source_drive_url VARCHAR(500);"))
            if 'source_file_id' not in file_cols:
                conn.execute(text("ALTER TABLE submission_files ADD COLUMN source_file_id VARCHAR(100);"))
            if 'link_accessibility_status' not in file_cols:
                conn.execute(text("ALTER TABLE submission_files ADD COLUMN link_accessibility_status VARCHAR(50);"))
            if 'admin_drive_url' not in file_cols:
                conn.execute(text("ALTER TABLE submission_files ADD COLUMN admin_drive_url VARCHAR(500);"))
            conn.commit()
    except Exception as e:
        logger.warning(f"Note on checking table columns: {e}")
    logger.info("Database schemas verified.")

    # 2. Ensure initial administrator exists and password stays synced
    db = SessionLocal()
    try:
        admin_password = settings.ADMIN_PASSWORD.strip() if settings.ADMIN_PASSWORD else settings.FIRST_SUPERUSER_PASSWORD
        admin_email = settings.ADMIN_USERNAME.strip().lower() if ("@" in settings.ADMIN_USERNAME) else settings.FIRST_SUPERUSER_EMAIL.strip().lower()
        existing_admin = db.query(Administrator).filter(Administrator.email == admin_email).first()
        if not existing_admin:
            hashed_pwd = get_password_hash(admin_password)
            super_admin = Administrator(
                email=admin_email,
                hashed_password=hashed_pwd,
                full_name="UHV Portal Administrator",
                is_active=True,
                is_superuser=True
            )
            db.add(super_admin)
            db.commit()
            logger.info(f"Default Super Administrator created: {admin_email}")
        else:
            if admin_password:
                existing_admin.hashed_password = get_password_hash(admin_password)
                db.commit()
                logger.info(f"Synchronized credentials for administrator: {admin_email}")
    except Exception as e:
        logger.error(f"Error seeding initial admin: {e}")
    finally:
        db.close()

    # 2b. Reconcile specific student submission updates if present
    db_sync = SessionLocal()
    try:
        from app.models import Submission, SubmissionFile, Student
        target_sub = db_sync.query(Submission).filter(
            Submission.id == "9806f0cc-80b4-42db-860e-9100846508a2"
        ).first()
        if not target_sub:
            target_sub = (
                db_sync.query(Submission)
                .join(Student)
                .filter(Student.roll_number == "CSJMA24001390105")
                .first()
            )
        if target_sub:
            target_sub.source_folder_url = "https://drive.google.com/drive/folders/1doB2_OX7I5f4RBxHKDoGwtnTKLKd-7J0?usp=sharing"
            target_sub.source_folder_id = "1doB2_OX7I5f4RBxHKDoGwtnTKLKd-7J0"
            target_sub.folder_name = "CSJMA24001390105"
            target_sub.folder_verification_status = "ACCESSIBLE"
            target_sub.status = "COMPLETED"

            file_configs = [
                {
                    "file_type": "ppt",
                    "original_filename": "CSJMA24001390105_Backlog_R_R_Maheshwar.pptx",
                    "expected_filename": "CSJMA24001390105_Backlog_R_R_Maheshwar.pptx",
                    "mime_type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                    "file_size": 3663120,
                    "source_drive_url": "https://drive.google.com/file/d/1Z1_1IHKDnwZ0uNmev-ZA5T49eab_1kvn/view",
                    "source_file_id": "1Z1_1IHKDnwZ0uNmev-ZA5T49eab_1kvn",
                    "drive_file_id": "1p1boYJJwvcs5oINyeP0F7OeW4WPKpWWW",
                    "admin_drive_url": "https://drive.google.com/file/d/1p1boYJJwvcs5oINyeP0F7OeW4WPKpWWW/view",
                    "upload_status": "DRIVE_COMPLETED",
                    "verification_status": True,
                    "link_accessibility_status": "ACCESSIBLE",
                },
                {
                    "file_type": "video",
                    "original_filename": "CSJMA24001390105_Backlog_R_R_Maheshwar.mp4",
                    "expected_filename": "CSJMA24001390105_Backlog_R_R_Maheshwar.mp4",
                    "mime_type": "video/mp4",
                    "file_size": 62522469,
                    "source_drive_url": "https://drive.google.com/file/d/1H1HPMwvy2Pz9NpsV6MOJxqlDxTLCccpu/view",
                    "source_file_id": "1H1HPMwvy2Pz9NpsV6MOJxqlDxTLCccpu",
                    "drive_file_id": "1IUAQCLlE0kW7gUs7Xv34fFt-FQZV-hjs",
                    "admin_drive_url": "https://drive.google.com/file/d/1IUAQCLlE0kW7gUs7Xv34fFt-FQZV-hjs/view",
                    "upload_status": "DRIVE_COMPLETED",
                    "verification_status": True,
                    "link_accessibility_status": "ACCESSIBLE",
                },
                {
                    "file_type": "pdf",
                    "original_filename": "CSJMA24001390105_Backlog_R_R_Maheshwar.pdf",
                    "expected_filename": "CSJMA24001390105_Backlog_R_R_Maheshwar.pdf",
                    "mime_type": "application/pdf",
                    "file_size": 651865,
                    "source_drive_url": "https://drive.google.com/file/d/1KeglcTFkUsfTNHPoeR1sjXXwX95pTAq7/view",
                    "source_file_id": "1KeglcTFkUsfTNHPoeR1sjXXwX95pTAq7",
                    "drive_file_id": "1pHTwwUgM46N18Qm_8NtOKLMg27zjI37B",
                    "admin_drive_url": "https://drive.google.com/file/d/1pHTwwUgM46N18Qm_8NtOKLMg27zjI37B/view",
                    "upload_status": "DRIVE_COMPLETED",
                    "verification_status": True,
                    "link_accessibility_status": "ACCESSIBLE",
                }
            ]

            for cfg in file_configs:
                sf = db_sync.query(SubmissionFile).filter(
                    SubmissionFile.submission_id == target_sub.id,
                    SubmissionFile.file_type == cfg["file_type"]
                ).first()
                if sf:
                    sf.original_filename = cfg["original_filename"]
                    sf.expected_filename = cfg["expected_filename"]
                    sf.mime_type = cfg["mime_type"]
                    sf.file_size = cfg["file_size"]
                    sf.source_drive_url = cfg["source_drive_url"]
                    sf.source_file_id = cfg["source_file_id"]
                    sf.drive_file_id = cfg["drive_file_id"]
                    sf.admin_drive_url = cfg["admin_drive_url"]
                    sf.upload_status = cfg["upload_status"]
                    sf.verification_status = cfg["verification_status"]
                    sf.link_accessibility_status = cfg["link_accessibility_status"]
                else:
                    new_sf = SubmissionFile(
                        submission_id=target_sub.id,
                        file_type=cfg["file_type"],
                        original_filename=cfg["original_filename"],
                        expected_filename=cfg["expected_filename"],
                        mime_type=cfg["mime_type"],
                        file_size=cfg["file_size"],
                        source_drive_url=cfg["source_drive_url"],
                        source_file_id=cfg["source_file_id"],
                        drive_file_id=cfg["drive_file_id"],
                        admin_drive_url=cfg["admin_drive_url"],
                        upload_status=cfg["upload_status"],
                        verification_status=cfg["verification_status"],
                        link_accessibility_status=cfg["link_accessibility_status"]
                    )
                    db_sync.add(new_sf)
            db_sync.commit()
            logger.info("Synchronized submission links for CSJMA24001390105.")
    except Exception as e:
        logger.warning(f"Note on syncing CSJMA24001390105: {e}")
    finally:
        db_sync.close()

    # 3. Ensure upload directories
    UploadService.get_upload_dir()
    logger.info("Temporary storage directories initialized.")

    # 4. Background email queue watchdog (dispatches queued emails next day when 300 quota resets)
    import asyncio
    from app.tasks.email_tasks import dispatch_queued_notifications

    async def _queue_watchdog():
        await asyncio.sleep(15)
        while True:
            try:
                dispatch_queued_notifications()
            except asyncio.CancelledError:
                break
            except Exception as loop_err:
                logger.warning(f"Background email queue watchdog notice: {loop_err}")
            await asyncio.sleep(600)

    watchdog_task = asyncio.create_task(_queue_watchdog())

    # 5. Drive transfer queue recovery on startup
    try:
        from app.services.drive_queue import drive_queue
        from app.models import SubmissionFile
        rec_db = SessionLocal()
        try:
            interrupted_files = rec_db.query(SubmissionFile).filter(
                SubmissionFile.upload_status.in_(["TRANSFER_QUEUED", "TRANSFERRING"])
            ).all()
            for pf in interrupted_files:
                drive_queue.enqueue(pf.submission_id, pf.id)
            if interrupted_files:
                logger.info(f"Drive queue recovered {len(interrupted_files)} pending files on startup.")
        finally:
            rec_db.close()
    except Exception as q_err:
        logger.warning(f"Note on drive queue recovery on startup: {q_err}")

    yield

    # Shutdown actions
    watchdog_task.cancel()
    logger.info("Shutting down UHV Portal backend services cleanly...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="High-Concurrency Assignment Submission Portal for Universal Human Values (UHV)",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(system_router, prefix=f"{settings.API_V1_STR}/system", tags=["System & Guidelines"])
app.include_router(uploads_router, prefix=f"{settings.API_V1_STR}/uploads", tags=["Chunked Uploads & Validation"])
app.include_router(submissions_router, prefix=f"{settings.API_V1_STR}/submissions", tags=["Student Submissions"])
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["Admin Authentication"])
app.include_router(admin_router, prefix=f"{settings.API_V1_STR}/admin", tags=["Administrator Dashboard"])

@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "status": "online",
        "api_docs": "/docs",
        "deadline": settings.SUBMISSION_DEADLINE
    }
