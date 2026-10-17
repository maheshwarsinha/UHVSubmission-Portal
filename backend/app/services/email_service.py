import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone
import pytz
from typing import Dict, Any, List, Tuple, Optional
from app.core.config import settings

logger = logging.getLogger("email_service")

class EmailService:
    @staticmethod
    def get_ist_time_str(dt: Optional[datetime] = None) -> str:
        if dt is None:
            dt = datetime.now(timezone.utc)
        elif dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        ist_tz = pytz.timezone(settings.TIMEZONE)
        return dt.astimezone(ist_tz).strftime("%d %B %Y, %I:%M:%S %p %Z")

    @classmethod
    def send_smtp_email(cls, recipient: str, subject: str, html_content: str, text_content: str) -> Tuple[bool, str]:
        # 1. Option A: Brevo HTTP API (Port 443 - 300 emails/day free, sends to ANY recipient)
        if getattr(settings, "BREVO_API_KEY", None):
            try:
                import httpx
                headers = {
                    "api-key": settings.BREVO_API_KEY,
                    "Content-Type": "application/json"
                }
                sender_email = settings.EMAIL_FROM or settings.SMTP_USER or "maheshwarsinha01@gmail.com"
                payload = {
                    "sender": {"email": sender_email, "name": "UHV Assignment Portal"},
                    "to": [{"email": recipient}],
                    "subject": subject,
                    "htmlContent": html_content,
                    "textContent": text_content
                }
                res = httpx.post("https://api.brevo.com/v3/smtp/email", headers=headers, json=payload, timeout=15.0)
                if res.status_code in (200, 201):
                    msg_id = res.json().get("messageId", "BREVO_OK")
                    logger.info(f"Email successfully delivered to {recipient} via Brevo HTTPS API (ID: {msg_id})")
                    return True, f"BREVO_{msg_id}"
                else:
                    logger.warning(f"Brevo HTTP dispatch failed ({res.status_code}: {res.text}), checking fallbacks...")
            except Exception as brevo_err:
                logger.warning(f"Brevo HTTP API error: {brevo_err}, checking fallbacks...")

        # 2. Option B: Resend HTTP API (Port 443 - Delivered to verified domain or teacher email)
        if getattr(settings, "RESEND_API_KEY", None):
            try:
                import httpx
                headers = {
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json"
                }
                from_addr = "UHV Portal <onboarding@resend.dev>"
                if settings.EMAIL_FROM and "@gmail.com" not in settings.EMAIL_FROM:
                    from_addr = f"UHV Portal <{settings.EMAIL_FROM}>"

                payload = {
                    "from": from_addr,
                    "to": [recipient],
                    "subject": subject,
                    "html": html_content,
                    "text": text_content
                }
                res = httpx.post("https://api.resend.com/emails", headers=headers, json=payload, timeout=15.0)
                if res.status_code in (200, 201):
                    msg_id = res.json().get("id", "RESEND_OK")
                    logger.info(f"Email successfully delivered to {recipient} via Resend HTTPS API (ID: {msg_id})")
                    return True, f"RESEND_{msg_id}"
                else:
                    logger.warning(f"Resend HTTP dispatch failed ({res.status_code}: {res.text}), checking fallbacks...")
            except Exception as resend_err:
                logger.warning(f"Resend HTTP API error: {resend_err}, checking fallbacks...")

        # 3. Option C: Standard SMTP (Works locally on Windows/Linux with open ports)
        if not settings.SMTP_ENABLED or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            logger.info(f"[SIMULATION] Email to {recipient} simulated. Subject: '{subject}'")
            return True, f"SIMULATED_MSG_{int(datetime.now().timestamp())}"

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.EMAIL_FROM or settings.SMTP_USER
            msg["To"] = recipient

            part1 = MIMEText(text_content, "plain")
            part2 = MIMEText(html_content, "html")
            msg.attach(part1)
            msg.attach(part2)

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(msg["From"], [recipient], msg.as_string())

            logger.info(f"Email successfully delivered to {recipient} via SMTP")
            return True, f"SMTP_MSG_{int(datetime.now().timestamp())}"
        except Exception as e:
            err_str = str(e)
            if "101" in err_str or "unreachable" in err_str.lower():
                err_msg = "[Errno 101] Network is unreachable (Render Free Tier blocks outbound SMTP ports 25, 465, 587. Please configure RESEND_API_KEY in Render Environment Variables for HTTPS port 443 dispatch)."
                logger.error(f"Email blocked by cloud host firewall: {err_msg}")
                return False, err_msg
            logger.error(f"Failed to deliver email to {recipient}: {e}")
            return False, err_str

    @classmethod
    def send_student_receipt(
        cls,
        student_email: str,
        student_name: str,
        roll_number: str,
        section: str,
        branch: str,
        topic: str,
        tracking_id: str,
        server_received_at: datetime,
        files_info: List[Dict[str, Any]],
        deadline_classification: str
    ) -> Tuple[bool, str]:
        ist_time = cls.get_ist_time_str(server_received_at)
        subject = f"UHV Assignment Submission Receipt — {tracking_id} ({roll_number})"

        files_html = "".join([
            f"<li><b>{f.get('file_type', '').upper()}</b>: {f.get('expected_filename')} "
            f"({round(f.get('file_size', 0) / (1024*1024), 2)} MB) - Status: {f.get('upload_status')}</li>"
            for f in files_info
        ])

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="background-color: #0284c7; color: white; padding: 15px; border-radius: 6px; text-align: center;">
                <h2 style="margin: 0;">Universal Human Values (UHV) Assignment</h2>
                <p style="margin: 5px 0 0 0;">Official Digital Submission Receipt</p>
            </div>
            
            <p>Dear <b>{student_name}</b>,</p>
            <p>Your assignment presentation submission has been received by the university server. Below are your official submission details:</p>

            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr style="background-color: #f8fafc;"><td style="padding: 8px; border: 1px solid #cbd5e1;"><b>Tracking ID:</b></td><td style="padding: 8px; border: 1px solid #cbd5e1; color: #0284c7; font-weight: bold;">{tracking_id}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #cbd5e1;"><b>University Roll No:</b></td><td style="padding: 8px; border: 1px solid #cbd5e1;">{roll_number}</td></tr>
                <tr style="background-color: #f8fafc;"><td style="padding: 8px; border: 1px solid #cbd5e1;"><b>Branch & Section:</b></td><td style="padding: 8px; border: 1px solid #cbd5e1;">{branch} - Section {section}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #cbd5e1;"><b>Topic:</b></td><td style="padding: 8px; border: 1px solid #cbd5e1;">{topic}</td></tr>
                <tr style="background-color: #f8fafc;"><td style="padding: 8px; border: 1px solid #cbd5e1;"><b>Received Timestamp:</b></td><td style="padding: 8px; border: 1px solid #cbd5e1;">{ist_time}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #cbd5e1;"><b>Deadline Status:</b></td><td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; color: {'#16a34a' if deadline_classification == 'ON_TIME' else '#dc2626'};">{deadline_classification}</td></tr>
            </table>

            <h4 style="margin-top: 20px; color: #334155;">Submitted Files:</h4>
            <ul>
                {files_html}
            </ul>

            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 6px; margin-top: 20px;">
                <p style="margin: 0; font-size: 13px; color: #166534;">
                    <b>Important:</b> Your files are safely stored on the university submission server and queued for archiving into institutional Google Drive. Keep this receipt for your academic records. Please submit the physical copy separately as instructed.
                </p>
            </div>
            
            <p style="font-size: 12px; color: #64748b; margin-top: 25px; text-align: center;">
                Universal Human Values Evaluation Portal &bull; Department of Humanities &amp; Applied Sciences
            </p>
        </div>
        """

        text_content = f"""
