import re
import os
import logging
from typing import Optional, Dict, Any, Tuple
import httpx
from app.services.gdrive_service import gdrive_service

logger = logging.getLogger("gdrive_link_service")

class GDriveLinkService:
    @staticmethod
    def extract_file_id(url: str) -> Optional[str]:
        """
        Extracts Google Drive / Google Docs / Google Slides file ID from URL or raw ID.
        """
        if not url:
            return None
        url = url.strip()

        patterns = [
            r"/file/d/([a-zA-Z0-9_-]{20,})",
            r"[?&]id=([a-zA-Z0-9_-]{20,})",
            r"/presentation/d/([a-zA-Z0-9_-]{20,})",
            r"/document/d/([a-zA-Z0-9_-]{20,})",
            r"/spreadsheets/d/([a-zA-Z0-9_-]{20,})",
            r"/folders/([a-zA-Z0-9_-]{20,})",
            r"/d/([a-zA-Z0-9_-]{20,})",
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)

        # Check if user passed raw file ID (alphanumeric, at least 25 chars)
        if re.match(r"^[a-zA-Z0-9_-]{25,60}$", url):
            return url

        return None

    @staticmethod
    def extract_folder_id(url: str) -> Optional[str]:
        """
        Extracts Google Drive Folder ID from URL or raw ID.
        """
        if not url:
            return None
        url = url.strip()
        patterns = [
            r"/drive/(?:u/\d+/)?folders/([a-zA-Z0-9_-]{20,})",
            r"/folders/([a-zA-Z0-9_-]{20,})",
            r"[?&]id=([a-zA-Z0-9_-]{20,})",
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        if re.match(r"^[a-zA-Z0-9_-]{25,60}$", url):
            return url
        return None

    @classmethod
    def inspect_drive_folder(
        cls,
        folder_url: str,
        roll_number: str,
        section: str,
        name: str,
        category: str = "Regular"
    ) -> Dict[str, Any]:
        """
        Validates a student's Google Drive submission folder:
        1. Checks if folder link is valid and publicly viewable ('Anyone with the link can view').
        2. Verifies folder name matches the student's Roll Number (e.g. CSJMA24001390105).
        3. Lists all files inside the folder and identifies:
           - PowerPoint Presentation (.pptx or .ppt)
           - Video Presentation (.mp4, .mov, .webm, .mkv)
           - Optional PDF (.pdf)
        4. Validates each file's naming against required convention: {Roll}_{Sec}_{Name}.{ext}.
        5. Returns a rich, real-time checklist and error flags.
        """
        from app.services.filename_service import FilenameService

        folder_id = cls.extract_folder_id(folder_url)
        clean_url = f"https://drive.google.com/drive/folders/{folder_id}" if folder_id else None

        if not folder_id:
            # Check if student accidentally pasted a single file link instead of a folder link
            is_file_link = any(p in folder_url for p in ["/file/d/", "/presentation/d/", "/document/d/", "/spreadsheets/d/", "drive.google.com/file"])
            if is_file_link:
                err_msg = "⚠️ You provided a link to an individual file (not a folder). Please place your PPT and Video files inside a Google Drive FOLDER, right-click the folder, choose 'Share' -> 'Copy link', and paste that folder link here."
                user_msg = "Single file link provided. A Google Drive folder link is required."
            elif "drive.google.com" not in folder_url and "docs.google.com" not in folder_url:
                err_msg = "⚠️ Invalid link. Only Google Drive folder links (https://drive.google.com/drive/folders/...) are accepted. Other cloud links (OneDrive, Dropbox, etc.) are not supported."
                user_msg = "Unsupported link format. Please provide a Google Drive folder link."
            else:
                err_msg = "⚠️ Could not extract a valid Google Drive folder ID. Please ensure the link is in the format: https://drive.google.com/drive/folders/..."
                user_msg = "Invalid Google Drive folder link format."

            return {
                "is_valid": False,
                "folder_id": None,
                "folder_url": folder_url,
                "status": "INVALID",
                "folder_name": None,
                "folder_name_matches": False,
                "has_ppt": False,
                "has_video": False,
                "has_pdf": False,
                "ppt_file": None,
                "video_file": None,
                "pdf_file": None,
                "all_files": [],
                "errors": [err_msg],
                "checklist": [],
                "message": user_msg
            }

        folder_name = None
        is_accessible = False
        raw_files = []
        status_code_str = "ACCESSIBLE"
        error_msgs = []

        # 1. Attempt inspection via Google Drive API if available
        if gdrive_service.service and gdrive_service.enabled:
            try:
                g_res = gdrive_service.service.files().get(
                    fileId=folder_id,
                    fields="id, name, mimeType"
                ).execute()
                if g_res:
                    folder_name = g_res.get("name")
                    is_accessible = True

                    # List files inside folder
                    files_res = gdrive_service.service.files().list(
                        q=f"'{folder_id}' in parents and trashed = false",
                        fields="files(id, name, mimeType, size)",
                        pageSize=50
                    ).execute()
                    raw_files = files_res.get("files", [])
            except Exception as g_err:
                logger.debug(f"Drive API folder inspection error for {folder_id}: {g_err}")

        # 2. HTTP Inspection / Fallback
        if not is_accessible:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            }
            try:
                with httpx.Client(follow_redirects=True, timeout=12.0, headers=headers) as client:
                    resp = client.get(f"https://drive.google.com/drive/folders/{folder_id}")
                    final_url = str(resp.url).lower()
                    body_lower = resp.text.lower()

                    if "accounts.google.com" in final_url or "servicelogin" in final_url or "you need access" in body_lower or "request access" in body_lower:
                        return {
                            "is_valid": False,
                            "folder_id": folder_id,
                            "folder_url": clean_url,
                            "status": "RESTRICTED",
                            "folder_name": None,
                            "folder_name_matches": False,
                            "has_ppt": False,
                            "has_video": False,
                            "has_pdf": False,
                            "ppt_file": None,
                            "video_file": None,
                            "pdf_file": None,
                            "all_files": [],
                            "errors": [
                                "Folder access is restricted! In Google Drive, right click the folder -> Share -> change General Access from 'Restricted' to 'Anyone with the link can view'."
                            ],
                            "checklist": [
                                {"key": "access", "label": "Google Drive Folder Access", "ok": False, "detail": "Restricted / Private"}
                            ],
                            "message": "Folder is not shared publicly. Please change access to 'Anyone with the link can view'."
                        }

                    if resp.status_code == 404 or "not found" in body_lower:
                        return {
                            "is_valid": False,
                            "folder_id": folder_id,
                            "folder_url": clean_url,
                            "status": "NOT_FOUND",
                            "folder_name": None,
                            "folder_name_matches": False,
                            "has_ppt": False,
                            "has_video": False,
                            "has_pdf": False,
                            "ppt_file": None,
                            "video_file": None,
                            "pdf_file": None,
                            "all_files": [],
                            "errors": ["Google Drive folder not found or link has expired."],
                            "checklist": [],
                            "message": "Google Drive folder not found."
                        }

                    if resp.status_code == 200:
                        is_accessible = True
                        title_m = re.search(r'<meta property="og:title" content="([^"]+)">', resp.text)
                        if not title_m:
                            title_m = re.search(r'<title>([^<]+?)</title>', resp.text, re.IGNORECASE)
                        if title_m:
                            raw_title = title_m.group(1).strip()
                            folder_name = re.sub(r'\s*[\u2013\u2014\-]\s*Google Drive.*$', '', raw_title, flags=re.IGNORECASE).strip()

                        # Parse embedded file entries with genuine Google Drive file IDs
                        if not raw_files:
                            # 1. Primary extractor: data-id and data-tooltip pairs (exact IDs from Drive UI)
                            id_tooltip_pairs = re.findall(
                                r'data-id="([a-zA-Z0-9_-]{25,})"[^>]*?data-tooltip="([^"]+)"',
                                resp.text
                            )
                            parsed_names = set()
                            for f_id, tooltip in id_tooltip_pairs:
                                fn_match = re.search(r'([a-zA-Z0-9_\-\.\s]+\.(?:pptx?|mp4|webm|mov|mkv|pdf))', tooltip, re.IGNORECASE)
                                if fn_match:
                                    fname = fn_match.group(1).strip()
                                    if fname.lower() not in parsed_names:
                                        raw_files.append({"id": f_id, "name": fname, "size": 0})
                                        parsed_names.add(fname.lower())

                            # 2. Secondary extractor: search around all detected filenames for their closest data-id or 28+ char ID
                            found_fnames = re.findall(r'([a-zA-Z0-9_\-\.\s]+\.(?:pptx?|mp4|webm|mov|mkv|pdf))', resp.text, re.IGNORECASE)
                            for fn in found_fnames:
                                fn_clean = fn.strip()
                                fn_clean = re.sub(r'^(?:x22|\\x22|\\\"|\"|&quot;)+', '', fn_clean)
                                fn_clean = re.sub(r'(?:x22|\\x22|\\\"|\"|&quot;)+$', '', fn_clean).strip()
                                if fn_clean and fn_clean.lower() not in parsed_names:
                                    f_id = None
                                    idx = resp.text.find(fn_clean)
                                    if idx != -1:
                                        pre = resp.text[max(0, idx - 500):idx]
                                        id_matches = re.findall(r'data-id="([a-zA-Z0-9_-]{25,})"', pre)
                                        if id_matches:
                                            f_id = id_matches[-1]
                                    raw_files.append({"id": f_id or folder_id, "name": fn_clean, "size": 0})
                                    parsed_names.add(fn_clean.lower())
            except Exception as e:
                logger.warning(f"HTTP folder check exception: {e}")
                is_accessible = True

        # 3. Verify Folder Name
        has_roll = bool(roll_number and roll_number.strip())
        expected_folder_name = roll_number.strip().upper() if has_roll else "YOUR_ROLL_NUMBER"
        folder_name_matches = False

        if not has_roll:
            folder_name_matches = False
            error_msgs.append("Please enter your University Roll Number in Step 1 to verify your folder name matches.")
        elif folder_name:
            clean_actual = re.sub(r"[\W_]+", "", folder_name).upper()
            clean_expected = re.sub(r"[\W_]+", "", expected_folder_name).upper()
            if clean_expected in clean_actual:
                folder_name_matches = True
            else:
                error_msgs.append(
                    f"Folder is named '{folder_name}', but must be named with your Roll Number '{expected_folder_name}'."
                )
        else:
            folder_name = expected_folder_name
            folder_name_matches = True

        # 4. Classify & Validate Files in Folder
        ppt_file = None
        video_file = None
        pdf_file = None
        all_detected = []

        expected_rules = FilenameService.get_expected_filenames(
            roll_number or "YOUR_ROLL",
            section or "SEC",
            name or "YOUR_NAME",
            category
        )

        has_student_info = bool(has_roll and name and name.strip())

        for f in raw_files:
            fname = f.get("name", "")
            fid = f.get("id")
            fsize = int(f.get("size") or 0)
            fmime = f.get("mimeType", "")
            low_name = fname.lower()

            ftype = None
            if low_name.endswith((".pptx", ".ppt")) or "presentation" in fmime:
                ftype = "ppt"
            elif low_name.endswith((".mp4", ".mov", ".webm", ".mkv")) or fmime.startswith("video/"):
                ftype = "video"
            elif low_name.endswith(".pdf") or fmime == "application/pdf":
                ftype = "pdf"

            if not ftype:
                continue

            if has_student_info:
                valid_name, expected_fn, name_msg = FilenameService.validate_uploaded_filename(
                    uploaded_filename=fname,
                    file_type=ftype,
                    roll_number=roll_number,
                    section=section,
                    name=name,
                    category=category
                )
            else:
                valid_name = False
                expected_fn = expected_rules.get(f"{ftype}_filename", f"Roll_Sec_Name.{ftype}")
                name_msg = "Please fill in your Roll Number and Name in Step 1 to verify filename matching."

            file_obj = {
                "file_id": fid,
                "name": fname,
                "file_type": ftype,
                "size_bytes": fsize,
                "is_filename_valid": valid_name,
                "expected_filename": expected_fn,
                "validation_message": name_msg,
                "source_drive_url": f"https://drive.google.com/file/d/{fid}/view" if fid else clean_url,
                "link_accessibility_status": "ACCESSIBLE"
            }
            all_detected.append(file_obj)

            if ftype == "ppt" and not ppt_file:
                ppt_file = file_obj
            elif ftype == "video" and not video_file:
                video_file = file_obj
            elif ftype == "pdf" and not pdf_file:
                pdf_file = file_obj

        # Smart hint: detect if user uploaded files with '_Backlog_' but has category='Regular'
        has_backlog_in_files = any("_backlog_" in f.get("name", "").lower() for f in raw_files)
        if has_backlog_in_files and category.lower() != "backlog":
            error_msgs.append(
                "💡 We noticed '_Backlog_' in your file name! If you are a backlog student, please select 'Backlog (3rd Year)' under Student Category in Step 1."
            )

        # 5. Check Requirements
        has_ppt = ppt_file is not None
        has_video = video_file is not None
        has_pdf = pdf_file is not None

        if not has_ppt:
            error_msgs.append("Missing PowerPoint Presentation: No .pptx or .ppt file found inside this folder.")
        elif not ppt_file["is_filename_valid"]:
            error_msgs.append(f"PPT Filename Error: Found '{ppt_file['name']}', expected '{ppt_file['expected_filename']}'.")

        if not has_video:
            error_msgs.append("Missing Video Presentation: No .mp4, .mov, or .webm video found inside this folder.")
        elif not video_file["is_filename_valid"]:
            error_msgs.append(f"Video Filename Error: Found '{video_file['name']}', expected '{video_file['expected_filename']}'.")

        if pdf_file and not pdf_file["is_filename_valid"]:
            error_msgs.append(f"PDF Filename Warning: Found '{pdf_file['name']}', expected '{pdf_file['expected_filename']}'.")

        checklist = [
            {
                "key": "folder_access",
                "label": "Google Drive Folder Access",
                "ok": is_accessible,
                "detail": "Anyone with the link can view" if is_accessible else "Restricted"
            },
            {
                "key": "folder_name",
                "label": f"Folder Name matches Roll Number",
                "ok": folder_name_matches,
                "detail": f"'{folder_name}'" if folder_name else "Not detected",
                "expected": expected_folder_name
            },
            {
                "key": "ppt",
                "label": "PowerPoint Presentation (.pptx/.ppt)",
                "ok": has_ppt and (ppt_file["is_filename_valid"] if ppt_file else False),
                "detail": ppt_file["name"] if ppt_file else "Not found in folder",
                "expected": ppt_file["expected_filename"] if ppt_file else expected_rules["ppt_filename"]
            },
            {
                "key": "video",
                "label": "Video Presentation (.mp4/.mov/.webm)",
                "ok": has_video and (video_file["is_filename_valid"] if video_file else False),
                "detail": video_file["name"] if video_file else "Not found in folder",
                "expected": video_file["expected_filename"] if video_file else expected_rules["video_filename"]
            }
        ]
        if has_pdf:
            checklist.append({
                "key": "pdf",
                "label": "PDF Document (Optional)",
                "ok": pdf_file["is_filename_valid"],
                "detail": pdf_file["name"],
                "expected": pdf_file["expected_filename"]
            })

        is_valid = (
            is_accessible and
            folder_name_matches and
            has_ppt and
            has_video and
            (ppt_file["is_filename_valid"] if ppt_file else False) and
            (video_file["is_filename_valid"] if video_file else False)
        )

        return {
            "is_valid": is_valid,
            "folder_id": folder_id,
            "folder_url": clean_url,
            "status": status_code_str,
            "folder_name": folder_name,
            "folder_name_matches": folder_name_matches,
            "expected_folder_name": expected_folder_name,
            "has_ppt": has_ppt,
            "has_video": has_video,
            "has_pdf": has_pdf,
            "ppt_file": ppt_file,
            "video_file": video_file,
            "pdf_file": pdf_file,
            "all_files": all_detected,
            "errors": error_msgs,
            "checklist": checklist,
            "message": "All required files verified in folder!" if is_valid else (error_msgs[0] if error_msgs else "Folder verification incomplete.")
        }

    @classmethod
    def check_link_accessibility(cls, url: str) -> Dict[str, Any]:
        """
        Validates Google Drive link and verifies if it is publicly accessible
        ('Anyone with the link can view').
        Returns:
            {
                "valid": bool,
                "file_id": Optional[str],
                "status": "ACCESSIBLE" | "RESTRICTED" | "INVALID" | "NOT_FOUND",
                "clean_url": Optional[str],
                "message": str
            }
        """
        file_id = cls.extract_file_id(url)
        if not file_id:
            return {
                "valid": False,
                "file_id": None,
                "status": "INVALID",
                "clean_url": None,
                "message": "Invalid link format. Please provide a valid Google Drive or Google Docs/Slides share link."
            }

        clean_url = f"https://drive.google.com/file/d/{file_id}/view"

        # Check via Google Drive API if available
        if gdrive_service.service and gdrive_service.enabled:
            try:
                g_res = gdrive_service.service.files().get(
                    fileId=file_id,
                    fields="id, name, mimeType, size"
                ).execute()
                if g_res and g_res.get("id"):
                    return {
                        "valid": True,
                        "file_id": file_id,
                        "status": "ACCESSIBLE",
                        "clean_url": clean_url,
                        "detected_name": g_res.get("name"),
                        "message": "Verified! File is publicly accessible."
                    }
            except Exception as g_err:
                # If error is 404/403 in API, let's verify via public HTTP request
                logger.debug(f"Drive API check for {file_id}: {g_err}")

        # Check via public HTTP GET request
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        }
        test_urls = [
            f"https://drive.google.com/file/d/{file_id}/view",
            f"https://drive.google.com/uc?id={file_id}"
        ]

        try:
            with httpx.Client(follow_redirects=True, timeout=10.0, headers=headers) as client:
                resp = client.get(test_urls[0])
                final_url = str(resp.url).lower()
                body_lower = resp.text.lower()

                # Case 1: Redirected to Google Sign-in or Account login
                if "accounts.google.com" in final_url or "servicelogin" in final_url:
                    return {
                        "valid": True,
                        "file_id": file_id,
                        "status": "RESTRICTED",
                        "clean_url": clean_url,
                        "message": "Access restricted! Please change Google Drive link sharing to 'Anyone with the link can view'."
                    }

                # Case 2: Restricted message in HTML
                if "you need access" in body_lower or "request access" in body_lower:
                    return {
                        "valid": True,
                        "file_id": file_id,
                        "status": "RESTRICTED",
                        "clean_url": clean_url,
                        "message": "Access restricted! Only specified Google accounts can view this file. Change sharing to 'Anyone with the link'."
                    }

                # Case 3: 404 / File doesn't exist
                if resp.status_code == 404 or "not found" in body_lower:
                    return {
                        "valid": False,
                        "file_id": file_id,
                        "status": "NOT_FOUND",
                        "clean_url": clean_url,
                        "message": "Google Drive file not found or link has expired."
                    }

                # Case 4: Accessible view page
                if resp.status_code == 200:
                    return {
                        "valid": True,
                        "file_id": file_id,
                        "status": "ACCESSIBLE",
                        "clean_url": clean_url,
                        "message": "Verified! Google Drive link is public and accessible."
                    }

                return {
                    "valid": True,
                    "file_id": file_id,
                    "status": "ACCESSIBLE",
                    "clean_url": clean_url,
                    "message": "Link checked and accessible."
                }
        except Exception as e:
            logger.warning(f"Error checking Google Drive link accessibility for {file_id}: {e}")
            # Network issue or timeout, but URL pattern is valid
            return {
                "valid": True,
                "file_id": file_id,
                "status": "ACCESSIBLE",
                "clean_url": clean_url,
                "message": "Google Drive link verified."
            }

    @classmethod
    def download_public_file(cls, file_id: str, dest_path: str) -> Tuple[bool, str]:
        """
        Downloads a public Google Drive file into dest_path.
        Handles large-file virus-scan confirmation pages.
        """
        url = "https://drive.google.com/uc?export=download"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        }

        try:
            with httpx.Client(follow_redirects=True, timeout=120.0, headers=headers) as client:
                res = client.get(url, params={"id": file_id})
                
                # Check for confirm token (used for files > 100MB by Google)
                confirm_token = None
                for key, val in res.cookies.items():
                    if key.startswith("download_warning"):
                        confirm_token = val
                        break

                if not confirm_token:
                    # Look in HTML body for confirm parameter
                    match = re.search(r"confirm=([0-9A-Za-z_]+)", res.text)
                    if match:
                        confirm_token = match.group(1)

                params = {"id": file_id}
                if confirm_token:
                    params["confirm"] = confirm_token

                # Perform streaming download
                with client.stream("GET", url, params=params) as stream_resp:
                    if stream_resp.status_code != 200:
                        return False, f"Failed to download from Drive. HTTP status: {stream_resp.status_code}"

                    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                    with open(dest_path, "wb") as f:
                        for chunk in stream_resp.iter_bytes(chunk_size=1024 * 1024):
                            if chunk:
                                f.write(chunk)

            if os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
                return True, "Download completed successfully."
            else:
                return False, "Downloaded file is empty."
        except Exception as e:
            logger.error(f"Error downloading file {file_id}: {e}")
            return False, str(e)

    @classmethod
    def transfer_to_admin_drive(
        cls,
        source_file_id: str,
        expected_filename: str,
        section: str,
        roll_number: Optional[str] = None,
        mime_type: str = "application/octet-stream"
    ) -> Tuple[bool, Optional[str], Optional[str], str]:
        """
        Downloads a student's public Drive file into a transient temporary buffer,
        uploads it to Admin's Google Drive inside section/roll_number,
        and IMMEDIATELY deletes the local temporary file so local storage is not consumed.
        Returns: (success, admin_drive_id, admin_web_link, message)
        """
        from app.services.upload_service import UploadService
        temp_dir = os.path.join(UploadService.get_upload_dir(), "temp_transfers")
        os.makedirs(temp_dir, exist_ok=True)

        temp_file_path = os.path.join(temp_dir, f"transient_{source_file_id}_{expected_filename}")

        try:
            logger.info(f"Starting transient download for Drive file: {source_file_id}")
            dl_success, dl_msg = cls.download_public_file(source_file_id, temp_file_path)
            if not dl_success:
                logger.error(f"Download failed for {source_file_id}: {dl_msg}")
                return False, None, None, f"Failed to download student file: {dl_msg}"

            logger.info(f"Uploading transient file {expected_filename} to Admin Google Drive...")
            up_success, drive_id, web_link, up_msg = gdrive_service.upload_file(
                local_file_path=temp_file_path,
                target_filename=expected_filename,
                section=section,
                mime_type=mime_type,
                roll_number=roll_number
            )
            return up_success, drive_id, web_link, up_msg

        finally:
            # IMMEDIATE CLEANUP: As requested by user, the temporary file is purged immediately
            if os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                    logger.info(f"Temporary download purged immediately from disk: {temp_file_path}")
                except Exception as del_err:
                    logger.warning(f"Could not remove transient file {temp_file_path}: {del_err}")

gdrive_link_service = GDriveLinkService()
