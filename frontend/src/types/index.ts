export interface AssignmentConfig {
  assignment_title: string;
  deadline_iso: string;
  deadline_formatted_ist: string;
  is_open: boolean;
  allowed_sections: string[];
  allowed_branches: string[];
  allowed_years: string[];
  max_ppt_size_mb: number;
  max_pdf_size_mb: number;
  max_video_size_mb: number;
  pdf_optional_allowed: boolean;
  pdf_required: boolean;
  video_allowed_extensions: string[];
  current_time_ist: string;
}

export interface StudentFormData {
  roll_number: string;
  name: string;
  branch: string;
  section: string;
  academic_year: string;
  student_category: string; // Regular | Backlog
  email: string;
  topic: string;
}

export interface ExpectedFilenames {
  base_name: string;
  ppt_filename: string;
  pdf_filename: string;
  video_filename: string;
  naming_rules: string;
}

export interface StagedFile {
  file_type: 'ppt' | 'pdf' | 'video';
  file_token: string;
  expected_filename: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  file_size_mb: number;
  sha256: string;
  source_drive_url?: string;
  source_file_id?: string;
  link_accessibility_status?: string;
}

export interface SubmissionReceipt {
  tracking_id: string;
  submission_id: string;
  student_name: string;
  roll_number: string;
  branch: string;
  section: string;
  academic_year: string;
  student_category: string;
  student_email: string;
  topic: string;
  server_received_at_ist: string;
  server_received_at_utc: string;
  deadline_classification: 'ON_TIME' | 'LATE';
  files: {
    id: string;
    file_type: string;
    original_filename: string;
    expected_filename: string;
    file_size: number;
    mime_type: string;
    upload_status: string;
    verification_status: boolean;
    source_drive_url?: string;
    source_file_id?: string;
    link_accessibility_status?: string;
    drive_file_id?: string;
    admin_drive_url?: string;
  }[];
  source_folder_url?: string;
  folder_name?: string;
  server_storage_verified: boolean;
  gdrive_status: string;
  email_receipt_status: string;
  receipt_message: string;
}

export interface DetectedDriveFile {
  file_id: string;
  name: string;
  file_type: 'ppt' | 'video' | 'pdf';
  size_bytes: number;
  is_filename_valid: boolean;
  expected_filename: string;
  validation_message: string;
  source_drive_url: string;
  link_accessibility_status: string;
}

export interface FolderChecklistItem {
  key: string;
  label: string;
  ok: boolean;
  detail?: string;
  expected?: string;
}

export interface FolderVerificationResult {
  is_valid: boolean;
  folder_id: string | null;
  folder_url: string | null;
  status: 'ACCESSIBLE' | 'RESTRICTED' | 'NOT_FOUND' | 'INVALID';
  folder_name: string | null;
  folder_name_matches: boolean;
  expected_folder_name: string;
  has_ppt: boolean;
  has_video: boolean;
  has_pdf: boolean;
  ppt_file: DetectedDriveFile | null;
  video_file: DetectedDriveFile | null;
  pdf_file: DetectedDriveFile | null;
  all_files: DetectedDriveFile[];
  errors: string[];
  checklist: FolderChecklistItem[];
  message: string;
}

export interface DriveLinkItem {
  url: string;
  file_type: 'ppt' | 'pdf' | 'video';
  is_valid: boolean;
  file_id: string | null;
  status: 'UNVERIFIED' | 'CHECKING' | 'ACCESSIBLE' | 'RESTRICTED' | 'INVALID' | 'NOT_FOUND';
  clean_url?: string;
  message?: string;
}

export interface AdminMetrics {
  total_submissions: number;
  completed_submissions: number;
  drive_pending_submissions: number;
  failed_submissions: number;
  on_time_count: number;
  late_count: number;
  regular_count: number;
  backlog_count: number;
  section_breakdown: Record<string, number>;
  daily_breakdown: Record<string, number>;
  disk_free_gb: number;
  disk_total_gb: number;
  disk_used_percent: number;
  email_sent_today?: number;
  email_daily_limit?: number;
  email_remaining_today?: number;
  email_queued_count?: number;
}

export interface SubmissionItem {
  id: string;
  tracking_id: string;
  student_name: string;
  roll_number: string;
  section: string;
  branch: string;
  category: string;
  email: string;
  ip_address?: string;
  source_folder_url?: string;
  source_folder_id?: string;
  folder_name?: string;
  folder_verification_status?: string;
  topic: string;
  status: string;
  drive_status: string;
  deadline_classification: string;
  server_received_at_ist: string;
  files_count: number;
  drive_completed: boolean;
  files: any[];
}
