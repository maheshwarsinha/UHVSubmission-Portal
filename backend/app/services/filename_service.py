import re
from typing import Dict, Tuple

class FilenameService:
    @staticmethod
    def normalize_string(val: str) -> str:
        """
        Normalize a string component:
        - Replaces spaces with underscores
        - Removes characters that are not alphanumeric or underscore
        - Removes repeated underscores
        - Trims leading/trailing underscores
        """
        if not val:
            return ""
        # Strip and replace spaces or hyphens with underscores
        cleaned = re.sub(r"[\s\-]+", "_", val.strip())
        # Strip all unsafe filesystem chars
        cleaned = re.sub(r"[^\w]", "", cleaned)
        # Collapse multiple underscores
        cleaned = re.sub(r"_+", "_", cleaned)
        return cleaned.strip("_")

    @classmethod
    def generate_expected_base(cls, roll_number: str, section: str, name: str, category: str = "Regular") -> str:
        """
        Format: UniversityRollNumber_Section_Name (or UniversityRollNumber_Backlog_Name if category is Backlog)
        Example: 25001390001_CSE1_XYZ or 25001390001_Backlog_XYZ
        """
        norm_roll = cls.normalize_string(roll_number).upper()
        if category and category.strip().lower() == "backlog":
            norm_sec = "Backlog"
        else:
            norm_sec = cls.normalize_string(section).upper()
        norm_name = cls.normalize_string(name)
        return f"{norm_roll}_{norm_sec}_{norm_name}"

    @classmethod
    def get_expected_filenames(cls, roll_number: str, section: str, name: str, category: str = "Regular") -> Dict[str, str]:
        base = cls.generate_expected_base(roll_number, section, name, category)
        return {
            "base_name": base,
            "ppt_filename": f"{base}.pptx",
            "ppt_alt_filename": f"{base}.ppt",
            "pdf_filename": f"{base}.pdf",
            "video_filename": f"{base}.mp4",
            "video_mov_filename": f"{base}.mov",
            "video_webm_filename": f"{base}.webm",
        }

    @classmethod
    def validate_uploaded_filename(
        cls,
        uploaded_filename: str,
        file_type: str,
        roll_number: str,
        section: str,
        name: str,
        category: str = "Regular"
    ) -> Tuple[bool, str, str]:
        """
        Validates if the uploaded filename strictly matches the expected normalized convention.
        Returns: (is_valid, expected_filename, error_message)
        """
        expected_dict = cls.get_expected_filenames(roll_number, section, name, category)
        base = expected_dict["base_name"]

        # Extract file extension from uploaded file
        parts = uploaded_filename.rsplit(".", 1)
        if len(parts) < 2:
            return (
                False,
                f"{base}.[ext]",
                f"File '{uploaded_filename}' has no extension. Please rename your file with a valid extension (e.g. .pptx or .mp4)."
            )

        uploaded_base, uploaded_ext = parts[0], parts[1].lower()
        normalized_uploaded_base = cls.normalize_string(uploaded_base)

        if file_type == "ppt":
            valid_exts = ["pptx", "ppt"]
            expected = expected_dict["ppt_filename"]
            if uploaded_ext not in valid_exts:
                return (
                    False,
                    expected,
                    f"Invalid format '{uploaded_ext}' for presentation. Allowed formats: .pptx, .ppt."
                )
            if normalized_uploaded_base.lower() != base.lower():
                return (
                    False,
                    f"{base}.{uploaded_ext}",
                    f"Filename mismatch! Your file is named '{uploaded_filename}'. Please rename it exactly to '{base}.{uploaded_ext}' before uploading."
                )
            return (True, f"{base}.{uploaded_ext}", "")

        elif file_type == "pdf":
            expected = expected_dict["pdf_filename"]
            if uploaded_ext != "pdf":
                return (
                    False,
                    expected,
                    f"Invalid format '{uploaded_ext}' for PDF companion. Allowed format: .pdf."
                )
            if normalized_uploaded_base.lower() != base.lower():
                return (
                    False,
                    expected,
                    f"Filename mismatch! Your file is named '{uploaded_filename}'. Please rename it exactly to '{expected}' before uploading."
                )
            return (True, expected, "")

        elif file_type == "video":
            valid_exts = ["mp4", "mov", "webm"]
            expected = expected_dict["video_filename"]
            if uploaded_ext not in valid_exts:
                return (
                    False,
                    expected,
                    f"Invalid video format '{uploaded_ext}'. Allowed formats: .mp4, .mov, .webm."
                )
            if normalized_uploaded_base.lower() != base.lower():
                return (
                    False,
                    f"{base}.{uploaded_ext}",
                    f"Filename mismatch! Your file is named '{uploaded_filename}'. Please rename it exactly to '{base}.{uploaded_ext}' before uploading."
                )
            return (True, f"{base}.{uploaded_ext}", "")

        return (False, "", f"Unknown file type: {file_type}")
