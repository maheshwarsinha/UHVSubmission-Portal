import React from 'react';
import { Shield, BookOpen, Server } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-white font-bold mb-2">
              <BookOpen className="w-4 h-4 text-brand-400" />
              <span>Universal Human Values Cell</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Academic submission repository for Universal Human Values presentations. Designed for concurrent campus LAN submissions.
            </p>
          </div>
          <div>
            <div className="flex items-center space-x-2 text-white font-bold mb-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Security &amp; Archival</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              All files are validated on-premise, hashed with SHA-256 integrity checksums, and asynchronously archived to institutional Google Drive.
            </p>
          </div>
          <div>
            <div className="flex items-center space-x-2 text-white font-bold mb-2">
              <Server className="w-4 h-4 text-sky-400" />
              <span>Submission Guidelines</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Official Deadline: <b>26 October 2026</b>. Applicable for CSE1, CSE2, CSE3, CSE-AI, and registered Backlog students.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center pt-6 text-slate-500">
          <p>&copy; 2026 University Department of Humanities &amp; Applied Sciences. All rights reserved.</p>
          <p className="mt-2 sm:mt-0 font-mono">UHV-PORTAL v1.0 &bull; High-Concurrency Production Build</p>
        </div>
      </div>
    </footer>
  );
};
