from app.services.filename_service import FilenameService

def test_generate_expected_base():
    base = FilenameService.generate_expected_base("25001390001", "CSE1", "XYZ Sharma")
    assert base == "25001390001_CSE1_XYZ_Sharma"

def test_normalize_spaces_and_special_chars():
    base = FilenameService.generate_expected_base("25-001/39", "cse-ai", "John  Doe @#$")
    assert base == "25_00139_CSE_AI_John_Doe"

def test_get_expected_filenames():
    expected = FilenameService.get_expected_filenames("25001390001", "CSE1", "XYZ")
    assert expected["base_name"] == "25001390001_CSE1_XYZ"
    assert expected["ppt_filename"] == "25001390001_CSE1_XYZ.pptx"
    assert expected["pdf_filename"] == "25001390001_CSE1_XYZ.pdf"
    assert expected["video_filename"] == "25001390001_CSE1_XYZ.mp4"

def test_validate_uploaded_filename_valid_cases():
    # Valid PPTX
    valid, exp, err = FilenameService.validate_uploaded_filename(
        "25001390001_CSE1_XYZ.pptx", "ppt", "25001390001", "CSE1", "XYZ"
    )
    assert valid is True
    assert err == ""

    # Valid MP4
    valid, exp, err = FilenameService.validate_uploaded_filename(
        "25001390001_CSE1_XYZ.mp4", "video", "25001390001", "CSE1", "XYZ"
    )
    assert valid is True
    assert err == ""

def test_validate_uploaded_filename_mismatched():
    # Wrong name in filename
    valid, exp, err = FilenameService.validate_uploaded_filename(
        "MyPresentation.pptx", "ppt", "25001390001", "CSE1", "XYZ"
    )
    assert valid is False
    assert "Filename mismatch" in err
    assert "25001390001_CSE1_XYZ.pptx" in err

def test_validate_uploaded_filename_wrong_extension():
    # .txt instead of .mp4
    valid, exp, err = FilenameService.validate_uploaded_filename(
        "25001390001_CSE1_XYZ.txt", "video", "25001390001", "CSE1", "XYZ"
    )
    assert valid is False
    assert "Invalid video format" in err
