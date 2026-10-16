import React, { useState } from 'react';
import { Copy, Check, Info, Lock, Unlock, ArrowUp, Sparkles } from 'lucide-react';
import { ExpectedFilenames, StudentFormData } from '../../types';

interface ExpectedFilenameCardProps {
  expected: ExpectedFilenames | null;
  formData?: StudentFormData;
  pdfOptionalAllowed?: boolean;
}

export const ExpectedFilenameCard: React.FC<ExpectedFilenameCardProps> = ({
  expected,
  formData,
  pdfOptionalAllowed = true,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Determine if required student details are filled in Step 1
  const hasRoll = Boolean(formData?.roll_number?.trim());
  const isBacklog = formData?.student_category?.toLowerCase() === 'backlog';
  const hasSection = Boolean(isBacklog || formData?.section?.trim());
  const hasName = Boolean(formData?.name?.trim());
  const isPersonalized = hasRoll && hasSection && hasName;

  // Dynamic names
  const roll = formData?.roll_number?.trim() || '230101';
  const sec = isBacklog ? 'Backlog' : (formData?.section?.trim() || 'A');
  const rawName = formData?.name?.trim() ? formData.name.trim().replace(/\s+/g, '_') : 'Student_Name';
  const dynamicBase = `${roll}_${sec}_${rawName}`;

  const pptFilename = expected?.ppt_filename || `${dynamicBase}.pptx`;
  const videoFilename = expected?.video_filename || `${dynamicBase}.mp4`;
  const pdfFilename = expected?.pdf_filename || `${dynamicBase}.pdf`;
  const baseName = expected?.base_name || dynamicBase;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Missing fields for helper pill
  const missingFields: string[] = [];
  if (!hasRoll) missingFields.push('Roll Number');
  if (!hasSection) missingFields.push('Section');
  if (!hasName) missingFields.push('Name');

  return (
    <div
      className={`relative rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 transition-all duration-500 overflow-hidden ${
        isPersonalized
          ? 'bg-brand-50/70 border-2 border-brand-300 shadow-md ring-4 ring-brand-100/50'
          : 'bg-slate-50/80 border border-slate-200 shadow-xs'
      }`}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border transition-all duration-300 ${
                isPersonalized
                  ? 'text-brand-800 bg-brand-100 border-brand-300'
                  : 'text-slate-600 bg-slate-200/70 border-slate-300'
              }`}
            >
              Step 2 &bull; Required Filenames
            </span>
            {isPersonalized ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs animate-pulse">
                <Unlock className="w-3 h-3 text-emerald-600" />
                Filenames Unlocked &amp; Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                <Lock className="w-3 h-3 text-amber-700" />
                Locked &bull; Complete Step 1 Above
              </span>
            )}
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-2 flex items-center gap-2">
            <span>Your Official Assignment Filenames</span>
            {isPersonalized && (
              <span className="text-xs font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Verified Format
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Your files must be named exactly as shown below before uploading. Click <b>Copy Filename</b> to rename before choosing in Step 3.
          </p>
        </div>

        {/* Base identifier pill */}
        <div
          className={`transition-all duration-500 flex sm:inline-flex items-center text-xs px-3 py-1.5 rounded-xl border font-mono font-bold shadow-2xs ${
            isPersonalized
              ? 'text-brand-900 bg-white border-brand-300 ring-2 ring-brand-100'
              : 'text-slate-400 bg-slate-100 border-slate-200'
          }`}
        >
          Base: {baseName}
        </div>
      </div>

      {/* Cards Wrapper with Blur & Unblur Transition */}
      <div className="relative mt-4">
        {/* The 3 Filename Cards (Blurred when incomplete, crisp when complete) */}
        <div
          className={`grid grid-cols-1 md:grid-cols-3 gap-3 transition-all duration-700 ease-out ${
            isPersonalized
              ? 'filter blur-none opacity-100 scale-100 select-auto pointer-events-auto'
              : 'filter blur-[5px] opacity-40 scale-[0.99] select-none pointer-events-none'
          }`}
        >
          {/* PPT Filename Card */}
          <div className="bg-white p-3.5 rounded-xl border border-brand-200/90 shadow-2xs flex flex-col justify-between transition-transform duration-300 hover:shadow-sm">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-amber-600 mb-1">
                <span>PowerPoint (Required)</span>
                <span className="text-[10px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-mono">.pptx</span>
              </div>
              <p className="font-mono text-xs text-slate-900 break-all font-semibold select-all">
                {pptFilename}
              </p>
            </div>
            <button
              type="button"
              disabled={!isPersonalized}
              onClick={() => copyToClipboard(pptFilename, 'ppt')}
              className={`mt-3 flex items-center justify-center space-x-1.5 w-full py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                copiedKey === 'ppt'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 scale-98'
                  : 'text-slate-700 bg-slate-50 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 border-slate-200 shadow-2xs active:scale-95'
              }`}
            >
              {copiedKey === 'ppt' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'ppt' ? 'Copied to Clipboard!' : 'Copy Filename'}</span>
            </button>
          </div>

          {/* Video Filename Card */}
          <div className="bg-white p-3.5 rounded-xl border border-brand-200/90 shadow-2xs flex flex-col justify-between transition-transform duration-300 hover:shadow-sm">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-indigo-600 mb-1">
                <span>Presentation Video (Required)</span>
                <span className="text-[10px] bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 font-mono">.mp4</span>
              </div>
              <p className="font-mono text-xs text-slate-900 break-all font-semibold select-all">
                {videoFilename}
              </p>
            </div>
            <button
              type="button"
              disabled={!isPersonalized}
              onClick={() => copyToClipboard(videoFilename, 'video')}
              className={`mt-3 flex items-center justify-center space-x-1.5 w-full py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                copiedKey === 'video'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 scale-98'
                  : 'text-slate-700 bg-slate-50 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 border-slate-200 shadow-2xs active:scale-95'
              }`}
            >
              {copiedKey === 'video' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'video' ? 'Copied to Clipboard!' : 'Copy Filename'}</span>
            </button>
          </div>

          {/* PDF Filename Card */}
          <div className="bg-white p-3.5 rounded-xl border border-brand-200/90 shadow-2xs flex flex-col justify-between transition-transform duration-300 hover:shadow-sm">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-rose-600 mb-1">
                <span>PDF Companion ({pdfOptionalAllowed ? 'Optional' : 'Required'})</span>
                <span className="text-[10px] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 font-mono">.pdf</span>
              </div>
              <p className="font-mono text-xs text-slate-900 break-all font-semibold select-all">
                {pdfFilename}
              </p>
            </div>
            <button
              type="button"
              disabled={!isPersonalized}
              onClick={() => copyToClipboard(pdfFilename, 'pdf')}
              className={`mt-3 flex items-center justify-center space-x-1.5 w-full py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                copiedKey === 'pdf'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 scale-98'
                  : 'text-slate-700 bg-slate-50 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 border-slate-200 shadow-2xs active:scale-95'
              }`}
            >
              {copiedKey === 'pdf' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'pdf' ? 'Copied to Clipboard!' : 'Copy Filename'}</span>
            </button>
          </div>
        </div>

        {/* Animated Overlay when Incomplete */}
        {!isPersonalized && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-white/60 backdrop-blur-xs rounded-xl border border-slate-200/80 transition-all duration-500 shadow-xs z-10">
            <div className="flex items-center justify-center w-11 h-11 rounded-full bg-amber-100 border border-amber-300 text-amber-700 mb-2 shadow-xs animate-bounce">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 text-center">
              Complete Step 1 Above to Unlock Filenames
            </h4>
            <p className="text-xs text-slate-600 text-center max-w-md mt-1">
              Please enter your <b>Roll Number</b>, <b>Section</b>, and <b>Name</b> in Step 1. Your customized filenames and 1-click copy buttons will unlock instantly!
            </p>
            {missingFields.length > 0 && (
              <div className="mt-2.5 flex items-center gap-1.5 flex-wrap justify-center text-[11px] font-semibold text-amber-800 bg-amber-50/90 border border-amber-200 px-3 py-1 rounded-full shadow-2xs">
                <ArrowUp className="w-3 h-3 text-amber-600 animate-pulse" />
                <span>Missing:</span>
                <span className="font-bold underline">{missingFields.join(', ')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tip at Bottom */}
      <div
        className={`mt-3 flex items-center text-xs p-2.5 rounded-lg border transition-all duration-500 ${
          isPersonalized
            ? 'text-brand-900 bg-brand-100/70 border-brand-200'
            : 'text-slate-600 bg-slate-100/80 border-slate-200'
        }`}
      >
        <Info className={`w-4 h-4 mr-2 shrink-0 ${isPersonalized ? 'text-brand-600' : 'text-slate-400'}`} />
        <span>
          Tip: Once unlocked, click <b>Copy Filename</b> on each file, rename the corresponding file on your device, and drop it into Step 3.
        </span>
      </div>
    </div>
  );
};