Universal Human Values (UHV) Assignment Submission Receipt
Tracking ID: {tracking_id}
Student: {student_name} ({roll_number})
Branch/Section: {branch} - {section}
Topic: {topic}
Received Time: {ist_time}
Deadline Status: {deadline_classification}
Files Received: {len(files_info)}
        """

        return cls.send_smtp_email(student_email, subject, html_content, text_content)

    @classmethod
    def send_teacher_notification(
        cls,
        teacher_email: str,
        student_name: str,
        roll_number: str,
        section: str,
        topic: str,
        tracking_id: str,
        server_received_at: datetime
    ) -> Tuple[bool, str]:
        ist_time = cls.get_ist_time_str(server_received_at)
        subject = f"[UHV Submission Alert] {roll_number} - Section {section} - {student_name}"

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h3 style="color: #0284c7; margin-top: 0;">New UHV Assignment Submission</h3>
            <p>A student has submitted their presentation assignment:</p>
            <ul>
                <li><b>Student Name:</b> {student_name}</li>
                <li><b>Roll Number:</b> {roll_number}</li>
                <li><b>Section:</b> {section}</li>
                <li><b>Topic:</b> {topic}</li>
                <li><b>Submission ID:</b> {tracking_id}</li>
                <li><b>Timestamp:</b> {ist_time}</li>
            </ul>
            <p>Review and evaluation can be accessed from the Administrator Dashboard.</p>
        </div>
        """
        text_content = f"New UHV Submission: {student_name} ({roll_number}), Section {section}, Topic: {topic}, ID: {tracking_id}, Time: {ist_time}"
        return cls.send_smtp_email(teacher_email, subject, html_content, text_content)

email_service = EmailService()
