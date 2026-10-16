import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AssignmentBanner } from '../components/student/AssignmentBanner';
import { StudentDetailsForm } from '../components/student/StudentDetailsForm';
import { ExpectedFilenameCard } from '../components/student/ExpectedFilenameCard';
import { FolderSubmissionZone } from '../components/student/FolderSubmissionZone';
import { ReviewConfirmation } from '../components/student/ReviewConfirmation';
import { SubmissionReceipt } from '../components/student/SubmissionReceipt';
import { apiService } from '../services/api';
import {
  AssignmentConfig,
  StudentFormData,
  ExpectedFilenames,
  StagedFile,
  SubmissionReceipt as ReceiptType,
  FolderVerificationResult
} from '../types';

export const LandingPage: React.FC = () => {
  const [config, setConfig] = useState<AssignmentConfig | null>(null);
  const [formData, setFormData] = useState<StudentFormData>({
    roll_number: '',
    name: '',
    branch: 'Computer Science and Engineering',
    section: 'CSE1',
    academic_year: '3rd Year',
    student_category: 'Regular',
    email: '',
    topic: '',
  });

  const [expectedFilenames, setExpectedFilenames] = useState<ExpectedFilenames | null>(null);
  const [folderVerification, setFolderVerification] = useState<FolderVerificationResult | null>(null);
  const [folderUrl, setFolderUrl] = useState<string>('');
  const [stagedFiles, setStagedFiles] = useState<{
    ppt: StagedFile | null;
    pdf: StagedFile | null;
    video: StagedFile | null;
  }>({
    ppt: null,
    pdf: null,
    video: null,
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [receipt, setReceipt] = useState<ReceiptType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  // Load public assignment info
  useEffect(() => {
    apiService.getAssignmentInfo()
      .then(setConfig)
      .catch((err) => console.error('Failed to load assignment config', err));
  }, []);

  // Check if roll number has already submitted
  useEffect(() => {
    const roll = formData.roll_number.trim();
    if (roll.length >= 4) {
      const timer = setTimeout(() => {
        apiService.checkRollSubmission(roll)
          .then((res) => {
            if (res.already_submitted) {
              setDuplicateError(
                `A submission has already been recorded for University Roll Number "${roll}" (Tracking ID: ${res.tracking_id}). Each student is only permitted one submission.`
              );
            } else {
              setDuplicateError(null);
            }
          })
          .catch(() => setDuplicateError(null));
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setDuplicateError(null);
    }
  }, [formData.roll_number]);

  // Update expected filenames whenever roll, section, name, or student_category changes
  useEffect(() => {
    if (formData.roll_number.trim() && formData.section.trim() && formData.name.trim()) {
      apiService.getExpectedFilenames(formData.roll_number, formData.section, formData.name, formData.student_category)
        .then(setExpectedFilenames)
        .catch((err) => console.error('Error generating expected filenames', err));
    } else {
      setExpectedFilenames(null);
    }
  }, [formData.roll_number, formData.section, formData.name, formData.student_category]);

  const handleFieldChange = (field: keyof StudentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFolderVerified = (result: FolderVerificationResult | null, url: string) => {
    setFolderVerification(result);
    setFolderUrl(url);

    if (result) {
      setStagedFiles({
        ppt: result.ppt_file
          ? {
              file_type: 'ppt',
              file_token: result.ppt_file.file_id || 'ppt_token',
              expected_filename: result.ppt_file.expected_filename,
              original_filename: result.ppt_file.name,
              mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
              file_size: result.ppt_file.size_bytes,
              file_size_mb: Number((result.ppt_file.size_bytes / (1024 * 1024)).toFixed(2)),
              sha256: '',
              source_drive_url: result.ppt_file.source_drive_url,
              source_file_id: result.ppt_file.file_id,
              link_accessibility_status: result.ppt_file.link_accessibility_status,
            }
          : null,
        video: result.video_file
          ? {
              file_type: 'video',
              file_token: result.video_file.file_id || 'video_token',
              expected_filename: result.video_file.expected_filename,
              original_filename: result.video_file.name,
              mime_type: 'video/mp4',
              file_size: result.video_file.size_bytes,
              file_size_mb: Number((result.video_file.size_bytes / (1024 * 1024)).toFixed(2)),
              sha256: '',
              source_drive_url: result.video_file.source_drive_url,
              source_file_id: result.video_file.file_id,
              link_accessibility_status: result.video_file.link_accessibility_status,
            }
          : null,
        pdf: result.pdf_file
          ? {
              file_type: 'pdf',
              file_token: result.pdf_file.file_id || 'pdf_token',
              expected_filename: result.pdf_file.expected_filename,
              original_filename: result.pdf_file.name,
              mime_type: 'application/pdf',
              file_size: result.pdf_file.size_bytes,
              file_size_mb: Number((result.pdf_file.size_bytes / (1024 * 1024)).toFixed(2)),
              sha256: '',
              source_drive_url: result.pdf_file.source_drive_url,
              source_file_id: result.pdf_file.file_id,
              link_accessibility_status: result.pdf_file.link_accessibility_status,
            }
          : null,
      });
    } else {
      setStagedFiles({ ppt: null, pdf: null, video: null });
    }
  };

  const handleFinalSubmit = async () => {
    if (duplicateError) {
      alert(duplicateError);
      return;
    }

    if (!folderVerification?.is_valid) {
      alert(folderVerification?.message || 'Please provide a valid and accessible Google Drive folder link before submitting.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const filesToSubmit = [stagedFiles.ppt, stagedFiles.video, stagedFiles.pdf].filter(Boolean) as StagedFile[];
    const idempotencyKey = `sub_${formData.roll_number}_${formData.section}_${Date.now()}`;

    try {
      const response = await apiService.submitAssignment({
        student: {
          roll_number: formData.roll_number,
          name: formData.name,
          branch: formData.branch,
          section: formData.section,
          academic_year: formData.academic_year,
          student_category: formData.student_category,
          email: formData.email,
        },
        topic: formData.topic,
        declaration_confirmed: true,
        files: filesToSubmit,
        source_folder_url: folderUrl,
        source_folder_id: folderVerification.folder_id,
        folder_name: folderVerification.folder_name,
        folder_verification_status: folderVerification.status,
        idempotency_key: idempotencyKey,
      });

      setReceipt(response);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Submission failed. Please check inputs.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (receipt) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <SubmissionReceipt receipt={receipt} onNewSubmission={() => setReceipt(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* 1. Official Banner & Rules */}
      <AssignmentBanner config={config} />

      {/* Global Error Alert if submission rejected */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
          Error: {errorMessage}
        </div>
      )}

      {/* Duplicate Submission Warning */}
      {duplicateError && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-sm font-semibold flex items-center space-x-2.5 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{duplicateError}</span>
        </div>
      )}

      {/* 2. Step 1: Student Information */}
      <StudentDetailsForm
        formData={formData}
        onChange={handleFieldChange}
        config={config}
      />

      {/* 3. Step 2: Expected Filenames Display */}
      <ExpectedFilenameCard
        expected={expectedFilenames}
        formData={formData}
        pdfOptionalAllowed={config?.pdf_optional_allowed}
      />

      {/* 4. Step 3: Google Drive Single Folder Submission Zone */}
      <FolderSubmissionZone
        student={formData}
        expectedRules={expectedFilenames}
        onVerificationChange={handleFolderVerified}
      />

      {/* 5. Step 4: Final Review & Confirmation */}
      <ReviewConfirmation
        formData={formData}
        stagedFiles={stagedFiles}
        folderUrl={folderUrl}
        folderName={folderVerification?.folder_name || formData.roll_number}
        config={config}
        onSubmit={handleFinalSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};
