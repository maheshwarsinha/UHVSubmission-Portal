import React from 'react';
import { User, Hash, BookMarked, Layers, Calendar, Mail, Tag, CheckCircle2 } from 'lucide-react';
import { StudentFormData, AssignmentConfig } from '../../types';

interface StudentDetailsFormProps {
  formData: StudentFormData;
  onChange: (field: keyof StudentFormData, value: string) => void;
  config: AssignmentConfig | null;
}

export const StudentDetailsForm: React.FC<StudentDetailsFormProps> = ({
  formData,
  onChange,
  config,
}) => {
  const allowedSections = config?.allowed_sections || ['CSE1', 'CSE2', 'CSE3', 'CSE-AI'];
  const allowedBranches = config?.allowed_branches || [
    'Computer Science and Engineering',
    'Information Technology',
    'Artificial Intelligence & Data Science',
  ];
  const allowedYears = config?.allowed_years || ['2nd Year', '3rd Year', '4th Year'];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-8 mb-6 sm:mb-8">
      <div className="flex items-center justify-between pb-4 sm:pb-6 border-b border-slate-100">
        <div>
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
            Step 1 &bull; Identification
          </span>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-2">
            Student &amp; Academic Information
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Please enter your university registered details accurately.
          </p>
        </div>
        <div className="hidden sm:flex items-center text-xs text-slate-500">
          <span className="text-rose-500 mr-1">*</span> All fields required
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mt-5 sm:mt-6">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={formData.name}
              onChange={(e) => onChange('name', e.target.value)}
              className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm text-slate-900 focus:ring-2 focus:ring-brand-500 focus:bg-white focus:outline-none transition-all"
              required
            />
          </div>
        </div>

        {/* University Roll Number */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            University Roll Number <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Hash className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="e.g. 25001390001"
              value={formData.roll_number}
              onChange={(e) => onChange('roll_number', e.target.value)}
              className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-mono text-slate-900 uppercase focus:ring-2 focus:ring-brand-500 focus:bg-white focus:outline-none transition-all"
              required
            />
          </div>
        </div>

        {/* Section */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Section <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Layers className="w-4 h-4" />
            </div>
            <select
              value={formData.section}
              onChange={(e) => onChange('section', e.target.value)}
              className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm text-slate-900 focus:ring-2 focus:ring-brand-500 focus:bg-white focus:outline-none transition-all"
              required
            >
              <option value="">Select Section</option>
              {allowedSections.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Branch */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Branch / Department <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <BookMarked className="w-4 h-4" />
            </div>
            <select
              value={formData.branch}
              onChange={(e) => onChange('branch', e.target.value)}
              className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm text-slate-900 focus:ring-2 focus:ring-brand-500 focus:bg-white focus:outline-none transition-all"
              required
            >
              <option value="">Select Branch</option>
              {allowedBranches.map((br) => (
                <option key={br} value={br}>
                  {br}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Academic Year */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Academic Year <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Calendar className="w-4 h-4" />
            </div>
            <select
              value={formData.academic_year}
              onChange={(e) => onChange('academic_year', e.target.value)}
              className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm text-slate-900 focus:ring-2 focus:ring-brand-500 focus:bg-white focus:outline-none transition-all"
              required
            >
              <option value="">Select Year</option>
              {allowedYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Student Category */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Student Category <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Tag className="w-4 h-4" />
            </div>
            <select
              value={formData.student_category}
              onChange={(e) => onChange('student_category', e.target.value)}
              className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm text-slate-900 focus:ring-2 focus:ring-brand-500 focus:bg-white focus:outline-none transition-all"
              required
            >
              <option value="Regular">Regular Student</option>
              <option value="Backlog">Backlog Student</option>
            </select>
          </div>
        </div>

        {/* Student Email */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Official Email Address <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              placeholder="e.g. student@university.edu.in"
              value={formData.email}
              onChange={(e) => onChange('email', e.target.value)}
              className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm text-slate-900 focus:ring-2 focus:ring-brand-500 focus:bg-white focus:outline-none transition-all"
              required
            />
          </div>
        </div>

        {/* Assignment Topic */}
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            UHV Assignment Topic <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <BookMarked className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="e.g. Harmony in the Self and Body: Sanyama and Swasthya"
              value={formData.topic}
              onChange={(e) => onChange('topic', e.target.value)}
              className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm text-slate-900 focus:ring-2 focus:ring-brand-500 focus:bg-white focus:outline-none transition-all"
              required
            />
          </div>
        </div>
      </div>
    </div>
  );
};
