import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, Award, MessageSquare, Clock, 
  RotateCcw, Check, XCircle as XCircleIcon, 
  Loader2, ChevronRight, FileText, CalendarClock 
} from 'lucide-react';

const StatusBadge = ({ status }) => {
  const statusColors = {
    'Applied': 'bg-slate-100 text-slate-700 border-slate-200',
    'Shortlisted': 'bg-blue-100 text-blue-700 border-blue-200',
    'Interview Scheduled': 'bg-amber-100 text-amber-700 border-amber-200',
    'Interviewed': 'bg-teal-100 text-teal-700 border-teal-200',
    'Finalist': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Job Deleted': 'bg-gray-200 text-gray-800 border-gray-300',
    'Hired': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Rejected': 'bg-rose-100 text-rose-700 border-rose-200',
    'Withdrawn': 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const style = statusColors[status] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${style}`}>
      <span className="relative flex h-2 w-2 mr-1.5">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.split(' ')[1].replace('text-', 'bg-')}`}></span>
        <span className={`relative inline-flex rounded-full h-2 w-2 ${style.split(' ')[1].replace('text-', 'bg-')}`}></span>
      </span>
      {status}
    </span>
  );
};

const MetricCard = ({ title, icon: Icon, value, max, verdict, colorClass, borderClass, bgClass, button }) => (
  <div className={`relative overflow-hidden rounded-2xl border ${borderClass} bg-white p-5 shadow-sm transition-all hover:shadow-md h-full flex flex-col`}>
    <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl ${bgClass}`}></div>
    
    <div className="flex items-center gap-2 mb-4">
      <div className={`rounded-xl p-2.5 ${bgClass} shadow-sm`}>
        <Icon className={`h-5 w-5 ${colorClass}`} />
      </div>
      <h3 className="font-semibold text-slate-800">{title}</h3>
    </div>
    
    {value !== undefined && value !== null ? (
      <div className="flex-1 space-y-3">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-4xl font-extrabold tracking-tight ${colorClass}`}>{value}</span>
          <span className="text-sm font-medium text-slate-400">/ {max}</span>
        </div>
        {verdict && (
          <p className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
            {verdict}
          </p>
        )}
      </div>
    ) : (
      <div className="flex-1 flex flex-col items-center justify-center py-6 text-slate-400">
        <div className="h-10 w-10 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center mb-3">
          <Icon className="h-4 w-4 text-slate-300" />
        </div>
        <p className="text-sm font-medium">Not evaluated yet</p>
      </div>
    )}

    {button && (
      <div className="mt-4 pt-4 border-t border-slate-100">
        {button}
      </div>
    )}
  </div>
);

const formatInterviewLabel = (note) => {
  if (!note || typeof note !== 'string') return note;
  const normalized = note.replace(/\bInterview\s+Window:/gi, 'Interview Schedule:');
  return normalized.replace(/\bWindow:/gi, 'Interview Schedule:');
};

