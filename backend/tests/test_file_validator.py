import os
import tempfile
from app.services.file_validator import FileValidator

def test_pdf_magic_bytes():
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        f.write(b"%PDF-1.4\n%test content\n")
        temp_path = f.name

    try:
        is_valid, mime = FileValidator.check_magic_bytes(temp_path, "pdf")
        assert is_valid is True
        assert mime == "application/pdf"
    finally:
        os.remove(temp_path)

def test_invalid_disguised_file():
    with tempfile.NamedTemporaryFile(suffix=".pptx", delete=False) as f:
        f.write(b"#!/bin/bash\necho evil\n")
        temp_path = f.name

    try:
        is_valid, msg = FileValidator.check_magic_bytes(temp_path, "ppt")
        assert is_valid is False
        assert "does not match a valid PowerPoint" in msg
    finally:
        os.remove(temp_path)

def test_sha256_calculation():
    with tempfile.NamedTemporaryFile(delete=False) as f:
        f.write(b"universal_human_values_test_data")
        temp_path = f.name

    try:
        checksum = FileValidator.calculate_sha256(temp_path)
        assert len(checksum) == 64
    finally:
        os.remove(temp_path)
