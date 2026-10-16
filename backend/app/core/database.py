import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

logger = logging.getLogger("uhv_database")

db_url = settings.database_url

def build_engine(url: str):
    connect_args = {}
    engine_kwargs = {"echo": False}

    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    else:
        # High-concurrency connection pool parameters for PostgreSQL
        engine_kwargs.update({
            "pool_size": 25,
            "max_overflow": 25,
            "pool_timeout": 5, # Quick timeout for fallback detection
            "pool_recycle": 1800,
            "pool_pre_ping": True,
        })

    return create_engine(url, connect_args=connect_args, **engine_kwargs)

# Attempt to connect to configured DB; if PostgreSQL is down or unconfigured locally, fallback to SQLite
engine = None
try:
    if db_url.startswith("sqlite"):
        engine = build_engine(db_url)
    else:
        test_engine = build_engine(db_url)
        with test_engine.connect() as conn:
            pass
        engine = test_engine
        logger.info(f"Connected to PostgreSQL database: {settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}")
except Exception as e:
    logger.warning(
        f"PostgreSQL connection failed ({e}). "
        f"Falling back to local SQLite database (./uhv_portal.db) for seamless local development."
    )
    fallback_url = "sqlite:///./uhv_portal.db"
    engine = build_engine(fallback_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
