import os
import logging
from typing import Optional, Dict, Any, Tuple
try:
    import redis
except ImportError:
    redis = None

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError
from app.core.config import settings

logger = logging.getLogger("gdrive_service")

class GDriveService:
    def __init__(self):
        self.enabled = settings.GDRIVE_ENABLED and bool(settings.GDRIVE_REFRESH_TOKEN)
        self.service = None
        self._folder_cache: Dict[str, str] = {}
        self.redis_client = None
        if redis:
            try:
                self.redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
            except Exception as re_err:
                logger.warning(f"Could not connect to Redis for GDrive cache/locks: {re_err}")

        if self.enabled:
            self._init_service()

    def _init_service(self):
        try:
            creds = Credentials(
                token=None,
                refresh_token=settings.GDRIVE_REFRESH_TOKEN,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=settings.GDRIVE_CLIENT_ID,
                client_secret=settings.GDRIVE_CLIENT_SECRET,
                scopes=["https://www.googleapis.com/auth/drive.file"]
            )
            self.service = build("drive", "v3", credentials=creds, cache_discovery=False)
            logger.info("Google Drive v3 API client initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Google Drive client: {e}")
            self.service = None

    def get_or_create_folder(self, folder_name: str, parent_folder_id: Optional[str] = None) -> Optional[str]:
        """
        Locates or creates a Google Drive folder under the given parent folder.
        Uses Redis shared cache and distributed lock to prevent concurrent Celery tasks
        from creating duplicate folders for the same section or roll number.
        """
        if not self.service:
            return None

        clean_parent = parent_folder_id or "root"
        cache_key = f"gdrive:folder:{clean_parent}:{folder_name}"

        # 1. In-process cache check
        if cache_key in self._folder_cache:
            return self._folder_cache[cache_key]

        # 2. Redis shared cache check across all worker processes
        if self.redis_client:
            try:
                cached_id = self.redis_client.get(cache_key)
                if cached_id:
                    self._folder_cache[cache_key] = cached_id
                    return cached_id
            except Exception:
                pass

        # 3. Distributed Lock to prevent race conditions during folder creation
        lock = None
        if self.redis_client:
            try:
                lock = self.redis_client.lock(f"lock:{cache_key}", timeout=45, blocking_timeout=25)
                lock.acquire()
            except Exception:
                lock = None

        try:
            # Re-check cache after acquiring lock
            if self.redis_client:
                try:
                    cached_id = self.redis_client.get(cache_key)
                    if cached_id:
                        self._folder_cache[cache_key] = cached_id
                        return cached_id
                except Exception:
                    pass

            query = f"mimeType = 'application/vnd.google-apps.folder' and name = '{folder_name}' and trashed = false"
            if parent_folder_id:
                query += f" and '{parent_folder_id}' in parents"
            else:
                query += " and 'root' in parents"

            results = self.service.files().list(q=query, spaces="drive", fields="files(id, name)").execute()
            files = results.get("files", [])

            if files:
                folder_id = files[0]["id"]
            else:
                file_metadata = {
                    "name": folder_name,
                    "mimeType": "application/vnd.google-apps.folder"
                }
                if parent_folder_id:
                    file_metadata["parents"] = [parent_folder_id]
                folder = self.service.files().create(body=file_metadata, fields="id").execute()
                folder_id = folder.get("id")

            self._folder_cache[cache_key] = folder_id
            if self.redis_client:
                try:
                    self.redis_client.set(cache_key, folder_id, ex=86400)
                except Exception:
                    pass

            return folder_id
        except Exception as e:
            logger.error(f"Error getting/creating Drive folder '{folder_name}': {e}")
            return None
        finally:
            if lock:
                try:
                    lock.release()
                except Exception:
                    pass

    def deduplicate_all_folders(self) -> int:
        """
        Finds any duplicate folders with the same name under the same parent in Google Drive,
        deep-merges all roll-number subfolders and files from duplicates into the primary folder,
        and deletes duplicate folders.
        """
        if not self.service or not self.enabled:
            return 0

        merged_count = 0
        try:
            root_id = self.get_or_create_folder(settings.GDRIVE_ROOT_FOLDER_NAME)
            if not root_id:
                return 0

            # Step 1: List all section folders under root
            q_sections = f"'{root_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
            res_sections = self.service.files().list(q=q_sections, fields="files(id, name)").execute()
            sections_by_name: Dict[str, list] = {}
            for sf in res_sections.get("files", []):
                sections_by_name.setdefault(sf["name"], []).append(sf["id"])

            for sec_name, sec_ids in sections_by_name.items():
                primary_sec_id = sec_ids[0]
                for dup_sec_id in sec_ids[1:]:
                    q_dup = f"'{dup_sec_id}' in parents and trashed = false"
                    dup_items = self.service.files().list(q=q_dup, fields="files(id, name, mimeType)").execute().get("files", [])
                    for item in dup_items:
                        if item.get("mimeType") == "application/vnd.google-apps.folder":
                            roll_name = item["name"]
                            dup_roll_id = item["id"]
                            # Check if roll folder already exists in primary_sec_id
                            q_roll = f"'{primary_sec_id}' in parents and name = '{roll_name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
                            exist_rolls = self.service.files().list(q=q_roll, fields="files(id, name)").execute().get("files", [])
                            if exist_rolls:
                                prim_roll_id = exist_rolls[0]["id"]
                                # Move files from dup_roll to prim_roll
                                q_files = f"'{dup_roll_id}' in parents and trashed = false"
                                r_files = self.service.files().list(q=q_files, fields="files(id, name)").execute().get("files", [])
                                for rf in r_files:
                                    try:
                                        self.service.files().update(
                                            fileId=rf["id"],
                                            addParents=prim_roll_id,
                                            removeParents=dup_roll_id,
                                            fields="id, parents"
                                        ).execute()
                                    except Exception as rf_err:
                                        logger.error(f"Error moving file {rf['id']}: {rf_err}")
                                try:
                                    self.service.files().delete(fileId=dup_roll_id).execute()
                                    merged_count += 1
                                except Exception as del_roll_err:
                                    logger.error(f"Error deleting dup roll folder {dup_roll_id}: {del_roll_err}")
                            else:
                                try:
                                    self.service.files().update(
                                        fileId=dup_roll_id,
                                        addParents=primary_sec_id,
                                        removeParents=dup_sec_id,
                                        fields="id, parents"
                                    ).execute()
                                except Exception as m_roll_err:
                                    logger.error(f"Error reparenting roll folder {dup_roll_id}: {m_roll_err}")
                        else:
                            try:
                                self.service.files().update(
                                    fileId=item["id"],
                                    addParents=primary_sec_id,
                                    removeParents=dup_sec_id,
                                    fields="id, parents"
                                ).execute()
                            except Exception as item_err:
                                logger.error(f"Error moving item {item['id']}: {item_err}")
                    try:
                        self.service.files().delete(fileId=dup_sec_id).execute()
                        merged_count += 1
                    except Exception as del_sec_err:
                        logger.error(f"Error deleting dup section folder {dup_sec_id}: {del_sec_err}")

            self._folder_cache.clear()
            if self.redis_client:
                try:
                    keys = self.redis_client.keys("gdrive:folder:*")
                    if keys:
                        self.redis_client.delete(*keys)
                except Exception:
                    pass

            logger.info(f"Completed Drive folder deduplication. Merged {merged_count} duplicate items.")
            return merged_count
        except Exception as e:
            logger.error(f"Error deduplicating Drive folders: {e}")
            return merged_count

    def upload_file(
        self,
        local_file_path: str,
        target_filename: str,
        section: str,
        mime_type: str = "application/octet-stream",
        roll_number: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[str], str]:
        """
        Uploads a local file into the designated section & roll number folder in Google Drive.
        Hierarchy: Root (UHV_Assignment_Submissions_2026) -> Section/Category (e.g. Backlog, CSE1) -> Roll Number -> File
        Returns: (success, drive_file_id, web_view_link, message)
        """
        if not os.path.exists(local_file_path):
            return False, None, None, f"Local file not found: {local_file_path}"

        if not self.enabled or not self.service:
            # Simulated Drive storage for testing / staging without credentials
            mock_id = f"simulated_gdrive_{os.path.basename(local_file_path)[:16]}"
            logger.info(f"[SIMULATION] Google Drive upload simulated for {target_filename}. Mock ID: {mock_id}")
            return True, mock_id, f"https://drive.google.com/file/d/{mock_id}/view", "Uploaded to simulated Drive storage."

        try:
            # 1. Ensure Root Folder
            root_id = self.get_or_create_folder(settings.GDRIVE_ROOT_FOLDER_NAME)
            if not root_id:
                return False, None, None, "Failed to get or create root submission folder in Google Drive."

            # 2. Ensure Section Subfolder (e.g. CSE1, CSE2, CSE-AI, Backlog)
            section_id = self.get_or_create_folder(section, parent_folder_id=root_id)
            if not section_id:
                return False, None, None, f"Failed to get or create section subfolder '{section}' in Google Drive."

            # 3. Ensure Roll Number Subfolder inside Section
            parent_id = section_id
            if roll_number:
                roll_folder_id = self.get_or_create_folder(roll_number, parent_folder_id=section_id)
                if roll_folder_id:
                    parent_id = roll_folder_id

            # 4. Perform Resumable Upload
            file_metadata = {
                "name": target_filename,
                "parents": [parent_id]
            }

            media = MediaFileUpload(
                local_file_path,
                mimetype=mime_type,
                resumable=True,
                chunksize=5 * 1024 * 1024  # 5MB chunks to Google Drive
            )

            request = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields="id, webViewLink, size"
            )

            response = None
            while response is None:
                status, response = request.next_chunk()
                if status:
                    logger.debug(f"Uploading {target_filename} to Drive: {int(status.progress() * 100)}%")

            drive_id = response.get("id")
            web_link = response.get("webViewLink")
            logger.info(f"Successfully uploaded {target_filename} to Google Drive (ID: {drive_id}, Folder: {section}/{roll_number or ''})")
            return True, drive_id, web_link, "Successfully uploaded to Google Drive."

        except HttpError as http_err:
            logger.error(f"Google Drive HTTP Error for {target_filename}: {http_err}")
            return False, None, None, f"Google Drive API error: {http_err.resp.status} - {http_err.error_details}"
        except Exception as e:
            logger.error(f"Unexpected error uploading to Google Drive for {target_filename}: {e}")
            return False, None, None, f"Upload error: {str(e)}"

    def clean_all_submissions(self) -> int:
        """
        Deletes all files and subfolders inside the root Google Drive submission folder.
        """
        if not self.service or not self.enabled:
            return 0
        try:
            root_id = self.get_or_create_folder(settings.GDRIVE_ROOT_FOLDER_NAME)
            if not root_id:
                return 0

            query = f"'{root_id}' in parents and trashed = false"
            results = self.service.files().list(q=query, spaces="drive", fields="files(id, name)").execute()
            files = results.get("files", [])
            deleted_count = 0
            for item in files:
                try:
                    self.service.files().delete(fileId=item["id"]).execute()
                    deleted_count += 1
                    logger.info(f"Deleted Drive item: {item['name']} ({item['id']})")
                except Exception as del_err:
                    logger.error(f"Failed to delete Drive item {item['id']}: {del_err}")

            self._folder_cache.clear()
            return deleted_count
        except Exception as e:
            logger.error(f"Failed to clean Drive submissions: {e}")
            return 0

gdrive_service = GDriveService()