const ApplicationDetailsModal = ({ 
  open, 
  onClose, 
  application, 
  onAnalyze, 
  analyzingIds = new Set(), 
  onViewInterviewReport, 
  onApproveReInterview, 
  onDenyReInterview 
}) => {
  if (!open) return null;

  const candidateName = application?.candidate?.user?.fullName || 'Candidate';
  const appliedDate = application?.createdAt ? new Date(application.createdAt).toLocaleString() : 'Date N/A';
  const isAnalyzing = analyzingIds.has(application?._id);
  const employerNote = application?.employerNotes || application?.feedback;
  const formattedEmployerNote = formatInterviewLabel(employerNote);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-4 sm:p-6" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
            className="relative w-full max-w-4xl bg-[#f8fafc] rounded-3xl shadow-2xl flex flex-col max-h-[90vh] border border-slate-200/60 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 bg-white border-b border-slate-100 z-10 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight" id="modal-title">
                    Application Details
                  </h2>
                  <StatusBadge status={application?.status} />
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                  <span className="text-slate-800">{candidateName}</span>
                  <ChevronRight className="h-3 w-3" />
                  <span>Applied on {appliedDate}</span>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="rounded-full p-2.5 hover:bg-slate-100 transition-colors bg-white border border-slate-200 text-slate-500 hover:text-slate-700 shadow-sm"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-8 overflow-y-auto flex-1 space-y-8 scroll-smooth design-scrollbar">
              
              {/* Re-Interview Request Banner */}
              {application?.reInterviewRequest?.status === 'pending' && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm overflow-hidden"
                >
                  <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-6">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-inner shrink-0 rotate-3">
                        <RotateCcw className="w-6 h-6 text-white drop-shadow-sm" />
                      </div>
                      <div className="space-y-2 pt-0.5">
                        <div>
                          <h4 className="text-base font-bold text-amber-900 flex items-center gap-2">
                            Re-Interview Requested
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 border border-amber-200">
                              Action Required
                            </span>
                          </h4>
                          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 mt-1">
                            <Clock className="w-3.5 h-3.5" />
                            Requested via Support on {application.reInterviewRequest.requestedAt ? new Date(application.reInterviewRequest.requestedAt).toLocaleDateString() : 'Recently'}
                          </div>
                        </div>
                        
                        {application.reInterviewRequest.reason && (
                          <div className="mt-3 relative">
                            <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-300 rounded-l-md"></div>
                            <div className="bg-white/80 rounded-r-md rounded-l-sm py-2.5 pr-4 pl-4 text-sm text-amber-900 border border-amber-100 border-l-0 shadow-sm leading-relaxed">
                              "{application.reInterviewRequest.reason}"
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {(onApproveReInterview || onDenyReInterview) && (
                      <div className="flex flex-col sm:flex-row gap-3 items-center sm:items-start shrink-0 min-w-fit pt-1">
                        {onApproveReInterview && (
                          <button
                            onClick={() => onApproveReInterview(application)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
                          >
                            <Check className="w-4 h-4" />
                            Approve
                          </button>
                        )}
                        {onDenyReInterview && (
                          <button
                            onClick={() => onDenyReInterview(application)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 hover:border-rose-300 shadow-sm transition-all"
                          >
                            <XCircleIcon className="w-4 h-4" />
                            Deny
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* AI Score */}
                <MetricCard 
                  title="AI Resume Score" 
                  icon={Sparkles}
                  value={application?.aiScore}
                  max={100}
                  verdict={application?.aiVerdict}
                  colorClass="text-violet-600"
                  bgClass="bg-violet-100"
                  borderClass="border-violet-100"
                  button={
                    onAnalyze && (
                      <button
                        onClick={() => onAnalyze(application._id)}
                        disabled={isAnalyzing}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-violet-50 text-violet-700 border border-violet-200 px-4 py-2.5 text-sm font-semibold hover:bg-violet-100 hover:text-violet-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isAnalyzing ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</>
                        ) : (
                          <><Sparkles className="h-4 w-4" /> Re-Analyze Resume</>
                        )}
                      </button>
                    )
                  }
                />

                {/* Interview Score */}
                <MetricCard 
                  title="AI Interview Score" 
                  icon={Award}
                  value={application?.interviewScore}
                  max={10}
                  verdict={application?.interviewVerdict}
                  colorClass="text-teal-600"
                  bgClass="bg-teal-100"
                  borderClass="border-teal-100"
                  button={
                    onViewInterviewReport && application?.status === 'Interviewed' && (
                      <button
                        onClick={() => onViewInterviewReport(application)}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 text-white shadow-md shadow-teal-500/20 px-4 py-2.5 text-sm font-bold hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-600/30 transition-all"
                      >
                        <CalendarClock className="h-4 w-4" /> View Full Report
                      </button>
                    )
                  }
                />
              </div>

              {/* Employer Notes */}
              {employerNote && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-slate-400" />
                    Employer Notes & Feedback
                  </h3>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium break-words overflow-wrap-anywhere">
                    {formattedEmployerNote}
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ApplicationDetailsModal;
