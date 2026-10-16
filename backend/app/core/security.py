import os
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Union
import jwt  # PyJWT is installed
from app.core.config import settings

ALGORITHM = "HS256"

def get_password_hash(password: str) -> str:
    """
    Computes salted SHA-256 hash with secret key for deterministic and portable password hashing.
    """
    salt = settings.SECRET_KEY[:16].encode("utf-8")
    pwd_bytes = password.encode("utf-8")
    return hmac.new(salt, pwd_bytes, hashlib.sha256).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    expected_hash = get_password_hash(plain_password)
    return hmac.compare_digest(expected_hash, hashed_password)

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None
