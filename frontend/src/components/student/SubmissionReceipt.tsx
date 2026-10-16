import React, { useState } from 'react';
import {
  CheckCircle, Copy, Check, Printer, HardDrive, Cloud,
  Mail, FileCheck, ArrowLeft, Share2, FileDown, Download,
  Folder, ExternalLink
} from 'lucide-react';
import { SubmissionReceipt as ReceiptType } from '../../types';

interface SubmissionReceiptProps {
  receipt: ReceiptType;
  onNewSubmission?: () => void;
}

export const SubmissionReceipt: React.FC<SubmissionReceiptProps> = ({
  receipt,
  onNewSubmission,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const copyTrackingId = () => {
    navigator.clipboard.writeText(receipt.tracking_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareReceipt = async () => {
    const text = `🎓 Official UHV Submission Confirmation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nTracking ID: ${receipt.tracking_id}\nStudent Name: ${receipt.student_name}\nRoll Number: ${receipt.roll_number}\nSection: ${receipt.section} (${receipt.branch})\nCategory: ${receipt.student_category} (${receipt.academic_year})\nTopic: ${receipt.topic}\nDeadline Status: ${receipt.deadline_classification}\nServer Time (IST): ${receipt.server_received_at_ist}\nInstitution: Dept. of Humanities & Applied Sciences\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nVerify live at: ${window.location.origin}/status?id=${receipt.tracking_id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `UHV Submission Receipt - ${receipt.tracking_id}`,
          text,
          url: `${window.location.origin}/status?id=${receipt.tracking_id}`,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          navigator.clipboard.writeText(text);
          alert('Receipt summary copied to clipboard!');
        }
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Receipt summary copied to clipboard!');
    }
  };

  const handleDownloadOfflineReceipt = () => {
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UHV Receipt - ${receipt.tracking_id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; padding: 20px; color: #1e293b; margin: 0; }
    .card { max-width: 650px; margin: 20px auto; background: white; border-radius: 16px; border: 1px solid #cbd5e1; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
    .badge { display: inline-block; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 6px 14px; border-radius: 9999px; font-weight: bold; font-family: monospace; font-size: 16px; margin-top: 8px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .label { color: #64748b; font-weight: 600; }
    .val { color: #0f172a; font-weight: bold; text-align: right; }
    .files { background: #f8fafc; border-radius: 10px; padding: 12px; margin-top: 14px; font-size: 12px; }
    .notice { margin-top: 20px; font-size: 11px; color: #475569; background: #f1f5f9; padding: 10px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2 style="margin: 0; color: #0f172a;">Official Presentation Submission Receipt</h2>
      <p style="margin: 4px 0 0; color: #64748b; font-size: 12px;">Department of Humanities & Applied Sciences</p>
      <div class="badge">Tracking ID: ${receipt.tracking_id}</div>
    </div>
    <div class="row"><span class="label">Student Name:</span><span class="val">${receipt.student_name}</span></div>
    <div class="row"><span class="label">University Roll Number:</span><span class="val">${receipt.roll_number}</span></div>
    <div class="row"><span class="label">Branch & Section:</span><span class="val">${receipt.branch} - ${receipt.section}</span></div>
    <div class="row"><span class="label">Category & Year:</span><span class="val">${receipt.student_category} (${receipt.academic_year})</span></div>
    <div class="row"><span class="label">Topic:</span><span class="val">${receipt.topic}</span></div>
    <div class="row"><span class="label">Received Timestamp (IST):</span><span class="val">${receipt.server_received_at_ist}</span></div>
    <div class="row"><span class="label">Evaluation Status:</span><span class="val">${receipt.deadline_classification}</span></div>
    <div class="files">
      <b>Submitted Files:</b><br/>
      ${receipt.files.map(f => f.source_drive_url ? `• ${f.expected_filename} (Google Drive Link: <a href="${f.source_drive_url}">${f.source_drive_url}</a>)` : `• ${f.expected_filename} (${(f.file_size / (1024 * 1024)).toFixed(2)} MB)`).join('<br/>')}
    </div>
    <div class="notice">
      <b>Notice:</b> Retain this receipt for examination and evaluation records.
    </div>
  </div>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UHV_Receipt_${receipt.tracking_id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto my-4 sm:my-8">
      {/* Top Banner */}
      <div className="bg-emerald-600 text-white rounded-2xl p-5 sm:p-8 shadow-xl mb-6 text-center">
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
          <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>
        <h2 className="text-xl sm:text-3xl font-extrabold">Submission Successfully Received!</h2>
        <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-xl mx-auto">
          Your presentation assignment has been permanently recorded by the university submission server.
        </p>

        {/* Tracking ID Badge */}
        <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:space-x-3 bg-white/10 border border-white/20 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl mt-4 backdrop-blur-md">
          <span className="text-[11px] sm:text-xs uppercase font-semibold tracking-wider text-emerald-200">Tracking ID:</span>
          <span className="text-lg sm:text-2xl font-black font-mono tracking-wider">{receipt.tracking_id}</span>
          <button
            onClick={copyTrackingId}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-white"
            title="Copy Tracking ID"
          >
            {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Tri-State Architecture Status Tracker */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          Multi-Tier Storage &amp; Notification Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tier 1: Local Server Storage */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-900">1. University Server</div>
              <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">Files Received &amp; Verified</p>
              <p className="text-[10px] text-emerald-600 mt-1">Stored on local NVMe disk with SHA-256 integrity.</p>
            </div>
          </div>

          {/* Tier 2: Google Drive Archival */}
          <div className="p-4 rounded-xl border border-brand-200 bg-brand-50/50 flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center shrink-0">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-brand-900">2. Google Drive Archival</div>
              <p className="text-[11px] text-brand-700 font-semibold mt-0.5">
                {receipt.gdrive_status === 'ARCHIVED_IN_GDRIVE' ? 'Archived in Section Folder' : 'Queued in Worker Queue'}
              </p>
              <p className="text-[10px] text-brand-600 mt-1">Asynchronous transfer to institutional cloud folder.</p>
            </div>
          </div>

          {/* Tier 3: Email Notification */}
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-900">3. Email Receipt</div>
              <p className="text-[11px] text-indigo-700 font-semibold mt-0.5">Dispatched to {receipt.student_email}</p>
              <p className="text-[10px] text-indigo-600 mt-1">Official timestamped email sent to student inbox.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Official Receipt Details */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-6 border-b border-slate-100">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">Official Submission Receipt</h3>
            <p className="text-xs text-slate-500 mt-0.5">Department of Humanities &amp; Applied Sciences</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleShareReceipt}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Share receipt via WhatsApp, Mail, or native share"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Receipt</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Save as PDF or Print"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Save PDF / Print</span>
            </button>
            <button
              onClick={handleDownloadOfflineReceipt}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Download standalone offline HTML document"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Offline File</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mt-6">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Student Name</span>
            <span className="font-semibold text-slate-900 text-sm">{receipt.student_name}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">University Roll Number</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{receipt.roll_number}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Branch &amp; Section</span>
            <span className="font-semibold text-slate-900">{receipt.branch} - Section {receipt.section}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Category &amp; Year</span>
            <span className="font-semibold text-slate-900">{receipt.student_category} ({receipt.academic_year})</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 sm:col-span-2">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Assignment Topic</span>
            <span className="font-semibold text-slate-900 text-sm">{receipt.topic}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Server Received Timestamp (IST)</span>
            <span className="font-mono font-bold text-slate-900">{receipt.server_received_at_ist}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Evaluation Status</span>
            <span className={`font-bold inline-block px-2 py-0.5 rounded text-xs mt-0.5 ${
              receipt.deadline_classification === 'ON_TIME'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}>
              {receipt.deadline_classification}
            </span>
          </div>
        </div>

        {/* Submitted Google Drive Folder */}
        {receipt.source_folder_url && (
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-indigo-100/60 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Folder className="w-5 h-5 text-amber-300" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                  Submitted Google Drive Folder
                </span>
                <p className="text-xs font-bold text-slate-900 truncate">
                  Folder Name: <span className="font-mono text-indigo-900">{receipt.folder_name || receipt.roll_number}</span>
                </p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{receipt.source_folder_url}</p>
              </div>
            </div>
            <a
              href={receipt.source_folder_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 transition-colors shadow-xs"
            >
              <span>Open Folder</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Files List */}
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-6 mb-3">
          Submitted Digital Artifacts ({receipt.files.length})
        </h4>
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
          {receipt.files.map((f) => (
            <div key={f.id} className="p-3 bg-white flex justify-between items-center">
              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                <FileCheck className="w-4 h-4 text-brand-600 shrink-0" />
                <div className="min-w-0">
                  <p className="font-mono font-semibold text-slate-800 break-all">{f.expected_filename}</p>
                  <p className="text-[11px] text-slate-400 uppercase font-bold">
                    {f.file_type} &bull; {f.source_drive_url ? 'Google Drive Link' : `${(f.file_size / (1024 * 1024)).toFixed(2)} MB`}
                  </p>
                  {f.source_drive_url && (
                    <a
                      href={f.source_drive_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-brand-600 hover:underline flex items-center space-x-1 mt-0.5 truncate"
                    >
                      <span>Open Link ↗</span>
                    </a>
                  )}
                </div>
              </div>
              <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded text-[11px] border border-emerald-200 shrink-0 ml-2">
                Verified On Server
              </span>
            </div>
          ))}
        </div>

        {/* Hard copy reminder */}
        <div className="mt-6 p-4 rounded-xl bg-slate-100 text-slate-700 text-xs leading-relaxed">
          <b>Notice:</b> Please keep this tracking ID for your examination verification. Remember to submit the physical hard copy separately as instructed by your course coordinator.
        </div>

        {onNewSubmission && (
          <div className="mt-6 text-center">
            <button
              onClick={onNewSubmission}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800 hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Submit Another Assignment</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
