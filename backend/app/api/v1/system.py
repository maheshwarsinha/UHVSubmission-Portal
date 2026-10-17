import os
import json
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone
import pytz
import psutil
from app.api.deps import get_db
from app.core.config import settings
from app.models import SystemSetting
from app.schemas.system import AssignmentPublicConfig
from app.services.upload_service import UploadService

router = APIRouter()

def get_current_system_setting(db: Session, key: str, default_val):
    record = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    return record.value if record else default_val

@router.get("/assignment-info", response_model=AssignmentPublicConfig)
def get_assignment_info(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Returns the public assignment guidelines, rules, sections, and deadline for students.
    Automatically checks and dispatches queued emails when free slots exist.
    """
    from app.tasks.email_tasks import dispatch_queued_notifications
    background_tasks.add_task(dispatch_queued_notifications)
    deadline_str = get_current_system_setting(db, "submission_deadline", settings.SUBMISSION_DEADLINE)
    is_open = get_current_system_setting(db, "submissions_open", settings.SUBMISSIONS_OPEN)
    allowed_sec = get_current_system_setting(db, "allowed_sections", settings.ALLOWED_SECTIONS)
    max_ppt = get_current_system_setting(db, "max_ppt_size_mb", settings.MAX_PPT_SIZE_MB)
    max_pdf = get_current_system_setting(db, "max_pdf_size_mb", settings.MAX_PDF_SIZE_MB)
    max_video = get_current_system_setting(db, "max_video_size_mb", settings.MAX_VIDEO_SIZE_MB)
    pdf_allowed = get_current_system_setting(db, "pdf_optional_allowed", settings.PDF_OPTIONAL_ALLOWED)
    pdf_req = get_current_system_setting(db, "pdf_required", settings.PDF_REQUIRED)

    # Format deadline in IST
    ist_tz = pytz.timezone(settings.TIMEZONE)
    try:
        dt = datetime.fromisoformat(deadline_str)
        if dt.tzinfo is None:
            dt = ist_tz.localize(dt)
        deadline_formatted = dt.strftime("%d %B %Y at %I:%M %p %Z")
    except Exception:
        deadline_formatted = f"{deadline_str} ({settings.TIMEZONE})"

    now_ist = datetime.now(timezone.utc).astimezone(ist_tz).strftime("%d %B %Y, %I:%M:%S %p %Z")

    return AssignmentPublicConfig(
        assignment_title=settings.ASSIGNMENT_TITLE,
        deadline_iso=deadline_str,
        deadline_formatted_ist=deadline_formatted,
        is_open=is_open,
        allowed_sections=allowed_sec,
        allowed_branches=settings.ALLOWED_BRANCHES,
        allowed_years=settings.ALLOWED_YEARS,
        max_ppt_size_mb=max_ppt,
        max_pdf_size_mb=max_pdf,
        max_video_size_mb=max_video,
        pdf_optional_allowed=pdf_allowed,
        pdf_required=pdf_req,
        video_allowed_extensions=settings.VIDEO_ALLOWED_EXTENSIONS,
        current_time_ist=now_ist
    )

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """
    Liveness probe.
    """
    return {"status": "ok", "service": settings.PROJECT_NAME, "environment": settings.ENVIRONMENT}

@router.get("/ready")
def readiness_check(db: Session = Depends(get_db)):
    """
    Readiness probe validating Database and Disk storage.
    """
    checks = {"database": "ok", "disk": "ok"}
    status_code = 200

    # 1. DB check
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        checks["database"] = f"error: {str(e)}"
        status_code = 503

    # 2. Disk check
    upload_dir = UploadService.get_upload_dir()
    usage = psutil.disk_usage(upload_dir)
    disk_free_gb = usage.free / (1024 ** 3)
    if disk_free_gb < 1.0:
        checks["disk"] = f"critical: only {disk_free_gb:.2f} GB free"
        status_code = 503
    else:
        checks["disk_free_gb"] = round(disk_free_gb, 2)

    return {"status": "ready" if status_code == 200 else "degraded", "checks": checks}

class NetworkInfoUpdate(BaseModel):
    wifi_ip: str

@router.get("/network-info")
def get_network_info(request: Request, db: Session = Depends(get_db)):
    """
    Returns the network address / Wi-Fi IP address that students should enter to access the portal.
    """
    upload_dir = UploadService.get_upload_dir()
    info_file = os.path.join(upload_dir, "network_info.json")

    # 1. Primary: Real-time physical adapter synced by auto_sync_wifi daemon
    wifi_ip = None
    if os.path.exists(info_file):
        try:
            with open(info_file, "r") as f:
                data = json.load(f)
                val = data.get("wifi_ip")
                if val and val != "localhost" and val != "127.0.0.1":
                    wifi_ip = val.strip()
        except Exception:
            pass

    # 2. Secondary: Database setting fallback if daemon file not present
    if not wifi_ip:
        db_ip_setting = db.query(SystemSetting).filter(SystemSetting.key == "lan_network_ip").first()
        if db_ip_setting and db_ip_setting.value:
            wifi_ip = str(db_ip_setting.value).strip()

    # 3. Tertiary: Fallback to Host header if access came through a non-localhost IP
    host_header = request.headers.get("host", "").split(":")[0]
    if not wifi_ip and host_header and host_header not in ("localhost", "127.0.0.1", "backend"):
        if not ("onrender.com" in host_header or "render.com" in host_header):
            wifi_ip = host_header

    # In cloud deployments (e.g. Render backend with Vercel frontend), point to public portal URL
    if not wifi_ip or "onrender.com" in wifi_ip or "render.com" in wifi_ip:
        public_url = getattr(settings, "FRONTEND_URL", "https://uhv-submission-portal.vercel.app")
        return {
            "wifi_ip": "uhv-submission-portal.vercel.app",
            "portal_url": public_url,
            "port": 443
        }

    return {
        "wifi_ip": wifi_ip,
        "portal_url": f"http://{wifi_ip}",
        "port": 80
    }

@router.post("/network-info")
def update_network_info(payload: NetworkInfoUpdate, db: Session = Depends(get_db)):
    """
    Allows the administrator to manually update or override the LAN Wi-Fi IP.
    """
    clean_ip = payload.wifi_ip.strip()
    record = db.query(SystemSetting).filter(SystemSetting.key == "lan_network_ip").first()
    if not record:
        record = SystemSetting(key="lan_network_ip", value=clean_ip, description="Custom Wi-Fi IP Address")
        db.add(record)
    else:
        record.value = clean_ip
    db.commit()

    upload_dir = UploadService.get_upload_dir()
    info_file = os.path.join(upload_dir, "network_info.json")
    try:
        with open(info_file, "w") as f:
            json.dump({"wifi_ip": clean_ip, "portal_url": f"http://{clean_ip}", "port": 80}, f)
    except Exception:
        pass

    return {"wifi_ip": clean_ip, "portal_url": f"http://{clean_ip}", "port": 80}

