# Universal Human Values (UHV) Assignment Submission Portal

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?logo=docker)](https://www.docker.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A high-concurrency, production-grade web portal built for university students to submit their **Universal Human Values (UHV) Presentation Assignments** across local campus networks (LAN / Wi-Fi).

---

## 1. System Architecture & High-Concurrency Design

```
[400+ Students / 180 Concurrent Uploaders over Campus LAN]
                       │ (HTTP/REST / Chunks / SSE)
                       ▼
            [NGINX Reverse Proxy]
       (client_max_body_size 600M, rate-limits, unbuffered chunks)
                       │
                       ▼
           [FastAPI Application Server]
    (Pydantic v2 validation, magic bytes check, chunk streamer)
         │                             │
         ▼                             ▼
 [PostgreSQL 16]              [Local Temp Storage]
 (Submissions, Files,         (/data/uploads: chunks,
  Jobs, Audit Logs)            assembled files, SHA-256)
                                       │
                                       ▼
                              [Celery + Redis 7]
                  (Bounded queues: 4-6 parallel workers)
                                ┌──────┴──────┐
                                ▼             ▼
                     [Google Drive API v3] [SMTP Receipts]
                     (Resumable uploads by  (IST timestamped receipts
                      section: CSE1, CSE2...) to student & teacher)
```

### High-Concurrency Specifications
- **Capacity**: Accommodates **400+ registered students** with **at least 180 simultaneous upload attempts**.
- **Non-Blocking Architecture**: Files are uploaded in 5 MB streaming chunks to local high-throughput temporary NVMe/SSD storage.
- **Graceful Offloading**: Google Drive uploads and email dispatches execute in background Celery queues with bounded concurrency (4–6 workers) and exponential backoff, preventing Google API rate limits (`userRateLimitExceeded`) or email timeouts from freezing the user interface.
- **Worst-Case Storage Plan**: If 180 students upload 500 MB videos simultaneously, the incoming data volume is approximately **~90 GB**. The portal enforces disk-space pre-checks and automated file purging once Google Drive transfer is verified.
- **Sub-500ms p95 Target**: Form validations, chunk acknowledgments, and receipt lookups complete under 500 ms (p95) even during heavy network activity.

---

## 2. Assignment Rules & Workflow

### Official Assignment Rules
- **Coursework**: Universal Human Values (UHV) Assignment — PPT Presentation.
- **Slide Requirement**: 4–5 PowerPoint slides.
- **Duration**: Presentation video within 5 minutes.
- **Recording Guidelines**: PPT slides and the student's face must both be clearly visible in the video.
- **First Slide Requirements**: Must include Topic, Student Name, Branch, Section, Year, and University Roll Number.
- **Slide Footers**: Topic title and university roll number required in the footer of every slide.
- **Submission Deadline**: **26 October 2026 at 11:59 PM IST**.
- **Applicable Sections**: `CSE1`, `CSE2`, `CSE3`, `CSE-AI`, and applicable `Backlog` students.
- **Hard Copy**: Physical printed copy must be submitted separately as instructed by the university.

### 5-Step Submission Workflow
1. **Student Details**: Roll Number, Full Name, Branch, Section, Academic Year, Category (Regular/Backlog), Email, and Topic.
2. **Expected Filename Generation**: Automatically formats files as `UniversityRollNumber_Section_Name.[ext]`:
   - `25001390001_CSE1_XYZ.pptx` (PowerPoint — Required, default max 50 MB)
   - `25001390001_CSE1_XYZ.pdf` (PDF Companion — Optional/configurable, default max 25 MB)
   - `25001390001_CSE1_XYZ.mp4` (Video Presentation — Required, default max 500 MB)
3. **Chunked Drag-and-Drop Upload**: Asynchronous 5 MB chunk streaming with live progress bars and true magic-byte content validation.
4. **Review & Declaration**: Summary review with explicit student declaration checkbox and idempotency double-click protection.
5. **Multi-Tier Receipt**: Issues a unique Tracking ID (e.g., `UHV-2026-ABCD12`) clearly distinguishing:
   - File received on local server.
   - File queued/archived in Google Drive.
   - Email confirmation dispatched to student inbox.

---

## 3. Quick Start & Local Development

### Prerequisites
- Python 3.12+
- Node.js 20+ & npm
- Docker & Docker Compose (for containerized deployment)

### 1. Environment Setup
```powershell
# Copy environment configuration
Copy-Item .env.example .env
```

### 2. Start Backend Locally
```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be live at: `http://localhost:8000/docs`

### 3. Start Frontend Locally
```powershell
cd frontend
npm install
npm run dev
```
Portal interface will be live at: `http://localhost:5173`

---

## 4. Production Campus LAN Deployment (Docker Compose)

To host the portal on a university computer connected to the campus LAN/Wi-Fi:

### Step 1: Find your Server LAN IP Address
Open PowerShell and run:
```powershell
ipconfig
```
Locate your IPv4 Address on your Wi-Fi or Ethernet adapter (e.g., `192.168.1.45` or `10.0.0.25`).

### Step 2: Configure Environment
Edit `.env`:
```ini
ENVIRONMENT=production-lan
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
VITE_API_URL=http://192.168.1.45:8000
UPLOAD_DIR=/data/uploads
```

### Step 3: Launch Docker Services
```powershell
# Start all containers in detached mode
docker compose -f docker-compose.yml -f docker-compose.lan.yml up -d --build
```

### Step 4: Accessing the Portal on Campus
Students on the same campus Wi-Fi or LAN open:
```
http://192.168.1.45
```
Administrator Dashboard:
```
http://192.168.1.45/
Click "Admin" on the top right
```

---

## 5. Google Drive OAuth 2.0 Setup

The system automatically archives student files into section subfolders (`CSE1`, `CSE2`, `CSE3`, `CSE-AI`, `Backlog`) within a root Google Drive folder (`UHV_Assignment_Submissions_2026`).

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and enable the **Google Drive API**.
3. Configure the **OAuth Consent Screen** (User Type: External, Testing mode, add your Google account as a Test User).
4. Create Credentials &rarr; **OAuth Client ID** &rarr; Application Type: **Web Application**.
5. Add Authorized Redirect URI: `https://developers.google.com/oauthplayground`.
6. Go to [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground):
   - Click the gear icon on the top right &rarr; Check *Use your own OAuth credentials* &rarr; Enter your Client ID & Secret.
   - In Step 1, select `https://www.googleapis.com/auth/drive.file` and click *Authorize APIs*.
   - In Step 2, click *Exchange authorization code for tokens*.
   - Copy the generated `Refresh token`.
7. Paste these values into `.env`:
   ```ini
   GDRIVE_ENABLED=true
   GDRIVE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GDRIVE_CLIENT_SECRET=your_client_secret
   GDRIVE_REFRESH_TOKEN=your_refresh_token
   GDRIVE_ROOT_FOLDER_NAME=UHV_Assignment_Submissions_2026
   ```
*(Note: If Google credentials are not yet configured, the system uses safe simulation mode without crashing).*

---

## 6. Email Notifications (SMTP)

Configure transactional email in `.env`:
```ini
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=uhv.portal.university@gmail.com
SMTP_PASSWORD=your_16_digit_app_password
SMTP_TLS=true
EMAIL_FROM=uhv.portal.university@gmail.com
TEACHER_EMAIL=teacher.uhv@university.edu.in
```
- **Student Email**: Receives official receipt with tracking ID, IST timestamp, files list, and evaluation classification (`ON_TIME` / `LATE`).
- **Teacher Email**: Receives instant notification of new submissions.

---

## 7. Administrator Credentials & Controls

### Default Admin Login
- **URL**: Click **Admin** on portal header (`/`)
- **Email**: `admin@uhv-portal.edu.in`
- **Password**: `AdminUHV@Pass2026!` *(Change in production via settings)*

### Dashboard Features
- **Overview Metrics**: Submissions count, archived vs pending Drive transfers, on-time vs late ratios, regular vs backlog, section breakdowns, server disk space gauge.
- **Submissions Management**: Search by student name, roll number, section, topic, or tracking ID; filter by section, status, and category.
- **File & Job Inspector**: Inspect file checksums, download files, and retry failed background tasks.
- **CSV Export**: Stream one-click CSV export of all student submissions with IST timestamps.
- **Dynamic Configuration**: Change deadline cutoff, maximum file sizes, teacher email, and open/close submissions without restarting the server.

---

## 8. Automated Testing & Load Testing

### Running Unit & API Tests
```powershell
cd backend
python -m pytest tests/ -v
```
Output:
```
tests/test_api_endpoints.py ....                                         [ 30%]
tests/test_file_validator.py ...                                         [ 53%]
tests/test_filename_service.py ......                                    [100%]
======================== 13 passed in 0.15s ========================
```

### Running High-Concurrency Load Tests (Locust)
Simulate 50, 100, and 180 concurrent students:

```powershell
# 1. Generate synthetic test documents and videos
python load_testing/generate_test_payloads.py

# 2. Run Locust simulation
python -m pip install locust
locust -f load_testing/locustfile.py --host http://localhost:8000
```
Open `http://localhost:8089` in your browser:
- Number of users: `180`
- Spawn rate: `10`
- Target response time benchmark: < 500 ms (p95) for non-transfer endpoints.

---

## 9. Database Backup & Disaster Recovery

### Backup Database
```powershell
docker exec -t uhv_postgres pg_dump -U uhv_user uhv_portal_db > backup_uhv_$(Get-Date -Format "yyyyMMdd_HHmmss").sql
```

### Restore Database
```powershell
docker exec -i uhv_postgres psql -U uhv_user -d uhv_portal_db < backup_file.sql
```

---

## 10. Operational Health & Monitoring
- **Liveness Probe**: `GET /api/v1/system/health`
- **Readiness Probe**: `GET /api/v1/system/ready` (Verifies PostgreSQL connectivity and ensures at least 2 GB free disk cushion).
