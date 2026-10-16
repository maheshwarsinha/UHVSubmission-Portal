import React, { useState, useEffect } from 'react';
import { GraduationCap, ShieldCheck, Clock, Wifi, Lock } from 'lucide-react';

interface HeaderProps {
  currentTab: 'student' | 'lookup' | 'admin';
  onTabChange: (tab: 'student' | 'lookup' | 'admin') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onTabChange }) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }) + ' IST'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20 gap-2">
          {/* Logo & Portal Identity */}
          <div className="flex items-center space-x-2.5 sm:space-x-4 cursor-pointer min-w-0" onClick={() => onTabChange('student')}>
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shadow-md shadow-brand-500/20 shrink-0">
              <GraduationCap className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2 mb-0.5">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200 truncate">
                  LAN Portal
                </span>
                <span className="hidden xs:inline-flex items-center text-[10px] sm:text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded border border-emerald-200">
                  <Wifi className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" /> Live
                </span>
              </div>
              <h1 className="text-sm sm:text-xl font-extrabold text-slate-900 leading-tight truncate">
                UHV Submissions
              </h1>
              <p className="text-[11px] text-slate-500 hidden md:block truncate">
                Universal Human Values &bull; Coursework Submission
              </p>
            </div>
          </div>

          {/* Time & Nav Actions */}
          <div className="flex items-center space-x-1 sm:space-x-3 shrink-0">
            <div className="hidden lg:flex items-center text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-mono">
              <Clock className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
              <span>{currentTime || 'Loading IST...'}</span>
            </div>

            <nav className="flex items-center space-x-1 sm:space-x-2">
              <button
                onClick={() => onTabChange('student')}
                className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  currentTab === 'student'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>Submit</span>
                <span className="hidden sm:inline"> Assignment</span>
              </button>
              <button
                onClick={() => onTabChange('lookup')}
                className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  currentTab === 'lookup'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>Track</span>
                <span className="hidden sm:inline"> Receipt</span>
              </button>
              <button
                onClick={() => onTabChange('admin')}
                className={`flex items-center px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all border ${
                  currentTab === 'admin'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                <span>Admin</span>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};
