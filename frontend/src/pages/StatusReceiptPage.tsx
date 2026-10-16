import React, { useState } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api';
import { SubmissionReceipt } from '../components/student/SubmissionReceipt';
import { SubmissionReceipt as ReceiptType } from '../types';

export const StatusReceiptPage: React.FC = () => {
  const [trackingId, setTrackingId] = useState<string>('');
  const [receipt, setReceipt] = useState<ReceiptType | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId.trim()) return;

    setLoading(true);
    setError(null);
    setReceipt(null);

    try {
      const data = await apiService.getReceipt(trackingId.trim());
      setReceipt(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'No submission found with this Tracking ID.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
      <div className="text-center mb-6 sm:mb-10">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
          Student Self-Service
        </span>
        <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 mt-2">
          Track Your Assignment Submission
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-lg mx-auto">
          Enter your unique Tracking ID issued during your assignment upload to inspect status, server confirmation, and print receipts.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mt-6 max-w-md mx-auto flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="e.g. UHV-2026-ABCD12"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
              className="w-full px-4 py-2.5 sm:py-3 bg-white border border-slate-300 rounded-xl text-base sm:text-sm font-mono uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md shadow-brand-500/20 transition-all cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Lookup</span>
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold max-w-md mx-auto flex items-center justify-center">
            <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {receipt && (
        <div>
          <SubmissionReceipt receipt={receipt} />
        </div>
      )}
    </div>
  );
};
