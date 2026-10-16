import React, { useState } from 'react';
import { CheckSquare, Square, ShieldCheck, AlertCircle, ArrowRight, Loader2, Folder, ExternalLink } from 'lucide-react';
import { StudentFormData, StagedFile, AssignmentConfig } from '../../types';

interface ReviewConfirmationProps {
  formData: StudentFormData;
  stagedFiles: {
    ppt: StagedFile | null;
    pdf: StagedFile | null;
    video: StagedFile | null;
  };
  folderUrl?: string;
  folderName?: string;
  config: AssignmentConfig | null;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const ReviewConfirmation: React.FC<ReviewConfirmationProps> = ({
  formData,
  stagedFiles,
  folderUrl,
  folderName,
  config,
  onSubmit,
  isSubmitting,
}) => {
  const [declared, setDeclared] = useState<boolean>(false);

  const canSubmit = Boolean(
    formData.name &&
    formData.roll_number &&
    formData.section &&
    formData.topic &&
    stagedFiles.ppt &&
    stagedFiles.video &&
    (!config?.pdf_required || stagedFiles.pdf) &&
    declared &&
    !isSubmitting
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-8 mb-6 sm:mb-8">
      <div className="pb-4 sm:pb-6 border-b border-slate-100">
        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
          Step 4 &bull; Final Verification
        </span>
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-2">
          Review &amp; Finalize Submission
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Carefully review your details before final transmission to the university evaluation archive.
        </p>
      </div>

      {/* Review Details Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-5 sm:mt-6 bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Student Summary
          </h4>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <dt className="text-slate-500">Student Name:</dt>
              <dd className="font-semibold text-slate-900">{formData.name || '—'}</dd>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <dt className="text-slate-500">Roll Number:</dt>
              <dd className="font-mono font-bold text-slate-900">{formData.roll_number || '—'}</dd>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <dt className="text-slate-500">Branch &amp; Section:</dt>
              <dd className="font-semibold text-slate-900">
                {formData.branch ? `${formData.branch} - ${formData.section}` : '—'}
              </dd>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <dt className="text-slate-500">Category &amp; Year:</dt>
              <dd className="font-semibold text-slate-900">
                {formData.student_category} ({formData.academic_year})
              </dd>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <dt className="text-slate-500">Official Email:</dt>
              <dd className="font-semibold text-slate-900">{formData.email || '—'}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-slate-500">UHV Topic:</dt>
              <dd className="font-semibold text-slate-900 text-right max-w-[200px] truncate">{formData.topic || '—'}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Attached Files &amp; Validation Status
          </h4>
          <div className="space-y-2.5 text-xs">
            {/* Google Drive Folder Banner */}
            {folderUrl && (
              <div className="p-2.5 rounded-lg border border-indigo-200 bg-indigo-50/70 flex justify-between items-center">
                <div className="flex items-center space-x-2 min-w-0 pr-2">
                  <Folder className="w-4 h-4 text-indigo-700 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-indigo-950 truncate">Folder: {folderName || formData.roll_number}</p>
                    <a
                      href={folderUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-indigo-700 hover:underline flex items-center space-x-1 mt-0.5 truncate"
                    >
                      <span>Drive Folder ↗</span>
                    </a>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                  Folder Verified ✓
                </span>
              </div>
            )}

            {/* PPT Status */}
            <div className="p-2.5 rounded-lg border bg-white flex justify-between items-center">
              <div className="min-w-0 pr-2">
                <p className="font-semibold text-slate-800">PowerPoint Presentation</p>
                <p className="font-mono text-[11px] text-slate-500 truncate">
                  {stagedFiles.ppt ? stagedFiles.ppt.expected_filename : 'Not uploaded'}
                </p>
                {stagedFiles.ppt?.source_drive_url && (
                  <a
                    href={stagedFiles.ppt.source_drive_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-brand-600 hover:underline flex items-center space-x-1 mt-0.5 truncate"
                  >
                    <span>Drive Link: {stagedFiles.ppt.source_drive_url.substring(0, 35)}... ↗</span>
                  </a>
                )}
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                  stagedFiles.ppt
                    ? (stagedFiles.ppt.link_accessibility_status === 'RESTRICTED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800')
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {stagedFiles.ppt
                  ? (stagedFiles.ppt.source_drive_url
                      ? (stagedFiles.ppt.link_accessibility_status === 'RESTRICTED' ? 'Drive (Restricted ⚠️)' : 'Drive Link ✓')
                      : `${stagedFiles.ppt.file_size_mb} MB ✓`)
                  : 'Missing'}
              </span>
            </div>

            {/* Video Status */}
            <div className="p-2.5 rounded-lg border bg-white flex justify-between items-center">
              <div className="min-w-0 pr-2">
                <p className="font-semibold text-slate-800">Presentation Video</p>
                <p className="font-mono text-[11px] text-slate-500 truncate">
                  {stagedFiles.video ? stagedFiles.video.expected_filename : 'Not uploaded'}
                </p>
                {stagedFiles.video?.source_drive_url && (
                  <a
                    href={stagedFiles.video.source_drive_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-brand-600 hover:underline flex items-center space-x-1 mt-0.5 truncate"
                  >
                    <span>Drive Link: {stagedFiles.video.source_drive_url.substring(0, 35)}... ↗</span>
                  </a>
                )}
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                  stagedFiles.video
                    ? (stagedFiles.video.link_accessibility_status === 'RESTRICTED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800')
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {stagedFiles.video
                  ? (stagedFiles.video.source_drive_url
                      ? (stagedFiles.video.link_accessibility_status === 'RESTRICTED' ? 'Drive (Restricted ⚠️)' : 'Drive Link ✓')
                      : `${stagedFiles.video.file_size_mb} MB ✓`)
                  : 'Missing'}
              </span>
            </div>

            {/* PDF Status */}
            <div className="p-2.5 rounded-lg border bg-white flex justify-between items-center">
              <div className="min-w-0 pr-2">
                <p className="font-semibold text-slate-800">PDF Companion (Optional)</p>
                <p className="font-mono text-[11px] text-slate-500 truncate">
                  {stagedFiles.pdf ? stagedFiles.pdf.expected_filename : 'None (Optional)'}
                </p>
                {stagedFiles.pdf?.source_drive_url && (
                  <a
                    href={stagedFiles.pdf.source_drive_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-brand-600 hover:underline flex items-center space-x-1 mt-0.5 truncate"
                  >
                    <span>Drive Link: {stagedFiles.pdf.source_drive_url.substring(0, 35)}... ↗</span>
                  </a>
                )}
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                  stagedFiles.pdf ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {stagedFiles.pdf
                  ? (stagedFiles.pdf.source_drive_url ? 'Drive Link ✓' : `${stagedFiles.pdf.file_size_mb} MB ✓`)
                  : 'Optional'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory Notice Box */}
      <div className="mt-5 p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
        <div className="flex items-center font-bold text-amber-800 mb-1">
          <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
          Important University Policy:
        </div>
        "Please verify that your university roll number, section, name, topic, and filenames are correct. Once your submission has been finalized, any replacement must follow the university's resubmission policy."
      </div>

      {/* Declaration Checkbox */}
      <div className="mt-5 flex items-start space-x-3 cursor-pointer select-none" onClick={() => setDeclared(!declared)}>
        <div className="mt-0.5 text-brand-600 shrink-0">
          {declared ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-400" />}
        </div>
        <p className="text-xs text-slate-700 leading-normal">
          I declare that the submitted files belong to me, comply with the UHV presentation guidelines, and that my PowerPoint and face are clearly visible in the video. I understand that duplicate uploads will be rejected.
        </p>
      </div>

      {/* Submit Action */}
      <div className="mt-6 flex flex-col sm:flex-row justify-end items-center gap-4 pt-5 border-t border-slate-100">
        {!canSubmit && (
          <span className="text-xs text-slate-400 text-center sm:text-right">
            Ensure all required steps and declaration are complete.
          </span>
        )}
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className={`flex items-center justify-center space-x-2 px-8 py-3.5 rounded-xl font-bold text-sm shadow-md transition-all w-full sm:w-auto ${
            canSubmit
              ? 'bg-brand-600 hover:bg-brand-700 text-white cursor-pointer shadow-brand-500/25'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Finalizing Submission...</span>
            </>
          ) : (
            <>
              <span>Submit Assignment Now</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
