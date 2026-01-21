import React, { useMemo } from 'react';
import { FileDown, Mail, Phone, Sparkles, Award, Zap, Loader2 } from 'lucide-react';
import StatusActionsMenu from './StatusActionsMenu';

const statusColors = {
  'Applied': 'bg-slate-100 text-slate-700',
  'Under Review': 'bg-yellow-100 text-yellow-700',
  'Shortlisted': 'bg-blue-100 text-blue-700',
  'Interview Scheduled': 'bg-amber-100 text-amber-700',
  'Hired': 'bg-emerald-100 text-emerald-700',
  'Rejected': 'bg-rose-100 text-rose-700',
  'Withdrawn': 'bg-gray-100 text-gray-700',
};

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[status] || 'bg-slate-100 text-slate-700'}`}>
    {status}
  </span>
);

const AIScoreBadge = ({ score, verdict }) => {
  const getScoreStyle = (score) => {
    if (score >= 80) return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' };
    if (score >= 60) return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
    if (score >= 40) return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' };
    return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
  };

  if (!score && score !== 0) {
    return (
      <div className="text-xs text-slate-400 italic">Not analyzed</div>
    );
  }

  const style = getScoreStyle(score);
  
  return (
    <div className="flex flex-col gap-1">
      <div className={`inline-flex items-center gap-1 rounded-lg border ${style.border} ${style.bg} px-2.5 py-1`}>
        <Award className={`h-3.5 w-3.5 ${style.text}`} />
        <span className={`text-sm font-bold ${style.text}`}>{score}</span>
        <span className={`text-xs ${style.text}`}>/100</span>
      </div>
      {verdict && (
        <span className="text-xs text-slate-600">{verdict}</span>
      )}
    </div>
  );
};

const ApplicationsTable = ({ applications = [], selectedIds = [], setSelectedIds, onSingleAction, onCandidateClick, onAnalyze, analyzingIds = new Set() }) => {
  const allSelected = useMemo(() => applications.length > 0 && selectedIds.length === applications.length, [applications, selectedIds]);

  const toggleAll = (e) => {
    if (e.target.checked) setSelectedIds(applications.map((a) => a._id));
    else setSelectedIds([]);
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-visible">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="p-3 text-left text-xs font-semibold text-slate-600">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            </th>
            <th className="p-3 text-left text-xs font-semibold text-slate-600">Candidate</th>
            <th className="p-3 text-left text-xs font-semibold text-slate-600">Contact</th>
            <th className="p-3 text-left text-xs font-semibold text-slate-600">Applied</th>
            <th className="p-3 text-left text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                AI Score
              </div>
            </th>
            <th className="p-3 text-left text-xs font-semibold text-slate-600">Resume</th>
            <th className="p-3 text-left text-xs font-semibold text-slate-600">Status</th>
            <th className="p-3 text-right text-xs font-semibold text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {applications.map((app) => {
            const name = app?.candidate?.user?.fullName || '—';
            const email = app?.candidate?.user?.email || '—';
            const phone = app?.candidate?.user?.phoneNumber || '—';
            const appliedDate = app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '—';
            const resumeName = app?.resume?.fileName || app?.resume?.originalName || app?.candidate?.resume?.fileName || 'Resume';
            const resumePath = app?.resume?.filePath || app?.resume?.fileUrl || app?.candidate?.resume?.filePath || app?.candidate?.resume?.fileUrl;
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
            const resumeUrl = resumePath ? (resumePath.startsWith('http') ? resumePath : `${API_BASE_URL}${resumePath.startsWith('/') ? '' : '/'}${resumePath}`) : '#';

            return (
              <tr key={app._id} className="hover:bg-slate-50">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(app._id)}
                    onChange={() => toggleOne(app._id)}
                  />
                </td>
                <td className="p-3">
                    <button 
                      onClick={() => onCandidateClick && onCandidateClick(app)}
                      className="text-left hover:bg-slate-100 rounded p-1 -ml-1 transition-colors group"
                    >
                      <span className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                        {name}
                      </span>
                      <span className="block text-xs text-slate-500">{app?.candidate?.professionalTitle || ''}</span>
                    </button>
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-1">
                    <a href={`mailto:${email}`} className="inline-flex items-center gap-1 text-sm text-slate-700 hover:text-slate-900">
                      <Mail className="h-4 w-4" /> {email}
                    </a>
                    <span className="inline-flex items-center gap-1 text-sm text-slate-700">
                      <Phone className="h-4 w-4" /> {phone}
                    </span>
                  </div>
                </td>
                <td className="p-3 text-sm text-slate-700">{appliedDate}</td>
                <td className="p-3">
                  <AIScoreBadge 
                    score={app.aiScore || app.resumeScore} 
                    verdict={app.aiVerdict}
                  />
                </td>
                <td className="p-3">
                  <a href={resumeUrl} target="_blank" className="inline-flex items-center gap-1 text-sm text-slate-700 hover:text-slate-900">
                    <FileDown className="h-4 w-4" /> {resumeName}
                  </a>
                </td>
                <td className="p-3">
                  <StatusBadge status={app.status} />
                </td>
                <td className="p-3 text-right">
                  <StatusActionsMenu
                    application={app}
                    onAction={(type, payload) => onSingleAction(app._id, type, payload)}
                  />
                </td>
              </tr>
            );
          })}
          {applications.length === 0 && (
            <tr>
              <td colSpan="8" className="p-6 text-center text-sm text-slate-500">No applications found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ApplicationsTable;