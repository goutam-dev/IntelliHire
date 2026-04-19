import React, { useEffect, useMemo, useState } from 'react';
import { FileDown, Mail, Phone, Sparkles, Award, Zap, Loader2, RotateCcw, Eye } from 'lucide-react';
import StatusActionsMenu from './StatusActionsMenu';
import { resolveUploadUrl } from '../utils/mediaUrl';

const statusColors = {
  'Applied': 'bg-zinc-100 text-zinc-700',
  'Shortlisted': 'bg-indigo-100 text-indigo-700',
  'Interview Scheduled': 'bg-violet-100 text-violet-700',
  'Interviewed': 'bg-teal-100 text-teal-700',
  'Finalist': 'bg-indigo-100 text-indigo-700',
  'Job Deleted': 'bg-zinc-200 text-zinc-800',
  'Hired': 'bg-emerald-100 text-emerald-700',
  'Rejected': 'bg-rose-100 text-rose-700',
  'Withdrawn': 'bg-zinc-100 text-zinc-700',
};

const getAvatarColor = (name) => {
  const colors = [
    'bg-rose-100 text-rose-700 border-rose-200',
    'bg-pink-100 text-pink-700 border-pink-200',
    'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    'bg-purple-100 text-purple-700 border-purple-200',
    'bg-violet-100 text-violet-700 border-violet-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-sky-100 text-sky-700 border-sky-200',
    'bg-cyan-100 text-cyan-700 border-cyan-200',
    'bg-teal-100 text-teal-700 border-teal-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
  ];
  if (!name || name === '—') return 'bg-zinc-100 text-zinc-600 border-zinc-200';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${statusColors[status] || 'bg-zinc-100 text-zinc-700'}`}>
    {status}
  </span>
);

const AIScoreBadge = ({ score, verdict }) => {
  const getScoreStyle = (score) => {
    if (score >= 80) return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' };
    if (score >= 60) return { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' };
    if (score >= 40) return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' };
    return { bg: 'bg-zinc-100', text: 'text-zinc-600', border: 'border-zinc-200' };
  };

  if (!score && score !== 0) {
    return (
      <div className="text-xs text-zinc-400 font-medium italic">Not analyzed</div>
    );
  }

  const style = getScoreStyle(score);
  
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`inline-flex items-center w-max gap-1.5 rounded-lg border ${style.border} ${style.bg} px-2.5 py-1 shadow-sm`}>
        <Award className={`h-4 w-4 ${style.text}`} />
        <span className={`text-sm font-black ${style.text}`}>{score}</span>
        <span className={`text-xs font-semibold ${style.text}`}>/100</span>
      </div>
      {verdict && (
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mt-0.5 ml-1">{verdict}</span>
      )}
    </div>
  );
};

const InterviewScoreBadge = ({ score, verdict }) => {
  if (score == null) {
    return <div className="text-xs font-medium text-zinc-400 italic">—</div>;
  }

  const getStyle = (s) => {
    if (s >= 7) return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' };
    if (s >= 5) return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' };
    return { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' };
  };

  const style = getStyle(score);

  return (
    <div className="flex flex-col gap-1.5">
      <div className={`inline-flex items-center w-max gap-1.5 rounded-lg border ${style.border} ${style.bg} px-2.5 py-1 shadow-sm`}>
        <Sparkles className={`h-4 w-4 ${style.text}`} />
        <span className={`text-sm font-black ${style.text}`}>{score}</span>
        <span className={`text-xs font-semibold ${style.text}`}>/10</span>
      </div>
      {verdict && <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mt-0.5 ml-1 truncate max-w-[120px]">{verdict}</span>}
    </div>
  );
};

const ApplicationsTable = ({ applications = [], selectedIds = [], setSelectedIds, onSingleAction, onCandidateClick, onDetailsClick, onAnalyze, analyzingIds = new Set() }) => {
  const allSelected = useMemo(() => applications.length > 0 && selectedIds.length === applications.length, [applications, selectedIds]);
  const [avatarLoadFailedById, setAvatarLoadFailedById] = useState({});

  useEffect(() => {
    setAvatarLoadFailedById({});
  }, [applications]);

  const toggleAll = (e) => {
    if (e.target.checked) setSelectedIds(applications.map((a) => a._id));
    else setSelectedIds([]);
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="bg-white rounded-3xl border border-zinc-200 overflow-visible">
      <div className="overflow-x-auto custom-scrollbar pb-2">
        <table className="min-w-[1000px] w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="p-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-widest pl-4">
                <input 
                  type="checkbox" 
                  checked={allSelected} 
                  onChange={toggleAll}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
              </th>
              <th className="p-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Candidate</th>
              <th className="p-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Contact</th>
              <th className="p-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Applied</th>
              <th className="p-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  AI Score
                </div>
              </th>
              <th className="p-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-teal-500" />
                  Interview
                </div>
              </th>
              <th className="p-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Resume</th>
              <th className="p-3 text-center text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                <div className="flex items-center justify-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  Analyze
                </div>
              </th>
              <th className="p-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
              <th className="p-3 text-right text-[11px] font-bold text-zinc-500 uppercase tracking-widest pr-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {applications.map((app) => {
            const name = app?.candidate?.user?.fullName || '—';
            const email = app?.candidate?.user?.email || '—';
            const phone = app?.candidate?.user?.phoneNumber || '—';
            const appliedDate = app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '—';
            const resumeName = app?.resume?.fileName || app?.resume?.originalName || app?.candidate?.resume?.fileName || 'Resume';
            const resumePath = app?.resume?.filePath || app?.resume?.fileUrl || app?.candidate?.resume?.filePath || app?.candidate?.resume?.fileUrl;
            const resumeUrl = resolveUploadUrl(resumePath) || '#';
            const candidatePhotoUrl = resolveUploadUrl(app?.candidate?.profilePhotoUrl || null);
            const showAvatarFallback = !candidatePhotoUrl || avatarLoadFailedById[app._id];
            const initials = name !== '—' ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';

            return (
              <tr key={app._id} className="even:bg-zinc-50/50 hover:bg-zinc-50 transition-colors group">
                <td className="p-3 pl-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(app._id)}
                    onChange={() => toggleOne(app._id)}
                    className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                  />
                </td>
                <td className="p-3 min-w-[220px]">
                    <button 
                      onClick={() => onCandidateClick && onCandidateClick(app)}
                      className="flex items-center gap-3 w-full text-left hover:bg-zinc-100/80 rounded-xl p-2 -ml-2 transition-all group"
                    >
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold border transition-colors overflow-hidden ${showAvatarFallback ? getAvatarColor(name) : 'bg-white border-zinc-200'}`}>
                        {!showAvatarFallback && (
                          <img
                            src={candidatePhotoUrl}
                            alt={name}
                            className="h-full w-full object-cover"
                            onError={() => setAvatarLoadFailedById((prev) => ({ ...prev, [app._id]: true }))}
                          />
                        )}
                        {showAvatarFallback && initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-zinc-900 group-hover:text-zinc-600 transition-colors block truncate">
                          {name}
                        </span>
                        {app?.candidate?.professionalTitle && (
                          <span className="block text-[11px] font-medium text-zinc-500 mt-0.5 truncate">{app.candidate.professionalTitle}</span>
                        )}
                      </div>
                    </button>
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-1.5 min-w-[160px]">
                    <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-600 hover:text-zinc-900 transition-colors truncate max-w-full">
                      <Mail className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" /> <span className="truncate">{email}</span>
                    </a>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-600 truncate max-w-full">
                      <Phone className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" /> <span className="truncate">{phone}</span>
                    </span>
                  </div>
                </td>
                <td className="p-3 whitespace-nowrap text-sm font-medium text-zinc-600">{appliedDate}</td>
                <td className="p-3 whitespace-nowrap">
                  <AIScoreBadge 
                    score={app.aiScore || app.resumeScore} 
                    verdict={app.aiVerdict}
                  />
                </td>
                <td className="p-3 whitespace-nowrap">
                  <InterviewScoreBadge
                    score={app.interviewScore}
                    verdict={app.interviewVerdict}
                  />
                </td>
                <td className="p-3 min-w-[120px] max-w-[150px]">
                  <a href={resumeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-600 hover:text-zinc-900 transition-colors group/link truncate w-full">
                    <FileDown className="h-4 w-4 text-zinc-400 group-hover/link:text-zinc-600 flex-shrink-0" /> 
                    <span className="truncate">{resumeName}</span>
                  </a>
                </td>
                <td className="p-3 whitespace-nowrap">
                  <div className="flex justify-center">
                    <button
                      onClick={() => onAnalyze && onAnalyze(app._id)}
                      disabled={analyzingIds.has(app._id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-zinc-50 to-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {analyzingIds.has(app._id) ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Zap className="h-3.5 w-3.5 text-amber-500" />
                          Analyze
                        </>
                      )}
                    </button>
                  </div>
                </td>
                <td className="p-3 whitespace-nowrap">
                  <div className="flex flex-col gap-1.5 items-start">
                    <StatusBadge status={app.status} />
                    {app.job?.status === 'closed' && (
                      <span className="text-[11px] font-medium text-orange-700">Job is closed for new applications.</span>
                    )}
                    {app.status === 'Job Deleted' && (
                      <span className="text-[11px] font-medium text-zinc-600">Role deleted, record kept for audit.</span>
                    )}
                    {app.reInterviewRequest?.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                        <RotateCcw className="h-3 w-3" />
                        Re-interview requested
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-right align-top relative pr-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onDetailsClick && onDetailsClick(app)}
                      className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 hover:border-zinc-300 transition-colors shadow-sm"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <StatusActionsMenu
                      application={app}
                      onAction={(type, payload) => onSingleAction(app._id, type, payload)}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
          {applications.length === 0 && (
            <tr>
              <td colSpan="10" className="p-8 text-center text-sm font-medium text-zinc-500">No applications found.</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
};

export default ApplicationsTable;