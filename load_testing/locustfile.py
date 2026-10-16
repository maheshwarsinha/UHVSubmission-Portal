import random
import string
from locust import HttpUser, task, between

SECTIONS = ["CSE1", "CSE2", "CSE3", "CSE-AI"]
BRANCHES = [
    "Computer Science and Engineering",
    "Information Technology",
    "Artificial Intelligence & Data Science"
]
YEARS = ["2nd Year", "3rd Year", "4th Year"]
CATEGORIES = ["Regular", "Backlog"]
TOPICS = [
    "Harmony in the Human Being: Understanding Self and Body",
    "Harmony in the Family and Society: Values in Human Relationships",
    "Harmony in Nature and Existence: Whole Existence as Co-existence",
    "Professional Ethics in the Light of Right Understanding",
    "Holistic Development and Living in Universal Human Values"
]

class UHVStudentUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        # Generate synthetic student profile
        self.roll_number = f"25{random.randint(100000000, 999999999)}"
        self.section = random.choice(SECTIONS)
        self.name = f"Student_{random.choice(string.ascii_uppercase)}{random.randint(100, 999)}"
        self.branch = random.choice(BRANCHES)
        self.academic_year = random.choice(YEARS)
        self.category = random.choice(CATEGORIES)
        self.email = f"{self.roll_number.lower()}@university.edu.in"
        self.topic = random.choice(TOPICS)
        self.tracking_id = None

    @task(3)
    def fetch_assignment_guidelines(self):
        """Simulates students loading the portal landing page guidelines."""
        with self.client.get("/api/v1/system/assignment-info", catch_response=True) as res:
            if res.status_code == 200:
                res.success()
            else:
                res.failure(f"Failed to fetch guidelines: {res.status_code}")

    @task(3)
    def preview_expected_filenames(self):
        """Simulates real-time expected filename generation."""
        payload = {
            "roll_number": self.roll_number,
            "section": self.section,
            "name": self.name
        }
        with self.client.post("/api/v1/uploads/expected-filenames", json=payload, catch_response=True) as res:
            if res.status_code == 200:
                res.success()
            else:
                res.failure(f"Failed expected filename preview: {res.status_code}")

    @task(2)
    def simulate_chunked_upload_and_submission(self):
        """
        Simulates complete high-concurrency student submission workflow:
        1. Pre-validation
        2. Chunk streaming
        3. File assembly
        4. Final submission with receipt verification
        """
        base_name = f"{self.roll_number}_{self.section}_{self.name}"
        ppt_name = f"{base_name}.pptx"
        video_name = f"{base_name}.mp4"

        # 1. Filename pre-validation check
        val_res = self.client.post("/api/v1/uploads/validate-filename", json={
            "roll_number": self.roll_number,
            "section": self.section,
            "name": self.name,
            "uploaded_filename": ppt_name,
            "file_type": "ppt"
        })
        if val_res.status_code != 200 or not val_res.json().get("is_valid"):
            return

        # 2. Upload PPT chunk (Synthetic 1MB sample)
        ppt_upload_id = f"locust_ppt_{self.roll_number}"
        synthetic_ppt_data = b"PK\x03\x04" + (b"0" * (1024 * 1024))
        files = {"chunk": (ppt_name, synthetic_ppt_data, "application/octet-stream")}
        data = {
            "upload_id": ppt_upload_id,
            "chunk_index": "0",
            "total_chunks": "1"
        }
        self.client.post("/api/v1/uploads/upload-chunk", data=data, files=files)

        # Assemble PPT
        ppt_assemble = self.client.post("/api/v1/uploads/assemble-file", json={
            "upload_id": ppt_upload_id,
            "total_chunks": 1,
            "target_filename": ppt_name,
            "file_type": "ppt",
            "roll_number": self.roll_number,
            "section": self.section,
            "name": self.name
        })

        if ppt_assemble.status_code != 200:
            return
        ppt_staged = ppt_assemble.json()

        # 3. Upload Video chunk (Synthetic 5MB sample with ftyp signature)
        video_upload_id = f"locust_vid_{self.roll_number}"
        ftyp_header = b"\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isomiso2avc1mp41"
        synthetic_vid_data = ftyp_header + (b"0" * (5 * 1024 * 1024))
        vid_files = {"chunk": (video_name, synthetic_vid_data, "video/mp4")}
        vid_data = {
            "upload_id": video_upload_id,
            "chunk_index": "0",
            "total_chunks": "1"
        }
        self.client.post("/api/v1/uploads/upload-chunk", data=vid_data, files=vid_files)

        # Assemble Video
        vid_assemble = self.client.post("/api/v1/uploads/assemble-file", json={
            "upload_id": video_upload_id,
            "total_chunks": 1,
            "target_filename": video_name,
            "file_type": "video",
            "roll_number": self.roll_number,
            "section": self.section,
            "name": self.name
        })

        if vid_assemble.status_code != 200:
            return
        vid_staged = vid_assemble.json()

        # 4. Final Submission POST (< 500ms target)
        submission_payload = {
            "student": {
                "roll_number": self.roll_number,
                "name": self.name,
                "branch": self.branch,
                "section": self.section,
                "academic_year": self.academic_year,
                "student_category": self.category,
                "email": self.email
            },
            "topic": self.topic,
            "declaration_confirmed": True,
            "files": [
                {
                    "file_type": "ppt",
                    "file_token": ppt_staged["file_token"],
                    "expected_filename": ppt_staged["expected_filename"],
                    "original_filename": ppt_name,
                    "mime_type": ppt_staged["mime_type"],
                    "file_size": ppt_staged["file_size"],
                    "sha256": ppt_staged["sha256"]
                },
                {
                    "file_type": "video",
                    "file_token": vid_staged["file_token"],
                    "expected_filename": vid_staged["expected_filename"],
                    "original_filename": video_name,
                    "mime_type": vid_staged["mime_type"],
                    "file_size": vid_staged["file_size"],
                    "sha256": vid_staged["sha256"]
                }
            ],
            "idempotency_key": f"locust_sub_{self.roll_number}"
        }

        with self.client.post("/api/v1/submissions", json=submission_payload, catch_response=True) as sub_res:
            if sub_res.status_code == 200:
                self.tracking_id = sub_res.json().get("tracking_id")
                sub_res.success()
            else:
                sub_res.failure(f"Final submission failed: {sub_res.status_code} - {sub_res.text}")

    @task(1)
    def lookup_submission_receipt(self):
        """Simulates receipt status lookup by tracking ID."""
        if not self.tracking_id:
            return
        with self.client.get(f"/api/v1/submissions/{self.tracking_id}", catch_response=True) as res:
            if res.status_code == 200:
                res.success()
            else:
                res.failure(f"Lookup failed: {res.status_code}")
