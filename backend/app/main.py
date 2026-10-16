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

    # 2. Ensure initial administrator exists
    db = SessionLocal()
    try:
        admin_email = settings.FIRST_SUPERUSER_EMAIL.strip().lower()
        existing_admin = db.query(Administrator).filter(Administrator.email == admin_email).first()
        if not existing_admin:
            hashed_pwd = get_password_hash(settings.FIRST_SUPERUSER_PASSWORD)
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
    except Exception as e:
        logger.error(f"Error seeding initial admin: {e}")
    finally:
        db.close()

    # 3. Ensure upload directories
    UploadService.get_upload_dir()
    logger.info("Temporary storage directories initialized.")

    yield

    # Shutdown actions
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
    allow_origins=settings.BACKEND_CORS_ORIGINS,
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
