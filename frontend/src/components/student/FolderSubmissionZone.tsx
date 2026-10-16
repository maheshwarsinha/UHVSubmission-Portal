import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  FileVideo,
  FileSpreadsheet,
  FileText,
  Lock,
  Unlock,
  Copy,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { StudentFormData, ExpectedFilenames, FolderVerificationResult } from '../../types';
import { apiService } from '../../services/api';

interface FolderSubmissionZoneProps {
  student: StudentFormData;
  expectedRules: ExpectedFilenames | null;
  onVerificationChange: (result: FolderVerificationResult | null, folderUrl: string) => void;
}

export const FolderSubmissionZone: React.FC<FolderSubmissionZoneProps> = ({
  student,
  expectedRules,
  onVerificationChange,
}) => {
  const [folderUrl, setFolderUrl] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<FolderVerificationResult | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [copiedExpected, setCopiedExpected] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Countdown timer for cooldown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => {
        setCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const cleanRoll = (student.roll_number || 'YOUR_ROLL_NUMBER').trim().toUpperCase();

  const handleUrlChange = (value: string) => {
    setFolderUrl(value);
    if (!value.trim()) {
      setVerificationResult(null);
      onVerificationChange(null, '');
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      runVerification(value.trim(), true);
    }, 1200);
  };

  const runVerification = async (urlToVerify: string, bypassCooldown: boolean = false) => {
    if (!urlToVerify) return;
    if (cooldown > 0 && !bypassCooldown) return;

    setIsVerifying(true);
    try {
      const result = await apiService.verifyDriveFolder({
        folder_url: urlToVerify,
        roll_number: student.roll_number || '',
        section: student.section || '',
        name: student.name || '',
        category: student.student_category || 'Regular',
      });
      setVerificationResult(result);
      onVerificationChange(result, urlToVerify);
      setCooldown(10); // 10-second exhaustion cooldown
    } catch (err: any) {
      console.error('Folder verification failed:', err);
      const errDetail = err?.response?.data?.detail || err?.message || 'Could not connect to verify folder.';
      const fallbackResult: FolderVerificationResult = {
        is_valid: false,
        folder_id: null,
        folder_url: urlToVerify,
        status: 'INVALID',
        folder_name: null,
        folder_name_matches: false,
        expected_folder_name: cleanRoll,
        has_ppt: false,
        has_video: false,
        has_pdf: false,
        ppt_file: null,
        video_file: null,
        pdf_file: null,
        all_files: [],
        errors: [`Could not connect to verify folder (${errDetail}). Please check your internet connection or click "Check".`],
        checklist: [],
        message: 'Could not connect to verify folder.',
      };
      setVerificationResult(fallbackResult);
      onVerificationChange(fallbackResult, urlToVerify);
      setCooldown(5); // 5-second cooldown on error
    } finally {
      setIsVerifying(false);
    }
  };

  // Re-run verification if student changes their roll number, section, name or category (debounced)
  useEffect(() => {
    if (!folderUrl.trim()) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      runVerification(folderUrl.trim(), true);
    }, 800);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [student.roll_number, student.section, student.name, student.student_category]);

  const copyFolderNameToClipboard = () => {
    navigator.clipboard.writeText(cleanRoll);
    setCopiedExpected(true);
    setTimeout(() => setCopiedExpected(false), 2000);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleUrlChange(text);
      }
    } catch {
      // Ignore clipboard read error
    }
  };

  const fillDemoTestFolder = () => {
    const demoUrl = 'https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
    handleUrlChange(demoUrl);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden mb-8 transition-all">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 px-6 py-5 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Folder className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Step 2: Google Drive Folder Submission</h3>
              <p className="text-blue-100 text-xs">
                Upload your files into a single Google Drive folder and paste the shareable link below
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold backdrop-blur-sm border border-white/20 transition-all text-white self-start sm:self-auto"
          >
            <HelpCircle className="w-3.5 h-3.5 mr-1.5 text-blue-200" />
            How to set up folder?
            {showGuide ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Naming Rule Callout */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-900 uppercase tracking-wider">Required Folder Name</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-base font-bold text-amber-950 bg-white px-2.5 py-0.5 rounded border border-amber-300 shadow-sm">
                    {cleanRoll}
                  </span>
                  <button
                    type="button"
                    onClick={copyFolderNameToClipboard}
                    className="inline-flex items-center text-xs text-amber-800 hover:text-amber-950 font-medium bg-amber-100/70 hover:bg-amber-200/70 px-2 py-1 rounded transition-colors"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    {copiedExpected ? 'Copied!' : 'Copy Name'}
                  </button>
                </div>
                <p className="text-xs text-amber-800 mt-1">
                  Your folder in Google Drive <strong>must be named with your exact Roll Number</strong>.
                </p>
              </div>
            </div>

            {expectedRules && (
              <div className="bg-white/80 rounded-lg p-2.5 border border-amber-200/80 text-xs text-slate-700 md:max-w-xs">
                <p className="font-semibold text-slate-900 mb-1">Expected Files Inside Folder:</p>
                <p className="truncate font-mono text-[11px] text-blue-700">📊 {expectedRules.ppt_filename}</p>
                <p className="truncate font-mono text-[11px] text-purple-700">🎬 {expectedRules.video_filename}</p>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Step-by-Step Guide */}
        {showGuide && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 text-xs text-slate-700 transition-all animate-in fade-in">
            <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center">
              <Info className="w-4 h-4 mr-2 text-indigo-600" />
              How to create and share your submission folder (30 seconds):
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="inline-block w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-center leading-5 mb-1.5">1</span>
                <p className="font-semibold text-slate-900 mb-0.5">Create & Name Folder</p>
                <p className="text-slate-600 text-[11px]">
                  Open Google Drive, click <strong>+ New &gt; New folder</strong>, and name it your Roll Number (<code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700">{cleanRoll}</code>).
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="inline-block w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-center leading-5 mb-1.5">2</span>
                <p className="font-semibold text-slate-900 mb-0.5">Put Video & PPT Inside</p>
                <p className="text-slate-600 text-[11px]">
                  Upload your presentation file (<code className="text-blue-700">.pptx</code>) and presentation video (<code className="text-purple-700">.mp4</code>) into that folder.
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="inline-block w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-center leading-5 mb-1.5">3</span>
                <p className="font-semibold text-slate-900 mb-0.5">Set General Access</p>
                <p className="text-slate-600 text-[11px]">
                  Right-click folder &gt; <strong>Share &gt; Share</strong> &gt; Under General Access, change <strong>Restricted</strong> to <strong>"Anyone with the link"</strong> &gt; Copy link!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Input Box for Folder Link */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-900 mb-2">
            Paste Google Drive Folder Link <span className="text-red-500">*</span>
          </label>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Folder className="w-5 h-5 text-indigo-600" />
            </div>

            <input
              type="url"
              value={folderUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/1ABC...xyz"
              className={`w-full pl-11 pr-28 py-3.5 rounded-xl border text-sm font-medium transition-all shadow-sm focus:ring-4 ${
                verificationResult?.is_valid
                  ? 'border-emerald-500 bg-emerald-50/20 text-slate-900 focus:ring-emerald-100'
                  : verificationResult?.status === 'RESTRICTED'
                  ? 'border-red-400 bg-red-50/20 text-slate-900 focus:ring-red-100'
                  : 'border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-indigo-100'
              }`}
            />

            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1.5">
              {!folderUrl && (
                <button
                  type="button"
                  onClick={handlePaste}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Paste
                </button>
              )}

              {folderUrl && (
                <button
                  type="button"
                  onClick={() => runVerification(folderUrl, true)}
                  disabled={isVerifying || cooldown > 0}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center ${
                    cooldown > 0
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50'
                  }`}
                  title={cooldown > 0 ? `Please wait ${cooldown}s before re-checking` : 'Check folder'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isVerifying ? 'animate-spin' : ''}`} />
                  {isVerifying ? 'Scanning...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Check'}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mt-2">
            <p className="text-xs text-slate-500">
              Supported format: <code className="text-slate-700">https://drive.google.com/drive/folders/...</code>
            </p>
            <div className="flex items-center space-x-3">
              {cooldown > 0 && (
                <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 animate-pulse">
                  ⏱ Anti-spam cooldown: {cooldown}s
                </span>
              )}
              <button
                type="button"
                onClick={fillDemoTestFolder}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2"
              >
                Fill Sample Link
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Scanning State */}
        {isVerifying && (
          <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 flex items-center space-x-3 mb-6 animate-pulse">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
            <div>
              <p className="text-xs font-bold text-blue-900">Scanning Google Drive folder contents...</p>
              <p className="text-[11px] text-blue-700">
                Checking folder name, public access permission, and scanning for PowerPoint (.pptx) & Video (.mp4) files.
              </p>
            </div>
          </div>
        )}

        {/* Verification Results Checklist */}
        {verificationResult && !isVerifying && (
          <div className="space-y-4">
            {/* Main Status Header Pill */}
            <div
              className={`rounded-xl p-4 border flex items-start space-x-3 transition-all ${
                verificationResult.is_valid
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : verificationResult.status === 'RESTRICTED'
                  ? 'bg-red-50 border-red-300 text-red-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              {verificationResult.is_valid ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : verificationResult.status === 'RESTRICTED' ? (
                <Lock className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold">
                    {verificationResult.is_valid
                      ? '✓ Folder Verified & Ready to Submit!'
                      : verificationResult.status === 'RESTRICTED'
                      ? 'Folder Access is Restricted (Private)'
                      : 'Folder Issues Detected — Attention Required'}
                  </h4>
                  {verificationResult.folder_url && (
                    <a
                      href={verificationResult.folder_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center text-xs font-semibold underline ml-2 shrink-0"
                    >
                      Open in Drive <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}
                </div>
                <p className="text-xs mt-1 opacity-90">{verificationResult.message}</p>
              </div>
            </div>

            {/* Live Interactive Checklist Items */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 divide-y divide-slate-200/70">
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Automated Folder Inspection Checklist
              </h5>

              {/* 1. Folder Access Check */}
              <div className="py-2.5 flex items-start justify-between gap-3">
                <div className="flex items-start space-x-2.5">
                  {verificationResult.status === 'ACCESSIBLE' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-900">Public Link Sharing</p>
                    <p className="text-[11px] text-slate-500">
                      {verificationResult.status === 'ACCESSIBLE'
                        ? 'Anyone on the internet with the link can view'
                        : 'Access is restricted or locked to institutional logins'}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    verificationResult.status === 'ACCESSIBLE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {verificationResult.status === 'ACCESSIBLE' ? 'Accessible' : 'Restricted'}
                </span>
              </div>

              {/* 2. Folder Name Check */}
              <div className="py-2.5 flex items-start justify-between gap-3">
                <div className="flex items-start space-x-2.5">
                  {verificationResult.folder_name_matches ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Folder Name matches Roll Number ({cleanRoll})
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Detected Folder Name:{' '}
                      <strong className="text-slate-800">
                        "{verificationResult.folder_name || 'Not detected'}"
                      </strong>
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    verificationResult.folder_name_matches
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {verificationResult.folder_name_matches ? 'Matched' : 'Mismatch'}
                </span>
              </div>

              {/* 3. PowerPoint Presentation Check */}
              <div className="py-2.5 flex items-start justify-between gap-3">
                <div className="flex items-start space-x-2.5">
                  {verificationResult.has_ppt && verificationResult.ppt_file?.is_filename_valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                      <p className="text-xs font-bold text-slate-900">PowerPoint Presentation (.pptx/.ppt)</p>
                    </div>
                    {verificationResult.ppt_file ? (
                      <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                        {verificationResult.ppt_file.name}
                        {verificationResult.ppt_file.is_filename_valid ? (
                          <span className="text-emerald-600 font-sans ml-1 font-semibold">✓ Name Valid</span>
                        ) : (
                          <span className="text-red-500 font-sans ml-1 font-semibold">
                            (Expected: {verificationResult.ppt_file.expected_filename})
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-[11px] text-red-500 font-medium mt-0.5">
                        ❌ Not found in this folder
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    verificationResult.has_ppt && verificationResult.ppt_file?.is_filename_valid
                      ? 'bg-emerald-100 text-emerald-800'
                      : verificationResult.has_ppt
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {verificationResult.has_ppt ? 'Detected' : 'Missing'}
                </span>
              </div>

              {/* 4. Video Presentation Check */}
              <div className="py-2.5 flex items-start justify-between gap-3">
                <div className="flex items-start space-x-2.5">
                  {verificationResult.has_video && verificationResult.video_file?.is_filename_valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <FileVideo className="w-3.5 h-3.5 text-purple-600" />
                      <p className="text-xs font-bold text-slate-900">Video Presentation (.mp4/.mov/.webm)</p>
                    </div>
                    {verificationResult.video_file ? (
                      <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                        {verificationResult.video_file.name}
                        {verificationResult.video_file.is_filename_valid ? (
                          <span className="text-emerald-600 font-sans ml-1 font-semibold">✓ Name Valid</span>
                        ) : (
                          <span className="text-red-500 font-sans ml-1 font-semibold">
                            (Expected: {verificationResult.video_file.expected_filename})
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-[11px] text-red-500 font-medium mt-0.5">
                        ❌ Not found in this folder
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    verificationResult.has_video && verificationResult.video_file?.is_filename_valid
                      ? 'bg-emerald-100 text-emerald-800'
                      : verificationResult.has_video
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {verificationResult.has_video ? 'Detected' : 'Missing'}
                </span>
              </div>

              {/* 5. PDF Check (Optional) */}
              {verificationResult.has_pdf && verificationResult.pdf_file && (
                <div className="py-2.5 flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-600" />
                        <p className="text-xs font-bold text-slate-900">PDF Report (Optional)</p>
                      </div>
                      <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                        {verificationResult.pdf_file.name}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 shrink-0">
                    Included
                  </span>
                </div>
              )}
            </div>

            {/* Error / Correction Callout */}
            {verificationResult.errors && verificationResult.errors.length > 0 && !verificationResult.is_valid && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-900">
                <p className="font-bold flex items-center mb-1.5">
                  <AlertCircle className="w-4 h-4 mr-1.5 text-red-600 shrink-0" />
                  Please resolve the following issues in Google Drive and click "Check":
                </p>
                <ul className="list-disc list-inside space-y-1 ml-1 text-[11px]">
                  {verificationResult.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
