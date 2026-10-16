import os
import uuid
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from pydantic import BaseModel
from app.services.filename_service import FilenameService
from app.services.file_validator import FileValidator
from app.services.upload_service import UploadService
from app.schemas.file import ExpectedFilenamesResponse, FileValidationResult, ChunkUploadResponse

from app.services.gdrive_link_service import gdrive_link_service

router = APIRouter()

class DriveLinkVerifyRequest(BaseModel):
    url: str
    file_type: str  # ppt, pdf, video

class DriveFolderVerifyRequest(BaseModel):
    folder_url: str
    roll_number: Optional[str] = ""
    section: Optional[str] = ""
    name: Optional[str] = ""
    category: Optional[str] = "Regular"

class FilenamePreviewRequest(BaseModel):
    roll_number: str
    section: str
    name: str
    category: Optional[str] = "Regular"

class FilenameValidationRequest(BaseModel):
    roll_number: str
    section: str
    name: str
    uploaded_filename: str
    file_type: str  # ppt, pdf, video
    category: Optional[str] = "Regular"

class AssembleRequest(BaseModel):
    upload_id: str
    total_chunks: int
    target_filename: str
    file_type: str  # ppt, pdf, video
    roll_number: str
    section: str
    name: str
    category: Optional[str] = "Regular"

@router.post("/verify-drive-folder")
def verify_drive_folder(req: DriveFolderVerifyRequest):
    """
    Validates a student's shared Google Drive folder:
    1. Checks public accessibility ('Anyone with the link can view').
    2. Checks if folder name matches the student's Roll Number.
    3. Detects PowerPoint, Video, and optional PDF inside the folder.
    4. Validates each file against the required naming convention.
    """
    return gdrive_link_service.inspect_drive_folder(
        folder_url=req.folder_url,
        roll_number=req.roll_number,
        section=req.section,
        name=req.name,
        category=req.category or "Regular"
    )

@router.post("/verify-drive-link")
def verify_drive_link(req: DriveLinkVerifyRequest):
    """
    Checks whether a student's Google Drive link is valid and publicly viewable
    ('Anyone with the link can view').
    """
    result = gdrive_link_service.check_link_accessibility(req.url)
    return {
        "url": req.url,
        "file_type": req.file_type,
        "is_valid": result.get("valid", False),
        "file_id": result.get("file_id"),
        "status": result.get("status", "INVALID"),
        "clean_url": result.get("clean_url"),
        "message": result.get("message", "")
    }

@router.post("/expected-filenames", response_model=ExpectedFilenamesResponse)
def get_expected_filenames(req: FilenamePreviewRequest):
    """
    Generates and previews the required filenames for the student:
    Format: UniversityRollNumber_Section_Name.[ext] (or Backlog)
    """
    expected = FilenameService.get_expected_filenames(req.roll_number, req.section, req.name, req.category)
    return ExpectedFilenamesResponse(
        base_name=expected["base_name"],
        ppt_filename=expected["ppt_filename"],
        pdf_filename=expected["pdf_filename"],
        video_filename=expected["video_filename"],
        naming_rules="Filenames must strictly match UniversityRollNumber_Section_Name (or Backlog) with proper extension (.pptx/.ppt, .pdf, .mp4/.mov/.webm)"
    )

@router.post("/validate-filename")
def validate_filename(req: FilenameValidationRequest):
    """
    Pre-validates whether the student's local file matches the expected naming convention.
    """
    is_valid, expected_name, err_msg = FilenameService.validate_uploaded_filename(
        uploaded_filename=req.uploaded_filename,
        file_type=req.file_type,
        roll_number=req.roll_number,
        section=req.section,
        name=req.name,
        category=req.category
    )
    return {
        "is_valid": is_valid,
        "expected_filename": expected_name,
        "uploaded_filename": req.uploaded_filename,
        "error_message": err_msg if not is_valid else None
    }

@router.post("/upload-chunk", response_model=ChunkUploadResponse)
async def upload_chunk(
    upload_id: str = Form(...),
    chunk_index: int = Form(...),
    total_chunks: int = Form(...),
    chunk: UploadFile = File(...)
):
    """
    High-concurrency chunk receiver. Streams chunk directly to temporary disk storage.
    Does not load the complete video into application memory.
    """
    # 1. Enforce disk space availability
    has_space, space_err = UploadService.check_disk_space()
    if not has_space:
        raise HTTPException(
            status_code=status.HTTP_507_INSUFFICIENT_STORAGE,
            detail=space_err
        )

    # 2. Read chunk data (chunk sizes typically 5MB - 10MB)
    content = await chunk.read()
    bytes_len = len(content)

    # 3. Save chunk to disk
    result = UploadService.save_chunk(
        upload_id=upload_id,
        chunk_index=chunk_index,
        total_chunks=total_chunks,
        chunk_data=content
    )

    return ChunkUploadResponse(
        upload_id=upload_id,
        chunk_index=chunk_index,
        total_chunks=total_chunks,
        bytes_received=bytes_len,
        is_complete=result["is_complete"]
    )

@router.post("/assemble-file")
def assemble_file(req: AssembleRequest):
    """
    Assembles received chunks into a verified local file.
    Validates magic byte signatures and computes SHA-256 checksum.
    """
    # Validate filename convention first
    is_name_valid, expected_filename, name_err = FilenameService.validate_uploaded_filename(
        uploaded_filename=req.target_filename,
        file_type=req.file_type,
        roll_number=req.roll_number,
        section=req.section,
        name=req.name,
        category=req.category
    )
    if not is_name_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=name_err
        )

    success, file_path, total_size, checksum_or_err = UploadService.assemble_chunks(
        upload_id=req.upload_id,
        total_chunks=req.total_chunks,
        target_filename=expected_filename
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=checksum_or_err
        )

    # Validate true file signatures (magic bytes)
    is_valid_type, mime_detected = FileValidator.check_magic_bytes(file_path, req.file_type)
    if not is_valid_type:
        # Delete corrupted/spoofed file
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Security check failed: {mime_detected}"
        )

    return {
        "success": True,
        "file_token": os.path.basename(file_path),
        "expected_filename": expected_filename,
        "file_size": total_size,
        "file_size_mb": round(total_size / (1024 * 1024), 2),
        "mime_type": mime_detected,
        "sha256": checksum_or_err
    }
