def test_system_assignment_info(client):
    res = client.get("/api/v1/system/assignment-info")
    assert res.status_code == 200
    data = res.json()
    assert "Universal Human Values" in data["assignment_title"]
    assert "CSE1" in data["allowed_sections"]
    assert "2026-10-26" in data["deadline_iso"]

def test_system_health_and_readiness(client):
    res = client.get("/api/v1/system/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    res_ready = client.get("/api/v1/system/ready")
    assert res_ready.status_code == 200
    assert res_ready.json()["status"] == "ready"

def test_expected_filenames_endpoint(client):
    res = client.post("/api/v1/uploads/expected-filenames", json={
        "roll_number": "25001390001",
        "section": "CSE1",
        "name": "XYZ"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["base_name"] == "25001390001_CSE1_XYZ"
    assert data["ppt_filename"] == "25001390001_CSE1_XYZ.pptx"
    assert data["video_filename"] == "25001390001_CSE1_XYZ.mp4"

def test_validate_filename_endpoint(client):
    # Valid
    res = client.post("/api/v1/uploads/validate-filename", json={
        "roll_number": "25001390001",
        "section": "CSE1",
        "name": "XYZ",
        "uploaded_filename": "25001390001_CSE1_XYZ.pptx",
        "file_type": "ppt"
    })
    assert res.status_code == 200
    assert res.json()["is_valid"] is True

    # Invalid mismatch
    res_bad = client.post("/api/v1/uploads/validate-filename", json={
        "roll_number": "25001390001",
        "section": "CSE1",
        "name": "XYZ",
        "uploaded_filename": "Random_Presentation.pptx",
        "file_type": "ppt"
    })
    assert res_bad.status_code == 200
    assert res_bad.json()["is_valid"] is False
    assert "Filename mismatch" in res_bad.json()["error_message"]

def test_verify_drive_link_endpoint(client):
    # Test valid Drive format
    res = client.post("/api/v1/uploads/verify-drive-link", json={
        "url": "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view?usp=sharing",
        "file_type": "video"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["file_id"] == "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
    assert data["is_valid"] is True

    # Test invalid format
    res_inv = client.post("/api/v1/uploads/verify-drive-link", json={
        "url": "https://example.com/not-drive-link",
        "file_type": "video"
    })
    assert res_inv.status_code == 200
    assert res_inv.json()["is_valid"] is False
    assert res_inv.json()["status"] == "INVALID"

def test_verify_drive_folder_endpoint(client):
    # Test folder format
    res = client.post("/api/v1/uploads/verify-drive-folder", json={
        "folder_url": "https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
        "roll_number": "CSJMA24001390105",
        "section": "CSE1",
        "name": "Rahul Sharma",
        "category": "Regular"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["folder_id"] == "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
    assert "checklist" in data

    # Test invalid folder URL
    res_bad = client.post("/api/v1/uploads/verify-drive-folder", json={
        "folder_url": "https://invalid-link.com",
        "roll_number": "CSJMA24001390105",
        "section": "CSE1",
        "name": "Rahul Sharma"
    })
    assert res_bad.status_code == 200
    assert res_bad.json()["is_valid"] is False
    assert res_bad.json()["status"] == "INVALID"

def test_submit_assignment_with_drive_links(client):
    import uuid
    from unittest.mock import patch
    uid = uuid.uuid4().hex[:6]
    roll = f"25001{uid}"
    payload = {
        "student": {
            "roll_number": roll,
            "name": "Drive Student",
            "branch": "Computer Science and Engineering",
            "section": "CSE1",
            "academic_year": "3rd Year",
            "student_category": "Regular",
            "email": f"drive_{uid}@test.ac.in"
        },
        "topic": "Human Values and Ethics in AI",
        "declaration_confirmed": True,
        "source_folder_url": "https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
        "source_folder_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
        "folder_name": roll,
        "folder_verification_status": "ACCESSIBLE",
        "files": [
            {
                "file_type": "ppt",
                "expected_filename": f"{roll}_CSE1_Drive_Student.pptx",
                "source_drive_url": "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
                "link_accessibility_status": "ACCESSIBLE"
            },
            {
                "file_type": "video",
                "expected_filename": f"{roll}_CSE1_Drive_Student.mp4",
                "source_drive_url": "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
                "link_accessibility_status": "ACCESSIBLE"
            }
        ]
    }
    with patch("app.api.v1.submissions.execute_email_dispatch", return_value={"status": "mocked"}), \
         patch("app.api.v1.submissions.execute_drive_transfer", return_value={"status": "mocked"}):
        res = client.post("/api/v1/submissions", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "UHV-2026-" in data["tracking_id"]
        assert len(data["files"]) == 2
        assert data["files"][0]["source_drive_url"] is not None
        assert data["source_folder_url"] == "https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
        assert data["folder_name"] == roll

