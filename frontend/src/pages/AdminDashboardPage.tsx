import React, { useState, useEffect } from 'react';
import {
  Users, CheckCircle, Clock, Calendar, AlertTriangle, Download, RefreshCw,
  Search, SlidersHorizontal, LogOut, Settings as SettingsIcon,
  HardDrive, FileText, Cloud, Layers, X, Eye, EyeOff, Trash2,
  Wifi, Copy, Check, ExternalLink, Share2, FileSpreadsheet, Loader2, Folder, Mail,
  ShieldAlert, MessageSquare, Lock
} from 'lucide-react';
import { apiService } from '../services/api';
import { AdminMetrics } from '../types';

interface AdminDashboardPageProps {
  onLogout: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onLogout }) => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [sectionFilter, setSectionFilter] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<string>('');
  const [deadlineFilter, setDeadlineFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [driveActionLoading, setDriveActionLoading] = useState<string | null>(null);

  // Modals
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settingsData, setSettingsData] = useState<any>({});
  const [settingsSaving, setSettingsSaving] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareLoading, setShareLoading] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Reset Data Security Modal
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetPassword, setResetPassword] = useState<string>('');
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);
  const [resetConfirmed, setResetConfirmed] = useState<boolean>(false);
  const [resetLoading, setResetLoading] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Active Wi-Fi Info
  const [wifiInfo, setWifiInfo] = useState<{ wifi_ip: string; portal_url: string; port: number } | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);

  const fetchWifiInfo = async () => {
    try {
      const data = await apiService.getNetworkInfo();
      setWifiInfo(data);
    } catch (err) {
      console.error('Error fetching network info', err);
    }
  };

  const getSubmissionUrl = () => {
    if (wifiInfo?.portal_url && !wifiInfo.portal_url.includes('onrender.com') && !wifiInfo.portal_url.includes('localhost')) {
      return wifiInfo.portal_url;
    }
    if (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1')) {
      return window.location.origin;
    }
    return wifiInfo?.portal_url || 'https://uhv-submission-portal.vercel.app';
  };

  const handleCopyWifiLink = () => {
    const url = getSubmissionUrl();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleUpdateWifiIp = async (ip: string) => {
    try {
      const res = await apiService.updateNetworkInfo(ip);
      setWifiInfo(res);
      alert(`Wi-Fi IP updated to: ${res.wifi_ip}`);
    } catch (err) {
      alert('Failed to update Wi-Fi IP.');
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [m, s] = await Promise.all([
        apiService.getMetrics(),
        apiService.getSubmissions({
          search: search || undefined,
          section: sectionFilter || undefined,
          branch: branchFilter || undefined,
          deadline_status: deadlineFilter || undefined,
          category: categoryFilter || undefined,
          sort_by: sortBy || undefined,
          sort_order: sortOrder || undefined,
        }),
      ]);
      setMetrics(m);
      setSubmissions(s.items || []);
    } catch (err) {
      console.error('Error fetching dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-poll Wi-Fi IP every 4 seconds in real-time so changes appear automatically
  useEffect(() => {
    fetchWifiInfo();
    const interval = setInterval(() => {
      fetchWifiInfo();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Auto-sync host IP if accessed via mobile browser on local network
  useEffect(() => {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1' && !host.includes('backend')) {
      if (wifiInfo && wifiInfo.wifi_ip !== host && (host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.'))) {
        apiService.updateNetworkInfo(host).then((res) => {
          setWifiInfo(res);
        }).catch(() => {});
      }
    }
  }, [wifiInfo]);

  useEffect(() => {
    fetchDashboardData();
  }, [sectionFilter, branchFilter, deadlineFilter, categoryFilter, sortBy, sortOrder]);

  const handlePushToDrive = async (submissionId: string) => {
    setDriveActionLoading(submissionId);
    try {
      const res = await apiService.triggerDriveUpload(submissionId);
      if (res.success) {
        alert(res.message || 'Successfully synced with Google Drive!');
      } else {
        alert(`Google Drive upload result: ${res.errors?.join(', ') || res.message || 'Check logs'}`);
      }
      if (selectedSub && selectedSub.id === submissionId) {
        handleViewDetail(submissionId);
      }
      fetchDashboardData();
    } catch (err: any) {
      alert(`Drive operation notice: ${err.response?.data?.detail || err.message}`);
    } finally {
      setDriveActionLoading(null);
    }
  };

  const [fileTransferLoading, setFileTransferLoading] = useState<string | null>(null);

  const handleTransferSingleFile = async (submissionId: string, fileId: string) => {
    setFileTransferLoading(fileId);
    try {
      const res = await apiService.transferSingleFile(submissionId, fileId);
      if (res.status === 'completed') {
        alert('File successfully transferred to Admin Google Drive!');
      } else {
        alert(`Transfer status: ${res.status} - ${res.message || 'Check logs'}`);
      }
      if (selectedSub && selectedSub.id === submissionId) {
        handleViewDetail(submissionId);
      }
      fetchDashboardData();
    } catch (err: any) {
      alert(`Transfer failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setFileTransferLoading(null);
    }
  };

  const [exportLoading, setExportLoading] = useState<'excel' | 'csv' | 'share' | null>(null);
  const [testEmailLoading, setTestEmailLoading] = useState<boolean>(false);
  const [resendEmailLoading, setResendEmailLoading] = useState<string | null>(null);

  const handleTestEmail = async () => {
    const target = prompt('Enter recipient email to test delivery:', 'maheshwarsinha7@gmail.com');
    if (!target || !target.trim()) return;
    setTestEmailLoading(true);
    try {
      const res = await apiService.testEmail(target.trim());
      if (res.success) {
        alert(`✅ Test email delivered successfully to ${res.recipient}!\nDetails: ${res.message}`);
      } else {
        alert(`❌ Email Delivery Result:\n${res.message}`);
      }
    } catch (err: any) {
      alert(`❌ Test email failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setTestEmailLoading(false);
    }
  };

  const handleResendEmail = async (submissionId: string) => {
    setResendEmailLoading(submissionId);
    try {
      const res = await apiService.resendSubmissionEmail(submissionId);
      if (res.student_email_sent) {
        alert('✅ Email receipt delivered successfully to student and teacher alert dispatched!');
      } else {
        alert(`⚠️ Email delivery status: ${res.status || 'Notice'}\nResult: ${res.message || 'Check notification records'}`);
      }
    } catch (err: any) {
      alert(`Failed to send email: ${err.response?.data?.detail || err.message}`);
    } finally {
      setResendEmailLoading(null);
    }
  };

  const getCurrentFilters = () => ({
    section: sectionFilter || undefined,
    branch: branchFilter || undefined,
    category: categoryFilter || undefined,
    deadline_status: deadlineFilter || undefined,
    search: search || undefined,
    sort_by: sortBy || undefined,
    sort_order: sortOrder || undefined,
  });

  const handleExportExcel = async () => {
    setExportLoading('excel');
    try {
      const { blob, filename } = await apiService.exportExcelBlob(getCurrentFilters());
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setExportLoading(null);
    }
  };

  const handleExportCsv = async () => {
    setExportLoading('csv');
    try {
      const { blob, filename } = await apiService.exportCsvBlob(getCurrentFilters());
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setExportLoading(null);
    }
  };

  const handleShareExcel = () => {
    setShowShareModal(true);
  };

  const buildShareSummaryText = () => {
    const url = getSubmissionUrl();
    const filterParts: string[] = [];
    if (categoryFilter) filterParts.push(`Category: ${categoryFilter}`);
    if (branchFilter) filterParts.push(`Branch: ${branchFilter}`);
    if (sectionFilter) filterParts.push(`Section: ${sectionFilter}`);
    if (deadlineFilter) filterParts.push(`Timing: ${deadlineFilter}`);

    const filterString = filterParts.length > 0 ? `\n• Filters: ${filterParts.join(' | ')}` : '';

    return `📊 *UHV 2026 Presentation Submissions Report*
• Total Records: ${submissions.length} submissions${filterString}
• On-Time: ${metrics?.on_time_count || 0} | Late: ${metrics?.late_count || 0}
• Google Drive Synced: ${metrics?.completed_submissions || 0}
• Drive Pending: ${metrics?.drive_pending_submissions || 0}

🔗 Evaluation Portal: ${url}
(Generated by UHV Admin Evaluation Center)`;
  };

  const handleShareWhatsApp = () => {
    const text = buildShareSummaryText();
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handleShareEmail = () => {
    const subject = `UHV-2026 Submissions Evaluation Report (${submissions.length} Records)`;
    const body = buildShareSummaryText();
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleCopySummary = () => {
    const text = buildShareSummaryText();
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleNativeShare = async () => {
    setShareLoading(true);
    try {
      const { blob, filename } = await apiService.exportExcelBlob(getCurrentFilters());
      const file = new File([blob], filename, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'UHV Submissions Report',
          text: `Filtered UHV Presentation Submissions (${submissions.length} records)`,
        });
        return;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.warn('Native file share failed, falling back to text/link share', err);
    } finally {
      setShareLoading(false);
    }

    const text = buildShareSummaryText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'UHV Submissions Report',
          text,
          url: getSubmissionUrl(),
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    handleCopySummary();
    alert('Report summary copied to clipboard! You can paste and share it anywhere.');
  };

  const handleOpenResetModal = () => {
    setResetPassword('');
    setShowResetPassword(false);
    setResetConfirmed(false);
    setResetError(null);
    setShowResetModal(true);
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassword.trim()) {
      setResetError('Please enter your administrator password to proceed.');
      return;
    }
    if (!resetConfirmed) {
      setResetError('Please check the confirmation box acknowledging permanent deletion.');
      return;
    }

    setResetLoading(true);
    setResetError(null);
    try {
      const res = await apiService.resetAllData(resetPassword.trim());
      alert(`Success: ${res.message} (${res.drive_items_deleted} Drive items removed)`);
      setShowResetModal(false);
      setResetPassword('');
      setResetConfirmed(false);
      fetchDashboardData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Reset failed. Check your password and try again.';
      setResetError(msg);
    } finally {
      setResetLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDashboardData();
  };

  const handleViewDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const detail = await apiService.getSubmissionDetail(id);
      setSelectedSub(detail);
    } catch (err) {
      alert('Failed to load submission details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await apiService.retryJob(jobId);
      alert('Job queued for retry.');
      if (selectedSub) {
        handleViewDetail(selectedSub.id);
      }
      fetchDashboardData();
    } catch (err) {
      alert('Failed to retry job.');
    }
  };

  const openSettingsModal = async () => {
    try {
      const s = await apiService.getSettings();
      setSettingsData(s);
      setShowSettings(true);
    } catch (err) {
      alert('Failed to load system settings.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      await apiService.updateSettings(settingsData);
      alert('Settings updated successfully.');
      setShowSettings(false);
      fetchDashboardData();
    } catch (err) {
      alert('Failed to update settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  // Helper functions for Date (Calendar) & Time (Clock) pickers
  const getDeadlineDate = (): string => {
    if (!settingsData.submission_deadline) return '';
    try {
      const parts = settingsData.submission_deadline.split('T');
      if (parts[0] && parts[0].length === 10) return parts[0];
      const d = new Date(settingsData.submission_deadline);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch {}
    return '';
  };

  const getDeadlineTime = (): string => {
    if (!settingsData.submission_deadline) return '23:59';
    try {
      const parts = settingsData.submission_deadline.split('T');
      if (parts[1]) {
        return parts[1].substring(0, 5); // "HH:MM"
      }
    } catch {}
    return '23:59';
  };

  const handleDeadlineDateChange = (newDate: string) => {
    if (!newDate) return;
    const currentTime = getDeadlineTime() || '23:59';
    setSettingsData({
      ...settingsData,
      submission_deadline: `${newDate}T${currentTime}:59`
    });
  };

  const handleDeadlineTimeChange = (newTime: string) => {
    if (!newTime) return;
    const currentDate = getDeadlineDate() || new Date().toISOString().split('T')[0];
    setSettingsData({
      ...settingsData,
      submission_deadline: `${currentDate}T${newTime}:59`
    });
  };

  const setPresetDeadline = (daysAhead: number, hours: number = 23, minutes: number = 59) => {
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    const hh = String(hours).padStart(2, '0');
    const min = String(minutes).padStart(2, '0');
    setSettingsData({
      ...settingsData,
      submission_deadline: `${yyyy}-${mm}-${dd}T${hh}:${min}:59`
    });
  };

  const formatDeadlinePreview = (): { text: string; isPast: boolean; daysDiffText: string } => {
    if (!settingsData.submission_deadline) return { text: 'Not set', isPast: false, daysDiffText: '' };
    try {
      const dt = new Date(settingsData.submission_deadline);
      if (isNaN(dt.getTime())) return { text: settingsData.submission_deadline, isPast: false, daysDiffText: '' };

      const now = new Date();
      const isPast = dt.getTime() < now.getTime();
      const diffMs = dt.getTime() - now.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));

      let daysDiffText = '';
      if (isPast) {
        daysDiffText = 'Expired';
      } else if (diffHours < 24) {
        daysDiffText = diffHours <= 1 ? 'Ends in < 1 hr' : `Ends in ${diffHours} hrs`;
      } else {
        daysDiffText = `${diffDays} days left`;
      }

      const formatted = dt.toLocaleString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });

      return { text: formatted, isPast, daysDiffText };
    } catch {
      return { text: settingsData.submission_deadline, isPast: false, daysDiffText: '' };
    }
  };

  const adminName = localStorage.getItem('uhv_admin_name') || 'Administrator';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
            Control Center
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
            UHV Assignment Administrator Dashboard
          </h2>
          <p className="text-xs text-slate-500">
            Logged in as <b>{adminName}</b> &bull; Evaluation Session 2026
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-0">
          <button
            onClick={openSettingsModal}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <SettingsIcon className="w-4 h-4 text-slate-500" />
            <span>Config</span>
          </button>

          {/* Share Report (Opens rich share options dialog: WhatsApp, Email, Native, Excel) */}
          <button
            onClick={handleShareExcel}
            className="flex items-center space-x-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            title="Open sharing options (WhatsApp, Email, Device Share, Excel download)"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Report</span>
          </button>

          {/* Download Filtered Excel */}
          <button
            onClick={handleExportExcel}
            disabled={exportLoading !== null}
            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            title="Download Excel spreadsheet (.xlsx) with all applied filters"
          >
            {exportLoading === 'excel' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            <span>Export Excel</span>
          </button>

          {/* Download Filtered CSV */}
          <button
            onClick={handleExportCsv}
            disabled={exportLoading !== null}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Download CSV spreadsheet with all applied filters"
          >
            {exportLoading === 'csv' ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
            ) : (
              <Download className="w-4 h-4 text-slate-500" />
            )}
            <span>CSV</span>
          </button>

          <button
            onClick={handleTestEmail}
            disabled={testEmailLoading}
            className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            title="Send a live test email to verify transactional mailing"
          >
            {testEmailLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            ) : (
              <Mail className="w-4 h-4 text-indigo-600" />
            )}
            <span>{testEmailLoading ? 'Testing...' : 'Test Email'}</span>
          </button>

          <a
            href="https://drive.google.com/drive/folders/1_tM2I4olNVqXC-R0iw1vXrfFee25iIDx"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold shadow-2xs transition-colors"
            title="Open institutional root submissions folder in Google Drive"
          >
            <Folder className="w-4 h-4 text-indigo-600" />
            <span>Admin Google Drive ↗</span>
          </a>

          <button
            onClick={handleOpenResetModal}
            className="flex items-center space-x-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            title="Clear all submissions with required admin password verification"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Reset Data</span>
          </button>

          <button
            onClick={fetchDashboardData}
            className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-slate-700 shadow-2xs transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Active Wi-Fi Student Access URL Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md my-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-brand-500/20 border border-brand-400/30 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <Wifi className="w-6 h-6 text-brand-400 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-200 bg-brand-900/60 px-2 py-0.5 rounded border border-brand-700">
                {getSubmissionUrl().includes('vercel.app') || (!getSubmissionUrl().includes('192.168.') && !getSubmissionUrl().includes('10.') && !getSubmissionUrl().includes('172.')) ? 'Student Portal URL' : 'Student Wi-Fi Submission URL'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ● {getSubmissionUrl().includes('vercel.app') ? 'Live Online Portal' : 'Live on Campus Network'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Give this exact address to students to submit their assignment:
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="font-mono text-sm sm:text-base md:text-lg font-black text-white bg-black/40 px-3 py-1 rounded-lg border border-white/10 select-all tracking-wider break-all">
                {getSubmissionUrl()}
              </span>
              <button
                onClick={handleCopyWifiLink}
                className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
              <a
                href={getSubmissionUrl()}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-all border border-white/20 flex items-center space-x-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Form</span>
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-3 rounded-xl text-[11px] text-slate-300 max-w-sm w-full md:w-auto">
          <p className="font-bold text-white mb-0.5">💡 Changed Your Wi-Fi?</p>
          <p className="text-slate-400">
            Docker automatically listens on your new Wi-Fi without any rebuild! Click below to refresh or edit the IP anytime.
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <button
              onClick={fetchWifiInfo}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh IP</span>
            </button>
            <button
              onClick={() => {
                const newIp = prompt('Enter active Wi-Fi IP address:', wifiInfo?.wifi_ip || '');
                if (newIp && newIp.trim()) handleUpdateWifiIp(newIp.trim());
              }}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded text-xs font-medium transition-colors cursor-pointer"
            >
              Edit IP
            </button>
          </div>
        </div>
      </div>

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5 my-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase block">Total Submissions</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{metrics?.total_submissions || 0}</span>
          <span className="text-[10px] text-slate-500 mt-1 block">Campus records</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase block">Drive Archived</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">{metrics?.completed_submissions || 0}</span>
          <span className="text-[10px] text-emerald-600 mt-1 block">Backed up to Drive</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-brand-600 uppercase block">Drive Pending</span>
          <span className="text-2xl font-black text-brand-700 mt-1 block">{metrics?.drive_pending_submissions || 0}</span>
          <span className="text-[10px] text-brand-500 mt-1 block">Queued in worker</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase block">On-Time</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{metrics?.on_time_count || 0}</span>
          <span className="text-[10px] text-slate-500 mt-1 block">Before deadline</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-rose-600 uppercase block">Late Submissions</span>
          <span className="text-2xl font-black text-rose-600 mt-1 block">{metrics?.late_count || 0}</span>
          <span className="text-[10px] text-rose-500 mt-1 block">After deadline</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-600 uppercase block">Student Quota</span>
            {(metrics?.email_queued_count ?? 0) > 0 ? (
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">Queued</span>
            ) : (
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">Live Sync</span>
            )}
          </div>
          <span className="text-2xl font-black text-indigo-900 mt-1 block">
            {metrics?.email_remaining_today ?? 299}
            <span className="text-xs text-slate-400 font-normal"> / {metrics?.email_daily_limit ?? 300} left</span>
          </span>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {metrics?.email_sent_today ?? 0} sent today (Brevo Live • Resend)
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase block">Server Disk Free</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{metrics?.disk_free_gb || 0} GB</span>
          <span className="text-[10px] text-slate-500 mt-1 block">{metrics?.disk_used_percent || 0}% used</span>
        </div>
      </div>

      {/* Queued Email Notice Banner */}
      {(metrics?.email_queued_count ?? 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-amber-800">
            <Mail className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <b>Daily Free Quota Reached:</b> {metrics?.email_queued_count} student receipt(s) are safely queued. They will automatically dispatch tomorrow when the 300-email daily quota resets!
            </span>
          </div>
          <button
            onClick={async () => {
              try {
                const res = await apiService.dispatchQueuedEmails();
                alert(`Dispatch result: ${res.message || 'Complete'}`);
                fetchDashboardData();
              } catch (err: any) {
                alert(`Dispatch failed: ${err.message}`);
              }
            }}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer"
          >
            Dispatch Available Slots Now
          </button>
        </div>
      )}

      {/* Section Distribution */}
      {metrics?.section_breakdown && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
            Submissions by Academic Section
          </span>
          <div className="flex flex-wrap gap-3">
            {Object.entries(metrics.section_breakdown).map(([sec, count]) => (
              <div key={sec} className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs flex items-center space-x-2">
                <span className="font-bold text-slate-800">{sec}:</span>
                <span className="font-mono bg-brand-100 text-brand-800 px-1.5 py-0.5 rounded font-semibold">{count}</span>
              </div>
            ))}
            <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs flex items-center space-x-2">
              <span className="font-bold text-slate-800">Regular:</span>
              <span className="font-mono font-semibold">{metrics.regular_count}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs flex items-center space-x-2">
              <span className="font-bold text-slate-800">Backlog:</span>
              <span className="font-mono font-semibold">{metrics.backlog_count}</span>
            </div>
          </div>
        </div>
      )}

      {/* Submissions Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs mb-6 flex flex-col lg:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Name, Roll No, Section, Branch, Topic, or Tracking ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:bg-white focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer">
            Filter
          </button>
        </form>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="w-full sm:w-auto px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
          >
            <option value="">All Branches</option>
            <option value="Computer Science and Engineering">CSE</option>
            <option value="Information Technology">IT</option>
            <option value="Artificial Intelligence & Data Science">AI &amp; DS</option>
          </select>

          {/* Section Filter */}
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="w-full sm:w-auto px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
          >
            <option value="">All Sections</option>
            <option value="CSE1">CSE1</option>
            <option value="CSE2">CSE2</option>
            <option value="CSE3">CSE3</option>
            <option value="CSE-AI">CSE-AI</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="Regular">Regular</option>
            <option value="Backlog">Backlog</option>
          </select>

          {/* Timing Filter */}
          <select
            value={deadlineFilter}
            onChange={(e) => setDeadlineFilter(e.target.value)}
            className="w-full sm:w-auto px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
          >
            <option value="">All Timings</option>
            <option value="ON_TIME">On-Time</option>
            <option value="LATE">Late</option>
          </select>

          {/* Sorting */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full sm:w-auto px-2.5 py-2 bg-brand-50 border border-brand-200 rounded-lg text-xs font-semibold text-brand-900 focus:outline-none"
          >
            <option value="date">Sort: Date</option>
            <option value="roll">Sort: Roll No</option>
            <option value="name">Sort: Name</option>
            <option value="section">Sort: Section</option>
            <option value="timing">Sort: Timing</option>
          </select>

          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="w-full sm:w-auto px-2.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors text-center"
            title="Toggle sort direction"
          >
            {sortOrder === 'desc' ? 'Desc (↓)' : 'Asc (↑)'}
          </button>
        </div>
      </div>

      {/* Mobile Card View (< md screens) */}
      <div className="md:hidden space-y-3 mb-6">
        {submissions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
            No submissions found matching criteria.
          </div>
        ) : (
          submissions.map((sub) => (
            <div key={sub.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                    {sub.tracking_id}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-1.5">{sub.student_name}</h4>
                  <p className="font-mono text-xs font-semibold text-slate-600">{sub.roll_number}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                  sub.deadline_classification === 'ON_TIME'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {sub.deadline_classification}
                </span>
              </div>

              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Branch &amp; Sec:</span>
                  <span className="font-medium text-slate-800">{sub.section} &bull; {sub.branch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Category:</span>
                  <span className="font-medium text-slate-800">{sub.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">IP Address:</span>
                  <span className="font-mono text-slate-800">{sub.ip_address || 'Unknown'}</span>
                </div>
                <div className="pt-1 border-t border-slate-200/60">
                  <span className="text-slate-400 block text-[10px] mb-0.5">Topic:</span>
                  <p className="font-medium text-slate-800 text-xs break-words">{sub.topic}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  sub.drive_completed
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {sub.drive_completed ? 'Drive Archived' : 'Drive Queued'}
                </span>

                <div className="flex items-center space-x-2">
                  {!sub.drive_completed && (
                    <button
                      onClick={() => handlePushToDrive(sub.id)}
                      disabled={driveActionLoading === sub.id}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      {driveActionLoading === sub.id ? 'Pushing...' : 'Push Drive'}
                    </button>
                  )}
                  <button
                    onClick={() => handleViewDetail(sub.id)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-700 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer flex items-center space-x-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </button>
                </div>
              </div>

              {/* Mobile Drive Links row */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                {sub.source_folder_url && (
                  <a
                    href={sub.source_folder_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                  >
                    <span>📁 Open Folder ↗</span>
                  </a>
                )}
                {(() => {
                  const vid = sub.files.find((f: any) => f.file_type === 'video');
                  const ppt = sub.files.find((f: any) => f.file_type === 'ppt');
                  return (
                    <>
                      {vid?.source_drive_url && (
                        <a
                          href={vid.source_drive_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Video ↗</span>
                        </a>
                      )}
                      {ppt?.source_drive_url && (
                        <a
                          href={ppt.source_drive_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>PPT ↗</span>
                        </a>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Submissions Data Table (>= md screens) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Tracking ID</th>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Sec / Cat</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Topic</th>
                <th className="py-3 px-4">Timing</th>
                <th className="py-3 px-4">Student Drive Links</th>
                <th className="py-3 px-4">Admin Backup</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-slate-400">
                    No submissions found matching criteria.
                  </td>
                </tr>
              ) : (
                submissions.map((sub) => {
                  const vidFile = sub.files.find((f: any) => f.file_type === 'video');
                  const pptFile = sub.files.find((f: any) => f.file_type === 'ppt');
                  const adminFile = sub.files.find((f: any) => f.admin_drive_url || f.drive_file_id);
                  const adminUrl = adminFile?.admin_drive_url || (adminFile?.drive_file_id ? `https://drive.google.com/file/d/${adminFile.drive_file_id}/view` : null);

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-brand-700">{sub.tracking_id}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">{sub.roll_number}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{sub.student_name}</td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] truncate max-w-[140px]">{sub.branch}</td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="font-semibold">{sub.section}</span> &bull; {sub.category}
                      </td>
                      <td className="py-3 px-4">
                        {sub.ip_address ? (
                          <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200" title={`Submitted from IP: ${sub.ip_address}`}>
                            {sub.ip_address}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unknown</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-[180px] truncate">{sub.topic}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sub.deadline_classification === 'ON_TIME'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {sub.deadline_classification}
                        </span>
                      </td>

                      {/* Clickable Student Drive Links */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {sub.source_folder_url ? (
                            <a
                              href={sub.source_folder_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors"
                              title={`Open Student Folder in Drive: ${sub.folder_name || sub.roll_number}`}
                            >
                              <span>📁 Folder ↗</span>
                            </a>
                          ) : null}

                          {vidFile?.source_drive_url ? (
                            <a
                              href={vidFile.source_drive_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                              title={`Watch Student Video in Drive (${vidFile.link_accessibility_status || 'View'})`}
                            >
                              <span>🎬 Video ↗</span>
                              {vidFile.link_accessibility_status === 'RESTRICTED' && (
                                <span className="text-[9px] text-rose-600 font-bold" title="Access is restricted">⚠️</span>
                              )}
                            </a>
                          ) : null}

                          {pptFile?.source_drive_url ? (
                            <a
                              href={pptFile.source_drive_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                              title={`View Student PPT in Drive (${pptFile.link_accessibility_status || 'View'})`}
                            >
                              <span>📊 PPT ↗</span>
                              {pptFile.link_accessibility_status === 'RESTRICTED' && (
                                <span className="text-[9px] text-rose-600 font-bold" title="Access is restricted">⚠️</span>
                              )}
                            </a>
                          ) : null}

                          {!sub.source_folder_url && !vidFile?.source_drive_url && !pptFile?.source_drive_url && (
                            <span className="text-[10px] text-slate-400 italic">No Links</span>
                          )}
                        </div>
                      </td>

                      {/* Admin Backup Status */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                            sub.drive_completed
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {sub.drive_completed ? 'Archived in Drive' : 'Drive Pending'}
                          </span>
                          <div className="flex flex-wrap items-center gap-1">
                            {pptFile && (pptFile.admin_drive_url || pptFile.drive_file_id) && (
                              <a
                                href={pptFile.admin_drive_url?.startsWith('http') && !pptFile.admin_drive_url.includes('/presentation/d/') ? pptFile.admin_drive_url : `https://drive.google.com/file/d/${pptFile.drive_file_id}/view`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors"
                                title="Open PPT Preview in Google Drive"
                              >
                                <span>📊 PPT ↗</span>
                              </a>
                            )}
                            {vidFile && (vidFile.admin_drive_url || vidFile.drive_file_id) && (
                              <a
                                href={vidFile.admin_drive_url || `https://drive.google.com/file/d/${vidFile.drive_file_id}/view`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                                title="Watch Video in Google Drive"
                              >
                                <span>🎬 Video ↗</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {!sub.drive_completed && (
                          <button
                            onClick={() => handlePushToDrive(sub.id)}
                            disabled={driveActionLoading === sub.id}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-medium transition-colors cursor-pointer text-[11px]"
                            title="Upload to Google Drive now"
                          >
                            <Cloud className={`w-3.5 h-3.5 ${driveActionLoading === sub.id ? 'animate-pulse text-amber-600' : 'text-amber-600'}`} />
                            <span>{driveActionLoading === sub.id ? 'Pushing...' : 'Push to Drive'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleViewDetail(sub.id)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-700 rounded-lg font-medium transition-colors cursor-pointer text-[11px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submission Detail Modal */}
      {selectedSub && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-2xl w-full shadow-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="flex justify-between items-start p-4 sm:p-6 pb-3 border-b border-slate-200 bg-white shrink-0">
              <div className="min-w-0 pr-2">
                <span className="text-xs font-mono font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                  {selectedSub.tracking_id}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1 break-words">
                  {selectedSub.student.name} ({selectedSub.student.roll_number})
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  {selectedSub.student.branch} - Section {selectedSub.student.section} &bull; {selectedSub.student.category}
                </p>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 pb-20 sm:pb-6 overscroll-contain text-xs">
              <div className="bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-700">Topic: {selectedSub.topic}</p>
                  <p className="text-slate-500">Received (IST): {selectedSub.server_received_at_ist}</p>
                  <p className="text-slate-500">Timing Classification: <b className="text-slate-800">{selectedSub.deadline_classification}</b></p>
                  <p className="text-slate-500">
                    Submitted From IP: <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{selectedSub.ip_address || 'Unknown'}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleResendEmail(selectedSub.id)}
                    disabled={resendEmailLoading === selectedSub.id}
                    className="flex-1 sm:flex-none justify-center inline-flex items-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-2xs transition-colors cursor-pointer text-xs"
                    title="Dispatch student email receipt and teacher alert"
                  >
                    {resendEmailLoading === selectedSub.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Mail className="w-3.5 h-3.5" />
                    )}
                    <span>{resendEmailLoading === selectedSub.id ? 'Sending...' : 'Send Email Receipt'}</span>
                  </button>

                  {selectedSub.status !== 'COMPLETED' && (
                    <button
                      onClick={() => handlePushToDrive(selectedSub.id)}
                      disabled={driveActionLoading === selectedSub.id}
                      className="flex-1 sm:flex-none justify-center inline-flex items-center space-x-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-2xs transition-colors cursor-pointer text-xs"
                    >
                      <Cloud className="w-4 h-4" />
                      <span>{driveActionLoading === selectedSub.id ? 'Uploading...' : 'Upload to Drive Now'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Student Shared Folder Card */}
              {selectedSub.source_folder_url && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3.5 rounded-xl border border-indigo-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Folder className="w-4 h-4 text-amber-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-indigo-950 text-xs">
                        Student Submission Folder: <span className="font-mono break-all">{selectedSub.folder_name || selectedSub.student.roll_number}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono break-all line-clamp-1">{selectedSub.source_folder_url}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto">
                    <a
                      href={selectedSub.source_folder_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 sm:flex-none justify-center inline-flex items-center space-x-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs transition-colors shadow-2xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Folder ↗</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedSub.source_folder_url);
                        alert('Folder link copied to clipboard!');
                      }}
                      className="flex-1 sm:flex-none justify-center px-2.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-wider text-[11px]">
                  Files Stored
                </h4>
                <div className="space-y-3">
                  {selectedSub.files.map((f: any) => {
                    const adminUrl = f.admin_drive_url || (f.drive_file_id ? `https://drive.google.com/file/d/${f.drive_file_id}/view` : null);
                    const isTransferring = fileTransferLoading === f.id;

                    return (
                      <div key={f.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5 overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start sm:items-center justify-between gap-2 min-w-0 flex-1">
                            <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm break-all leading-tight">
                              {f.expected_filename}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(f.expected_filename);
                                setCopiedFileId(f.id);
                                setTimeout(() => setCopiedFileId(null), 2000);
                              }}
                              className={`shrink-0 inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                                copiedFileId === f.id
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : 'bg-white hover:bg-brand-50 text-slate-600 hover:text-brand-700 border-slate-200'
                              }`}
                              title="Copy filename"
                            >
                              {copiedFileId === f.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedFileId === f.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold self-start sm:self-auto ${
                            f.upload_status === 'DRIVE_COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : (f.upload_status === 'FAILED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800')
                          }`}>
                            {f.upload_status}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3">
                          <span><b>Type:</b> {f.file_type.toUpperCase()}</span>
                          {f.file_size_mb > 0 && <span><b>Size:</b> {f.file_size_mb} MB</span>}
                          {f.sha256 && <span className="font-mono truncate max-w-xs"><b>SHA:</b> {f.sha256}</span>}
                        </div>

                        {/* Student Drive Link Section */}
                        {f.source_drive_url && (
                          <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-bold text-slate-700 flex items-center space-x-1 text-[11px] sm:text-xs">
                                <span>🔗 Student's Shared Google Drive Link</span>
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                f.link_accessibility_status === 'RESTRICTED'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {f.link_accessibility_status === 'RESTRICTED' ? '⚠️ Access Restricted' : '✓ Public Access'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <a
                                href={f.source_drive_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center space-x-1 px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-md font-bold text-[11px] flex-1 sm:flex-none"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Open Student File in Drive ↗</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(f.source_drive_url);
                                  alert('Student Drive Link copied to clipboard!');
                                }}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium flex-1 sm:flex-none text-center"
                              >
                                Copy Link
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Admin Drive Archival Section */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex items-center space-x-2 flex-1 sm:flex-none min-w-0">
                            {adminUrl ? (
                              <a
                                href={adminUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center space-x-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md font-bold text-[11px] w-full sm:w-auto"
                              >
                                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                                <span>View in Admin Drive ↗</span>
                              </a>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Not yet archived in Admin Drive</span>
                            )}
                          </div>

                          {f.upload_status !== 'DRIVE_COMPLETED' && (
                            <button
                              type="button"
                              onClick={() => handleTransferSingleFile(selectedSub.id, f.id)}
                              disabled={isTransferring}
                              className="inline-flex items-center justify-center space-x-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[11px] font-bold cursor-pointer disabled:opacity-50 w-full sm:w-auto"
                            >
                              <RefreshCw className={`w-3 h-3 ${isTransferring ? 'animate-spin' : ''}`} />
                              <span>{isTransferring ? 'Transferring...' : 'Sync to Admin Drive'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedSub.jobs && selectedSub.jobs.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-wider text-[11px]">
                    Background Job Queue
                  </h4>
                  <div className="space-y-2">
                    {selectedSub.jobs.map((j: any) => (
                      <div key={j.id} className="p-2.5 rounded-lg border bg-slate-50 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-800">{j.job_type} ({j.status})</p>
                          {j.last_error && <p className="text-rose-600 text-[10px]">{j.last_error}</p>}
                        </div>
                        {j.status === 'FAILED' && (
                          <button
                            onClick={() => handleRetryJob(j.id)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold"
                          >
                            Retry Job
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Close Button for Mobile convenience */}
              <div className="pt-2 sm:hidden">
                <button
                  type="button"
                  onClick={() => setSelectedSub(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Report Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-brand-50 to-indigo-50">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-xs">
                  <Share2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Share Submissions Report</h3>
                  <p className="text-xs text-slate-500">Send report to WhatsApp, Email, or download directly</p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Summary pill card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Report Snapshot</span>
                  <span className="font-bold text-brand-700 bg-brand-100/70 px-2 py-0.5 rounded text-[11px]">
                    {submissions.length} Submissions
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                    <span className="text-slate-400 block text-[10px]">On-Time</span>
                    <span className="font-bold text-emerald-600">{metrics?.on_time_count || 0}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                    <span className="text-slate-400 block text-[10px]">Late</span>
                    <span className="font-bold text-amber-600">{metrics?.late_count || 0}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                    <span className="text-slate-400 block text-[10px]">Drive Synced</span>
                    <span className="font-bold text-indigo-600">{metrics?.completed_submissions || 0}</span>
                  </div>
                </div>
              </div>

              {/* Share Options Grid */}
              <div className="space-y-2.5">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Choose Share Destination</p>

                {/* 1. WhatsApp */}
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 transition-colors text-left group cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs group-hover:text-emerald-900">Share via WhatsApp</p>
                      <p className="text-[11px] text-slate-500">Opens WhatsApp app (mobile) or WhatsApp Web (laptop)</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                    Send ↗
                  </span>
                </button>

                {/* 2. Email */}
                <button
                  type="button"
                  onClick={handleShareEmail}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 transition-colors text-left group cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs group-hover:text-blue-900">Share via Email</p>
                      <p className="text-[11px] text-slate-500">Send pre-filled evaluation report to teacher or faculty</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                    Email ↗
                  </span>
                </button>

                {/* 3. Native Device Share (Mobile Apps / Laptop OS Sheet) */}
                <button
                  type="button"
                  onClick={handleNativeShare}
                  disabled={shareLoading}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/70 transition-colors text-left group cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
                      {shareLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs group-hover:text-purple-900">More Device Apps</p>
                      <p className="text-[11px] text-slate-500">Opens native system share dialog (Slack, Teams, AirDrop, etc.)</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-purple-700 bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs">
                    {shareLoading ? 'Preparing...' : 'Open ↗'}
                  </span>
                </button>

                {/* 4. Direct Excel Download */}
                <button
                  type="button"
                  onClick={async () => {
                    await handleExportExcel();
                    setShowShareModal(false);
                  }}
                  disabled={exportLoading !== null}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-left group cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs">Download Excel File (.xlsx)</p>
                      <p className="text-[11px] text-slate-500">Save complete spreadsheet directly to your device</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    Download
                  </span>
                </button>

                {/* 5. Copy Summary */}
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-left group cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 text-white flex items-center justify-center shadow-xs">
                      {copiedSummary ? <Check className="w-5 h-5 text-emerald-300" /> : <Copy className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs">Copy Summary &amp; Link</p>
                      <p className="text-[11px] text-slate-500">Copy formatted summary text to paste anywhere</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border shadow-2xs ${
                    copiedSummary
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {copiedSummary ? 'Copied ✓' : 'Copy'}
                  </span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Portal Data Security Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border-2 border-rose-300 overflow-hidden">
            {/* Red Security Banner */}
            <div className="bg-rose-600 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-rose-700/80 rounded-lg">
                  <ShieldAlert className="w-5 h-5 text-rose-100" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide uppercase">Authorize Production Reset</h3>
                  <p className="text-[11px] text-rose-200">High-Security Administrative Action</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="text-rose-200 hover:text-white p-1 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReset} className="p-5 space-y-4 text-xs">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2">
                <p className="font-bold text-rose-900 flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>DANGER: Irreversible Production Action</span>
                </p>
                <p className="text-rose-700 text-[11px] leading-relaxed">
                  This will <b>permanently delete</b> all student submissions, files on local disk, Google Drive folders, notifications, and background jobs.
                </p>
                <div className="pt-1 border-t border-rose-200/80 flex items-center justify-between text-[11px] text-rose-800 font-semibold">
                  <span>Current live records:</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-rose-200">{metrics?.total_submissions || submissions.length} Submissions</span>
                </div>
              </div>

              {resetError && (
                <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-red-700 font-medium text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">
                  Enter Administrator Password to Proceed:
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Enter your admin password"
                    className="w-full px-3 py-2.5 pr-10 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-hidden font-mono"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Password verification is strictly required by the server to prevent accidental data loss.
                </p>
              </div>

              <label className="flex items-start space-x-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={resetConfirmed}
                  onChange={(e) => setResetConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                />
                <span className="text-[11px] text-slate-700 font-medium leading-snug">
                  I explicitly confirm that I understand all production submissions and Drive files will be deleted permanently and cannot be recovered.
                </span>
              </label>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  disabled={resetLoading}
                  className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancel &amp; Keep Data
                </button>
                <button
                  type="submit"
                  disabled={resetLoading || !resetPassword.trim() || !resetConfirmed}
                  className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-xl font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-md shadow-rose-200"
                >
                  {resetLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying &amp; Resetting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Authorize Reset</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* System Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Configure Assignment &amp; System Rules</h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs mt-4">
              {/* Submission Deadline with Calendar & Clock */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Submission Deadline
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Tap the calendar for date or clock for time
                    </p>
                  </div>
                  {settingsData.submission_deadline && (
                    <span className={`self-start sm:self-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      formatDeadlinePreview().isPast 
                        ? 'bg-red-100 text-red-800 border border-red-200' 
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {formatDeadlinePreview().isPast ? '⚠️ Deadline Passed' : `🟢 ${formatDeadlinePreview().daysDiffText}`}
                    </span>
                  )}
                </div>

                {/* Calendar (Date) and Clock (Time) pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Date Input with Calendar */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-brand-600" />
                      Select Date (Calendar)
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={getDeadlineDate()}
                        onChange={(e) => handleDeadlineDateChange(e.target.value)}
                        onClick={(e) => {
                          try { (e.currentTarget as any).showPicker?.(); } catch {}
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium text-xs shadow-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500 cursor-pointer"
                        title="Click to open calendar"
                      />
                    </div>
                  </div>

                  {/* Time Input with Clock */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-brand-600" />
                      Select Time (Clock)
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        value={getDeadlineTime()}
                        onChange={(e) => handleDeadlineTimeChange(e.target.value)}
                        onClick={(e) => {
                          try { (e.currentTarget as any).showPicker?.(); } catch {}
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium text-xs shadow-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500 cursor-pointer"
                        title="Click to open clock"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Formatted IST Preview */}
                <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <span className="font-semibold text-slate-500">Effective:</span>
                    <span className="font-bold text-brand-700">{formatDeadlinePreview().text}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ISO: {settingsData.submission_deadline || 'Not set'}
                  </span>
                </div>

                {/* Quick 1-Click Presets */}
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Quick Presets:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPresetDeadline(0, 23, 59)}
                      className="px-2 py-1 bg-white border border-slate-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 text-slate-600 rounded-md text-[11px] font-medium transition-colors"
                    >
                      Today 11:59 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetDeadline(1, 23, 59)}
                      className="px-2 py-1 bg-white border border-slate-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 text-slate-600 rounded-md text-[11px] font-medium transition-colors"
                    >
                      Tomorrow 11:59 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetDeadline(7, 23, 59)}
                      className="px-2 py-1 bg-white border border-slate-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 text-slate-600 rounded-md text-[11px] font-medium transition-colors"
                    >
                      +7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetDeadline(14, 23, 59)}
                      className="px-2 py-1 bg-white border border-slate-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 text-slate-600 rounded-md text-[11px] font-medium transition-colors"
                    >
                      +14 Days
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sub_open"
                  checked={settingsData.submissions_open ?? true}
                  onChange={(e) => setSettingsData({ ...settingsData, submissions_open: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="sub_open" className="font-bold text-slate-800">Submissions Open (Accepting uploads)</label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Teacher Email Address</label>
                <input
                  type="email"
                  value={settingsData.teacher_email || ''}
                  onChange={(e) => setSettingsData({ ...settingsData, teacher_email: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max PPT (MB)</label>
                  <input
                    type="number"
                    value={settingsData.max_ppt_size_mb || 50}
                    onChange={(e) => setSettingsData({ ...settingsData, max_ppt_size_mb: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max PDF (MB)</label>
                  <input
                    type="number"
                    value={settingsData.max_pdf_size_mb || 25}
                    onChange={(e) => setSettingsData({ ...settingsData, max_pdf_size_mb: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Video (MB)</label>
                  <input
                    type="number"
                    value={settingsData.max_video_size_mb || 1024}
                    onChange={(e) => setSettingsData({ ...settingsData, max_video_size_mb: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="pdf_req"
                  checked={settingsData.pdf_required ?? false}
                  onChange={(e) => setSettingsData({ ...settingsData, pdf_required: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="pdf_req" className="font-semibold text-slate-800">Make PDF companion mandatory</label>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 border rounded-lg font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settingsSaving}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800"
                >
                  {settingsSaving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
