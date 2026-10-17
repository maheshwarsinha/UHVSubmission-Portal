from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin
from app.core.config import settings
from app.core.security import verify_password, create_access_token
from app.models import Administrator
from app.schemas.admin import Token, AdminResponse

router = APIRouter()

@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    input_identifier = form_data.username.strip().lower()

    # 1. Try finding admin by exact email
    admin = db.query(Administrator).filter(Administrator.email == input_identifier).first()

    # 2. If not found by email, allow login with "admin" or configured ADMIN_USERNAME
    configured_username = settings.ADMIN_USERNAME.strip().lower() if settings.ADMIN_USERNAME else ""
    if not admin and (input_identifier == "admin" or (configured_username and input_identifier == configured_username)):
        admin = db.query(Administrator).filter(Administrator.is_superuser == True).first()

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Check password against DB hash or env settings override
    is_valid_pwd = verify_password(form_data.password, admin.hashed_password)
    if not is_valid_pwd and settings.ADMIN_PASSWORD and form_data.password == settings.ADMIN_PASSWORD:
        is_valid_pwd = True

    if not is_valid_pwd:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        subject=admin.email,
        expires_delta=access_token_expires
    )

    return Token(
        access_token=token,
        token_type="bearer",
        admin_name=admin.full_name,
        admin_email=admin.email,
        is_superuser=admin.is_superuser
    )

@router.get("/me", response_model=AdminResponse)
def get_current_admin_profile(
    current_admin: Administrator = Depends(get_current_admin)
):
    return current_admin
