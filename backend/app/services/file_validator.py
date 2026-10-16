import hashlib
import os
from typing import Tuple, Optional

class FileValidator:
    # Magic bytes signatures
    SIGNATURES = {
        "pdf": [b"%PDF-"],
        "zip_office": [b"PK\x03\x04"],  # PPTX / DOCX / XLSX
        "ole_ppt": [b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1"],  # Legacy PPT
        "webm": [b"\x1A\x45\xDF\xA3"],
    }

    @classmethod
    def check_magic_bytes(cls, file_path: str, file_type: str) -> Tuple[bool, str]:
        """
        Validates the real header of the file on disk to guarantee it's not a renamed executable or script.
        """
        if not os.path.exists(file_path):
            return False, "File does not exist on server."

        file_size = os.path.getsize(file_path)
        if file_size == 0:
            return False, "File is empty (0 bytes)."

        with open(file_path, "rb") as f:
            header_sample = f.read(512)

        if file_type == "ppt":
            # Can be either modern PPTX (ZIP container) or legacy binary PPT (OLE CFBF)
            is_zip = any(header_sample.startswith(sig) for sig in cls.SIGNATURES["zip_office"])
            is_ole = any(header_sample.startswith(sig) for sig in cls.SIGNATURES["ole_ppt"])
            if not (is_zip or is_ole):
                return False, "File content does not match a valid PowerPoint presentation (.ppt/.pptx)."
            detected = "application/vnd.openxmlformats-officedocument.presentationml.presentation" if is_zip else "application/vnd.ms-powerpoint"
            return True, detected

        elif file_type == "pdf":
            is_pdf = any(header_sample.startswith(sig) for sig in cls.SIGNATURES["pdf"])
            if not is_pdf:
                return False, "File content is not a valid PDF document."
            return True, "application/pdf"

        elif file_type == "video":
            # MP4/MOV typically has ftyp at byte offset 4: e.g. b'....ftyp'
            is_mp4_mov = b"ftyp" in header_sample[:32] or b"moov" in header_sample[:32]
            is_webm = any(header_sample.startswith(sig) for sig in cls.SIGNATURES["webm"])
            if not (is_mp4_mov or is_webm):
                return False, "File content does not match a supported video format (MP4/MOV/WebM)."
            detected = "video/webm" if is_webm else "video/mp4"
            return True, detected

        return False, "Unknown file category."

    @staticmethod
    def calculate_sha256(file_path: str) -> str:
        """
        Calculates SHA-256 hash using streaming blocks to prevent RAM exhaustion on 500MB videos.
        """
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(1024 * 1024):  # 1MB buffer
                sha256.update(chunk)
        return sha256.hexdigest()
