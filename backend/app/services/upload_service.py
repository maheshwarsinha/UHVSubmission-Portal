import os
import shutil
import uuid
import psutil
from typing import Tuple, Dict, Any, Optional
from app.core.config import settings
from app.services.file_validator import FileValidator

class UploadService:
    @staticmethod
    def get_upload_dir() -> str:
        upload_dir = os.path.abspath(settings.UPLOAD_DIR)
        os.makedirs(upload_dir, exist_ok=True)
        os.makedirs(os.path.join(upload_dir, "chunks"), exist_ok=True)
        os.makedirs(os.path.join(upload_dir, "completed"), exist_ok=True)
        return upload_dir

    @classmethod
    def check_disk_space(cls, required_bytes: int = 50 * 1024 * 1024) -> Tuple[bool, str]:
        """
        Ensures the server has at least 5GB free disk space and enough for this file.
        """
        upload_dir = cls.get_upload_dir()
        usage = psutil.disk_usage(upload_dir)
        free_bytes = usage.free
        # Minimum safety cushion: 2 GB
        if free_bytes < (2 * 1024 * 1024 * 1024) or free_bytes < required_bytes:
            return False, f"Server storage limit reached. Available: {free_bytes // (1024*1024)} MB. Please notify the administrator."
        return True, ""

    @classmethod
    def save_chunk(
        cls,
        upload_id: str,
        chunk_index: int,
        total_chunks: int,
        chunk_data: bytes
    ) -> Dict[str, Any]:
        upload_dir = cls.get_upload_dir()
        chunk_folder = os.path.join(upload_dir, "chunks", upload_id)
        os.makedirs(chunk_folder, exist_ok=True)

        chunk_path = os.path.join(chunk_folder, f"chunk_{chunk_index:05d}")
        with open(chunk_path, "wb") as f:
            f.write(chunk_data)

        # Count existing chunks
        received_chunks = len([f for f in os.listdir(chunk_folder) if f.startswith("chunk_")])
        is_complete = (received_chunks >= total_chunks)

        return {
            "upload_id": upload_id,
            "chunk_index": chunk_index,
            "total_chunks": total_chunks,
            "received_chunks": received_chunks,
            "is_complete": is_complete
        }

    @classmethod
    def assemble_chunks(
        cls,
        upload_id: str,
        total_chunks: int,
        target_filename: str
    ) -> Tuple[bool, str, int, str]:
        """
        Stitches all chunks into the final destination file using streaming.
        Returns: (success, file_path, total_size, sha256_hash)
        """
        upload_dir = cls.get_upload_dir()
        chunk_folder = os.path.join(upload_dir, "chunks", upload_id)
        if not os.path.exists(chunk_folder):
            return False, "", 0, "Chunk directory not found."

        # Unique destination path in completed folder
        dest_filename = f"{uuid.uuid4().hex}_{target_filename}"
        completed_path = os.path.join(upload_dir, "completed", dest_filename)
        temp_assembling_path = completed_path + ".assembling"

        try:
            with open(temp_assembling_path, "wb") as outfile:
                for i in range(total_chunks):
                    chunk_file = os.path.join(chunk_folder, f"chunk_{i:05d}")
                    if not os.path.exists(chunk_file):
                        if os.path.exists(temp_assembling_path):
                            os.remove(temp_assembling_path)
                        return False, "", 0, f"Missing chunk index {i} during assembly."
                    with open(chunk_file, "rb") as infile:
                        shutil.copyfileobj(infile, outfile, length=1024 * 1024)

            # Atomic rename
            os.replace(temp_assembling_path, completed_path)

            total_size = os.path.getsize(completed_path)
            checksum = FileValidator.calculate_sha256(completed_path)

            # Clean up chunks
            shutil.rmtree(chunk_folder, ignore_errors=True)

            return True, completed_path, total_size, checksum
        except Exception as e:
            if os.path.exists(temp_assembling_path):
                os.remove(temp_assembling_path)
            return False, "", 0, f"Error assembling chunks: {str(e)}"
