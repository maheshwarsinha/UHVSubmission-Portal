import React, { useRef, useState } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, FileText, Video, File, X, RefreshCw, Link as LinkIcon, HardDrive } from 'lucide-react';
import { useChunkedUpload } from '../../hooks/useChunkedUpload';
import { StagedFile, StudentFormData, AssignmentConfig, ExpectedFilenames } from '../../types';
import { DriveLinkSubmissionZone } from './DriveLinkSubmissionZone';

interface FileDropzoneProps {
  formData: StudentFormData;
  expectedFilenames?: ExpectedFilenames | null;
  config: AssignmentConfig | null;
  onFileStaged: (type: 'ppt' | 'pdf' | 'video', file: StagedFile | null) => void;
  stagedFiles: {
    ppt: StagedFile | null;
    pdf: StagedFile | null;
    video: StagedFile | null;
  };
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  formData,
  expectedFilenames = null,
  config,
  onFileStaged,
  stagedFiles,
}) => {
  const isStudentReady = Boolean(formData.roll_number && formData.section && formData.name);
  const [submissionMode, setSubmissionMode] = useState<'drive' | 'direct'>('drive');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-8 mb-6 sm:mb-8">
      <div className="pb-4 sm:pb-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
            Step 3 &bull; Assignment Submission
          </span>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-2">
            Submit Presentation Files
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Choose your preferred submission method: Google Drive Links or Direct File Upload.
          </p>
        </div>

        {/* Submission Mode Toggle */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setSubmissionMode('drive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              submissionMode === 'drive'
                ? 'bg-white text-brand-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Google Drive Links (Recommended)</span>
          </button>
          <button
            type="button"
            onClick={() => setSubmissionMode('direct')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              submissionMode === 'direct'
                ? 'bg-white text-brand-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Direct Upload</span>
          </button>
        </div>
      </div>

      {!isStudentReady && (
        <div className="mt-4 text-xs text-amber-700 bg-amber-50 px-3.5 py-2 rounded-lg border border-amber-200 font-medium flex items-center">
          <AlertTriangle className="w-4 h-4 mr-2 shrink-0" />
          <span>Please complete your Student Details (Step 1 above) first to enable file submission.</span>
        </div>
      )}

      {submissionMode === 'drive' ? (
        <div className="mt-5 sm:mt-6">
          <DriveLinkSubmissionZone
            formData={formData}
            expectedFilenames={expectedFilenames}
            config={config}
            stagedFiles={stagedFiles}
            onFileStaged={onFileStaged}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-5 sm:mt-6">
        {/* Card A: PowerPoint */}
        <UploadZoneCard
          title="A. PowerPoint Presentation"
          required={true}
          fileType="ppt"
          allowedExts=".pptx, .ppt"
          maxSizeMb={config?.max_ppt_size_mb || 50}
          icon={<FileText className="w-6 h-6 text-amber-600" />}
          colorClass="border-amber-200 bg-amber-50/20"
          isStudentReady={isStudentReady}
          formData={formData}
          staged={stagedFiles.ppt}
          onStaged={(file) => onFileStaged('ppt', file)}
        />

        {/* Card B: PDF Presentation */}
        <UploadZoneCard
          title="B. PDF Companion Copy"
          required={config?.pdf_required || false}
          optionalNote={config?.pdf_required ? 'Required' : 'Optional'}
          fileType="pdf"
          allowedExts=".pdf"
          maxSizeMb={config?.max_pdf_size_mb || 25}
          icon={<File className="w-6 h-6 text-rose-600" />}
          colorClass="border-rose-200 bg-rose-50/20"
          isStudentReady={isStudentReady}
          formData={formData}
          staged={stagedFiles.pdf}
          onStaged={(file) => onFileStaged('pdf', file)}
        />

        {/* Card C: Presentation Video */}
        <UploadZoneCard
          title="C. Presentation Video"
          required={true}
          fileType="video"
          allowedExts=".mp4, .mov, .webm"
          maxSizeMb={config?.max_video_size_mb || 500}
          icon={<Video className="w-6 h-6 text-indigo-600" />}
          colorClass="border-indigo-200 bg-indigo-50/20"
          isStudentReady={isStudentReady}
          formData={formData}
          staged={stagedFiles.video}
          onStaged={(file) => onFileStaged('video', file)}
        />
      </div>
    )}
  </div>
);
};

interface UploadZoneCardProps {
  title: string;
  required: boolean;
  optionalNote?: string;
  fileType: 'ppt' | 'pdf' | 'video';
  allowedExts: string;
  maxSizeMb: number;
  icon: React.ReactNode;
  colorClass: string;
  isStudentReady: boolean;
  formData: StudentFormData;
  staged: StagedFile | null;
  onStaged: (file: StagedFile | null) => void;
}

const UploadZoneCard: React.FC<UploadZoneCardProps> = ({
  title,
  required,
  optionalNote,
  fileType,
  allowedExts,
  maxSizeMb,
  icon,
  colorClass,
  isStudentReady,
  formData,
  staged,
  onStaged,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const { uploadFile, progress, status, errorMessage, reset } = useChunkedUpload();

  const processFile = async (file: File) => {
    // Local file size check
    if (file.size > maxSizeMb * 1024 * 1024) {
      alert(`File exceeds maximum permitted size of ${maxSizeMb} MB.`);
      return;
    }

    const uploadedStaged = await uploadFile(file, {
      fileType,
      rollNumber: formData.roll_number,
      section: formData.section,
      studentName: formData.name,
      category: formData.student_category,
    });

    if (uploadedStaged) {
      onStaged(uploadedStaged);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isStudentReady) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!isStudentReady) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleRemove = () => {
    reset();
    onStaged(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`rounded-xl border p-5 flex flex-col justify-between transition-all ${colorClass}`}>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
          <div className="flex items-center space-x-2.5">
            {icon}
            <div>
              <h4 className="text-sm font-bold text-slate-900">{title}</h4>
              <p className="text-[11px] text-slate-500">
                Max {maxSizeMb} MB &bull; {allowedExts}
              </p>
            </div>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              required
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {optionalNote || (required ? 'Required' : 'Optional')}
          </span>
        </div>

        {/* Content State */}
        <div className="mt-4">
          {staged ? (
            <div className="bg-white p-3.5 rounded-xl border border-emerald-300 shadow-2xs">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 break-all">
                      {staged.expected_filename}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {staged.file_size_mb} MB &bull; Verified
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemove}
                  className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-2 text-[10px] text-slate-400 font-mono truncate">
                SHA-256: {staged.sha256}
              </div>
            </div>
          ) : status === 'uploading' || status === 'assembling' ? (
            <div className="bg-white p-4 rounded-xl border border-brand-300 shadow-2xs">
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>{status === 'assembling' ? 'Verifying & Stitching...' : 'Streaming chunk...'}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-brand-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 text-center animate-pulse">
                {status === 'assembling' ? 'Calculating SHA-256 checksum...' : 'Non-blocking upload in progress...'}
              </p>
            </div>
          ) : (
            <div>
              <div
                onClick={() => {
                  if (isStudentReady) fileInputRef.current?.click();
                }}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-brand-600 bg-brand-100/70 scale-[1.02] shadow-sm ring-2 ring-brand-400/50'
                    : isStudentReady
                    ? 'border-slate-300 hover:border-brand-500 hover:bg-white/80 bg-white/40'
                    : 'border-slate-200 bg-slate-100/50 cursor-not-allowed opacity-60'
                }`}
              >
                <UploadCloud className={`w-8 h-8 mx-auto mb-2 transition-transform ${isDragging ? 'text-brand-600 scale-110 animate-bounce' : 'text-slate-400'}`} />
                <p className="text-xs font-semibold text-slate-700">
                  {isDragging ? 'Release to drop file here!' : isStudentReady ? 'Click to select file' : 'Fill details in Step 1 first'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {isDragging ? 'Drop will start verification immediately' : 'Drag and drop or browse'}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={allowedExts}
                onChange={handleFileSelect}
                className="hidden"
                disabled={!isStudentReady}
              />
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <div className="font-bold flex items-center mb-0.5">
                <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0" />
                Upload Rejected:
              </div>
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}
        </div>
      </div>

      {staged && (
        <button
          onClick={handleRemove}
          className="mt-4 w-full py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors"
        >
          Replace / Re-upload
        </button>
      )}
    </div>
  );
};
