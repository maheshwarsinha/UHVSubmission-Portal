import os
import zipfile
import io

def generate_synthetic_pptx(file_path: str, target_size_bytes: int = 1024 * 1024):
    """
    Creates a valid PPTX zip file with correct magic bytes (PK\x03\x04).
    Pads to target size.
    """
    os.makedirs(os.path.dirname(os.path.abspath(file_path)), exist_ok=True)
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>')
        zf.writestr("ppt/presentation.xml", '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"></p:presentation>')
        # Add padding data inside zip to reach target size
        current_len = buffer.tell()
        padding_needed = max(0, target_size_bytes - current_len - 500)
        if padding_needed > 0:
            zf.writestr("ppt/media/dummy_pad.bin", b"0" * padding_needed)

    with open(file_path, "wb") as f:
        f.write(buffer.getvalue())
    print(f"Generated synthetic PPTX: {file_path} ({os.path.getsize(file_path) / (1024*1024):.2f} MB)")

def generate_synthetic_pdf(file_path: str, target_size_bytes: int = 512 * 1024):
    """
    Creates a valid PDF file with %PDF- header.
    """
    os.makedirs(os.path.dirname(os.path.abspath(file_path)), exist_ok=True)
    header = b"%PDF-1.4\n%synthetic test document for UHV portal\n"
    trailer = b"\nxref\n0 1\n0000000000 65535 f \ntrailer\n<< /Size 1 >>\nstartxref\n50\n%%EOF\n"
    padding_needed = max(0, target_size_bytes - len(header) - len(trailer))

    with open(file_path, "wb") as f:
        f.write(header)
        f.write(b" " * padding_needed)
        f.write(trailer)
    print(f"Generated synthetic PDF: {file_path} ({os.path.getsize(file_path) / (1024*1024):.2f} MB)")

def generate_synthetic_mp4(file_path: str, target_size_bytes: int = 5 * 1024 * 1024):
    """
    Creates a valid MP4 file container with ftyp box signature.
    """
    os.makedirs(os.path.dirname(os.path.abspath(file_path)), exist_ok=True)
    # 4-byte box size (32 bytes), 4-byte 'ftyp', major brand 'isom', minor version 512, compatible brands
    ftyp_box = b"\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isomiso2avc1mp41"
    moov_box = b"\x00\x00\x00\x18moov\x00\x00\x00\x10mvhd\x00\x00\x00\x00"

    with open(file_path, "wb") as f:
        f.write(ftyp_box)
        # Pad with mdat box
        mdat_size = max(0, target_size_bytes - len(ftyp_box) - len(moov_box))
        f.write(int(mdat_size).to_bytes(4, byteorder="big") + b"mdat")
        chunk = b"\x00" * 1024 * 1024
        remaining = mdat_size - 8
        while remaining > 0:
            write_size = min(remaining, len(chunk))
            f.write(chunk[:write_size])
            remaining -= write_size
        f.write(moov_box)
    print(f"Generated synthetic MP4: {file_path} ({os.path.getsize(file_path) / (1024*1024):.2f} MB)")

if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "sample_files")
    os.makedirs(out_dir, exist_ok=True)
    generate_synthetic_pptx(os.path.join(out_dir, "test_presentation.pptx"), 2 * 1024 * 1024)
    generate_synthetic_pdf(os.path.join(out_dir, "test_companion.pdf"), 512 * 1024)
    generate_synthetic_mp4(os.path.join(out_dir, "test_video.mp4"), 10 * 1024 * 1024)
