import os
from typing import List, Union, Optional
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json

# Calculate project root and backend directories
_CORE_DIR = os.path.dirname(os.path.abspath(__file__))
_APP_DIR = os.path.dirname(_CORE_DIR)
_BACKEND_DIR = os.path.dirname(_APP_DIR)
_PROJECT_ROOT = os.path.dirname(_BACKEND_DIR)

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[
            os.path.join(_PROJECT_ROOT, ".env"),
            os.path.join(_BACKEND_DIR, ".env"),
            ".env"
        ],
        env_file_encoding="utf-8",
        extra="ignore"
    )

    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "UHV Assignment Submission Portal"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "super_secret_uhv_key_2026_change_in_production_32chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    TIMEZONE: str = "Asia/Kolkata"

    SERVER_HOST: str = "0.0.0.0"
    SERVER_PORT: int = 8000

    # CORS
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost",
        "http://127.0.0.1",
        "*"
    ]

    @property
    def cors_origins(self) -> List[str]:
        if isinstance(self.BACKEND_CORS_ORIGINS, list):
            return self.BACKEND_CORS_ORIGINS
        if isinstance(self.BACKEND_CORS_ORIGINS, str):
            val = self.BACKEND_CORS_ORIGINS.strip()
            if val.startswith("[") and val.endswith("]"):
                try:
                    return json.loads(val)
                except Exception:
                    pass
            return [x.strip() for x in val.split(",") if x.strip()]
        return ["*"]

    # PostgreSQL Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "uhv_user"
    POSTGRES_PASSWORD: str = "uhv_secure_password_2026"
    POSTGRES_DB: str = "uhv_portal_db"
    SQLALCHEMY_DATABASE_URI: str | None = None
    DATABASE_URL: str | None = None

    @property
    def database_url(self) -> str:
        raw_url = self.DATABASE_URL or self.SQLALCHEMY_DATABASE_URI
        if raw_url:
            if raw_url.startswith("postgres://"):
                return raw_url.replace("postgres://", "postgresql+psycopg2://", 1)
            elif raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+"):
                return raw_url.replace("postgresql://", "postgresql+psycopg2://", 1)
            return raw_url
        if os.getenv("USE_SQLITE", "false").lower() == "true":
            return "sqlite:///./uhv_portal.db"
        return f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Redis Broker
    REDIS_URL: str = "redis://localhost:6379/0"

    # Temporary Upload Storage
    UPLOAD_DIR: str = "./data/uploads"
    TEMP_FILE_RETENTION_HOURS: int = 72
    MAX_CONCURRENT_PROCESSING_JOBS: int = 6

    # Assignment Rules & Defaults
    ASSIGNMENT_TITLE: str = "Universal Human Values (UHV) Assignment — PPT Presentation"
    SUBMISSION_DEADLINE: str = "2026-10-26T23:59:59"
    ALLOWED_SECTIONS: List[str] = ["CSE1", "CSE2", "CSE3", "CSE-AI"]
    ALLOWED_BRANCHES: List[str] = [
        "Computer Science and Engineering",
        "Information Technology",
        "Artificial Intelligence & Data Science"
    ]
    ALLOWED_YEARS: List[str] = ["2nd Year", "3rd Year", "4th Year"]
    MAX_PPT_SIZE_MB: int = 50
    MAX_PDF_SIZE_MB: int = 25
    MAX_VIDEO_SIZE_MB: int = 500
    PDF_OPTIONAL_ALLOWED: bool = True
    PDF_REQUIRED: bool = False
    VIDEO_ALLOWED_EXTENSIONS: List[str] = ["mp4", "mov", "webm"]
    SUBMISSIONS_OPEN: bool = True

    # Google Drive API
    GDRIVE_ENABLED: bool = True
    GDRIVE_CLIENT_ID: str = ""
    GDRIVE_CLIENT_SECRET: str = ""
    GDRIVE_REFRESH_TOKEN: str = ""
    GDRIVE_ROOT_FOLDER_NAME: str = "UHV_Assignment_Submissions_2026"
    GDRIVE_UPLOAD_TIMEOUT_SECONDS: int = 600
    GDRIVE_MAX_CONCURRENT_UPLOADS: int = 4

    # Email
    SMTP_ENABLED: bool = True
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_TLS: bool = True
    EMAIL_FROM: str = "maheshwarsinha01@gmail.com"
    TEACHER_EMAIL: str = "maheshwarsinha7@gmail.com"
    RESEND_API_KEY: Optional[str] = None
    BREVO_API_KEY: Optional[str] = None

    # Initial Superuser / Admin Credentials
    FIRST_SUPERUSER_EMAIL: str = "admin@uhv-portal.edu.in"
    FIRST_SUPERUSER_PASSWORD: str = "AdminUHV@Pass2026!"
    ADMIN_USERNAME: str = ""
    ADMIN_PASSWORD: str = ""

settings = Settings()
