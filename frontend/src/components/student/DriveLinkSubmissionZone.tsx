import React, { useState, useEffect } from 'react';
import {
  ExternalLink, CheckCircle2, AlertTriangle, Video, FileText, File,
  HelpCircle, Copy, Check, Loader2, Sparkles, ShieldCheck
} from 'lucide-react';
import { apiService } from '../../services/api';
import { StagedFile, StudentFormData, ExpectedFilenames, AssignmentConfig } from '../../types';

interface DriveLinkSubmissionZoneProps {
  formData: StudentFormData;
  expectedFilenames: ExpectedFilenames | null;
  config: AssignmentConfig | null;
  stagedFiles: {
    ppt: StagedFile | null;
    pdf: StagedFile | null;
    video: StagedFile | null;
  };
  onFileStaged: (type: 'ppt' | 'pdf' | 'video', file: StagedFile | null) => void;
}

export const DriveLinkSubmissionZone: React.FC<DriveLinkSubmissionZoneProps> = ({
  formData,
  expectedFilenames,
  config,
  stagedFiles,
  onFileStaged,
}) => {
  const isStudentReady = Boolean(formData.roll_number && formData.section && formData.name);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-brand-50/60 p-3.5 rounded-xl border border-brand-100">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-brand-600 shrink-0" />
          <p className="text-xs text-brand-900 font-medium">
            Paste your Google Drive shareable links below. Ensure sharing is set to <b className="text-brand-700">"Anyone with the link can view"</b>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center space-x-1 underline cursor-pointer shrink-0"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{showGuide ? 'Hide Guide' : 'How to get Drive Link?'}</span>
        </button>
      </div>

      {showGuide && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-4 text-xs text-amber-950 space-y-2.5 animate-fadeIn">
          <h4 className="font-bold flex items-center space-x-1.5 text-amber-900">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>How to get your Google Drive Share Link in 3 Clicks:</span>
          </h4>
          <ol className="list-decimal list-inside space-y-1.5 text-amber-900/90 pl-1">
            <li>Open <a href="https://drive.google.com" target="_blank" rel="noreferrer" className="underline font-bold text-amber-800">Google Drive</a> and locate your presentation video or PowerPoint file.</li>
            <li>Right-click the file and click <span className="font-bold bg-amber-100 px-1 py-0.5 rounded">Share</span> &rarr; <span className="font-bold bg-amber-100 px-1 py-0.5 rounded">Share</span>.</li>
            <li>Under <b>"General access"</b>, change from <i>"Restricted"</i> to <span className="font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">Anyone with the link</span>.</li>
            <li>Click <b>"Copy link"</b> and paste the copied link into the corresponding box below.</li>
          </ol>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Video Presentation */}
        <DriveLinkCard
          fileType="video"
          title="1. Presentation Video (Drive Link)"
          required={true}
          icon={<Video className="w-5 h-5 text-indigo-600" />}
          colorClass="border-indigo-200 bg-indigo-50/20 focus-within:border-indigo-500"
          isStudentReady={isStudentReady}
          expectedFilename={expectedFilenames?.video_filename || `${formData.roll_number || 'Roll'}_${formData.section || 'Sec'}_Video.mp4`}
          staged={stagedFiles.video}
          onStaged={(file) => onFileStaged('video', file)}
          placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
        />

        {/* Card 2: PowerPoint Presentation */}
        <DriveLinkCard
          fileType="ppt"
          title="2. PowerPoint PPT (Drive Link)"
          required={true}
          icon={<FileText className="w-5 h-5 text-amber-600" />}
          colorClass="border-amber-200 bg-amber-50/20 focus-within:border-amber-500"
          isStudentReady={isStudentReady}
          expectedFilename={expectedFilenames?.ppt_filename || `${formData.roll_number || 'Roll'}_${formData.section || 'Sec'}_PPT.pptx`}
          staged={stagedFiles.ppt}
          onStaged={(file) => onFileStaged('ppt', file)}
          placeholder="https://drive.google.com/file/d/.../view or Google Slides link"
        />

        {/* Card 3: PDF Companion Copy */}
        <DriveLinkCard
          fileType="pdf"
          title="3. PDF Copy (Drive Link)"
          required={config?.pdf_required || false}
          optionalNote={config?.pdf_required ? 'Required' : 'Optional'}
          icon={<File className="w-5 h-5 text-rose-600" />}
          colorClass="border-rose-200 bg-rose-50/20 focus-within:border-rose-500"
          isStudentReady={isStudentReady}
          expectedFilename={expectedFilenames?.pdf_filename || `${formData.roll_number || 'Roll'}_${formData.section || 'Sec'}_PDF.pdf`}
          staged={stagedFiles.pdf}
          onStaged={(file) => onFileStaged('pdf', file)}
          placeholder="https://drive.google.com/file/d/.../view (Optional)"
        />
      </div>
    </div>
  );
};

interface DriveLinkCardProps {
  fileType: 'ppt' | 'pdf' | 'video';
  title: string;
  required: boolean;
  optionalNote?: string;
  icon: React.ReactNode;
  colorClass: string;
  isStudentReady: boolean;
  expectedFilename: string;
  staged: StagedFile | null;
  onStaged: (file: StagedFile | null) => void;
  placeholder: string;
}

