import React from 'react';
import { Calendar, AlertCircle, FileCheck, Video, Clock, Users } from 'lucide-react';
import { AssignmentConfig } from '../../types';

interface AssignmentBannerProps {
  config: AssignmentConfig | null;
}

export const AssignmentBanner: React.FC<AssignmentBannerProps> = ({ config }) => {
  return (
    <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-slate-900 text-white rounded-2xl shadow-xl overflow-hidden mb-6 sm:mb-8 border border-brand-700/50">
      <div className="p-4 sm:p-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6 pb-5 sm:pb-6 border-b border-brand-700/60">
          <div>
            <div className="inline-flex items-center space-x-2 bg-brand-500/20 text-brand-300 text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1 rounded-full border border-brand-400/30 mb-2 sm:mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Official University Notice &bull; Mandatory Coursework</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white leading-snug">
              {config?.assignment_title || 'Universal Human Values (UHV) Assignment — PPT Presentation'}
            </h2>
            <p className="text-brand-200 text-xs sm:text-sm mt-1 max-w-2xl">
              Applicable for: <b>CSE1</b>, <b>CSE2</b>, <b>CSE3</b>, <b>CSE-AI</b>, and applicable <b>Backlog</b> students.
            </p>
          </div>

          {/* Deadline Box */}
          <div className="bg-white/10 backdrop-blur-md p-3.5 sm:px-5 sm:py-4 rounded-xl border border-white/20 w-full lg:w-auto text-left lg:text-right shrink-0">
            <div className="flex items-center lg:justify-end space-x-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-amber-300 mb-0.5 sm:mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Submission Deadline</span>
            </div>
            <div className="text-base sm:text-xl font-black text-white font-mono break-words">
              {config?.deadline_formatted_ist || '26 October 2026 at 11:59 PM IST'}
            </div>
            <p className="text-[10px] sm:text-[11px] text-amber-200/90 mt-0.5 sm:mt-1">
              &bull; Submission timing may affect marks under evaluation criteria.
            </p>
          </div>
        </div>

        {/* 6 Key Rules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-300 flex items-center justify-center shrink-0">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">4–5 PowerPoint Slides</h4>
              <p className="text-xs text-brand-200/80 mt-0.5">
                Select an approved topic from the UHV syllabus. Keep presentation focused and concise.
              </p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-300 flex items-center justify-center shrink-0">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Video Within 5 Minutes</h4>
              <p className="text-xs text-brand-200/80 mt-0.5">
                Record presentation video: PPT slides and student's face must both be clearly visible throughout.
              </p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-300 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Slide 1 Title Credentials</h4>
              <p className="text-xs text-brand-200/80 mt-0.5">
                Must state: Topic, Student Name, Branch, Section, Year, and University Roll Number.
              </p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-300 flex items-center justify-center shrink-0">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Mandatory Slide Footers</h4>
              <p className="text-xs text-brand-200/80 mt-0.5">
                Include the topic title and university roll number in the footer of every slide.
              </p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-300 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Separate Hard Copy</h4>
              <p className="text-xs text-brand-200/80 mt-0.5">
                In addition to this digital upload, submit the required hard copy separately to the instructor.
              </p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-300 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Strict Filename Convention</h4>
              <p className="text-xs text-brand-200/80 mt-0.5">
                Files must be named <code className="bg-white/10 px-1 py-0.5 rounded text-amber-300 font-mono">Roll_Section_Name</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