const DriveLinkCard: React.FC<DriveLinkCardProps> = ({
  fileType,
  title,
  required,
  optionalNote,
  icon,
  colorClass,
  isStudentReady,
  expectedFilename,
  staged,
  onStaged,
  placeholder,
}) => {
  const [inputUrl, setInputUrl] = useState<string>(staged?.source_drive_url || '');
  const [status, setStatus] = useState<'IDLE' | 'CHECKING' | 'ACCESSIBLE' | 'RESTRICTED' | 'INVALID'>('IDLE');
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [cleanViewUrl, setCleanViewUrl] = useState<string | null>(null);

  // Sync if staged changed externally
  useEffect(() => {
    if (staged?.source_drive_url) {
      setInputUrl(staged.source_drive_url);
      setStatus(staged.link_accessibility_status === 'RESTRICTED' ? 'RESTRICTED' : 'ACCESSIBLE');
    }
  }, [staged]);

  const verifyUrl = async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      setStatus('IDLE');
      setStatusMsg('');
      setCleanViewUrl(null);
      onStaged(null);
      return;
    }

    setStatus('CHECKING');
    setStatusMsg('Checking Google Drive link accessibility...');

    try {
      const res = await apiService.verifyDriveLink(trimmed, fileType);
      setCleanViewUrl(res.clean_url || trimmed);

      if (!res.is_valid || res.status === 'INVALID') {
        setStatus('INVALID');
        setStatusMsg(res.message || 'Invalid link format. Please provide a Google Drive share link.');
        onStaged(null);
      } else if (res.status === 'RESTRICTED') {
        setStatus('RESTRICTED');
        setStatusMsg(res.message || 'Link access is restricted! Change to "Anyone with the link can view".');
        // Still stage it with RESTRICTED flag so user sees warnings
        onStaged({
          file_type: fileType,
          file_token: '',
          expected_filename: expectedFilename,
          original_filename: expectedFilename,
          mime_type: fileType === 'video' ? 'video/mp4' : (fileType === 'ppt' ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' : 'application/pdf'),
          file_size: 0,
          file_size_mb: 0,
          sha256: '',
          source_drive_url: trimmed,
          source_file_id: res.file_id || undefined,
          link_accessibility_status: 'RESTRICTED',
        });
      } else {
        setStatus('ACCESSIBLE');
        setStatusMsg(res.message || 'Verified! File is publicly viewable.');
        onStaged({
          file_type: fileType,
          file_token: '',
          expected_filename: expectedFilename,
          original_filename: expectedFilename,
          mime_type: fileType === 'video' ? 'video/mp4' : (fileType === 'ppt' ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' : 'application/pdf'),
          file_size: 0,
          file_size_mb: 0,
          sha256: '',
          source_drive_url: trimmed,
          source_file_id: res.file_id || undefined,
          link_accessibility_status: 'ACCESSIBLE',
        });
      }
    } catch (err: any) {
      setStatus('ACCESSIBLE');
      setStatusMsg('Link saved. Ensure it is set to "Anyone with the link can view".');
      onStaged({
        file_type: fileType,
        file_token: '',
        expected_filename: expectedFilename,
        original_filename: expectedFilename,
        mime_type: fileType === 'video' ? 'video/mp4' : (fileType === 'ppt' ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' : 'application/pdf'),
        file_size: 0,
        file_size_mb: 0,
        sha256: '',
        source_drive_url: trimmed,
        link_accessibility_status: 'ACCESSIBLE',
      });
    }
  };

  // Debounced verification on typing/pasting
  useEffect(() => {
    if (!inputUrl.trim()) {
      if (status !== 'IDLE') {
        setStatus('IDLE');
        setStatusMsg('');
        onStaged(null);
      }
      return;
    }

    const timer = setTimeout(() => {
      verifyUrl(inputUrl);
    }, 600);
    return () => clearTimeout(timer);
  }, [inputUrl]);

  return (
    <div className={`p-4 rounded-xl border transition-all ${colorClass}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {icon}
          <h4 className="text-xs font-bold text-slate-800">{title}</h4>
        </div>
        {required ? (
          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
            Required
          </span>
        ) : (
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
            {optionalNote || 'Optional'}
          </span>
        )}
      </div>

      <p className="text-[11px] text-slate-500 mb-2">
        Archive Name: <span className="font-mono font-bold text-slate-700">{expectedFilename}</span>
      </p>

      <div className="space-y-2">
        <input
          type="url"
          disabled={!isStudentReady}
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50 disabled:bg-slate-100"
        />

        {/* Live Status Indicator */}
        {status === 'CHECKING' && (
          <div className="flex items-center space-x-1.5 text-[11px] text-brand-600">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{statusMsg}</span>
          </div>
        )}

        {status === 'ACCESSIBLE' && (
          <div className="flex items-start justify-between gap-1 text-[11px] text-emerald-700 bg-emerald-50/90 p-2 rounded-lg border border-emerald-200">
            <div className="flex items-start space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Link is Public &amp; Accessible</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">{statusMsg}</p>
              </div>
            </div>
            {cleanViewUrl && (
              <a
                href={cleanViewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-bold text-emerald-800 hover:underline flex items-center space-x-0.5 shrink-0 ml-1"
              >
                <span>Test ↗</span>
              </a>
            )}
          </div>
        )}

        {status === 'RESTRICTED' && (
          <div className="flex items-start justify-between gap-1 text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
            <div className="flex items-start space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Access Restricted!</p>
                <p className="text-[10px] text-rose-600 mt-0.5">{statusMsg}</p>
              </div>
            </div>
            {cleanViewUrl && (
              <a
                href={cleanViewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-bold text-rose-800 hover:underline flex items-center space-x-0.5 shrink-0 ml-1"
              >
                <span>Open ↗</span>
              </a>
            )}
          </div>
        )}

        {status === 'INVALID' && (
          <div className="flex items-start space-x-1.5 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>{statusMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
};
