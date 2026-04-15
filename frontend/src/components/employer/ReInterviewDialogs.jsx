import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, RotateCcw, MessageSquare, Clock, XCircle, Loader2 } from 'lucide-react';

const getLocalDateTimeInputValue = (date = new Date()) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

/**
 * ReInterviewApproveDialog — used by employer to approve a re-interview request
 * with a new interview window. Much more polished than a browser prompt().
 */
export const ReInterviewApproveDialog = ({ open, onClose, onApprove, application, loading }) => {
  const [start, setStart] = useState(getLocalDateTimeInputValue());
  const [end, setEnd] = useState('');
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState('');

  const handleApprove = () => {
    if (!start || !end) { setError('Both start and end are required.'); return; }
    const s = new Date(start);
    const e = new Date(end);
    if (s < new Date()) { setError('Start cannot be in the past.'); return; }
    if (e <= s) { setError('End must be after start.'); return; }
    setError('');
    onApprove({ interviewWindowStart: start, interviewWindowEnd: end, instructions });
  };

  const candidateName = application?.candidate?.user?.fullName || 'Candidate';
  const reason = application?.reInterviewRequest?.reason || '';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10" />
              <div className="relative px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Approve Re-Interview</h3>
                    <p className="text-sm text-slate-500">
                      Set a new interview window for {candidateName}
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Candidate's reason */}
            {reason && (
              <div className="px-6 pt-3">
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <MessageSquare className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-800 mb-0.5">Candidate's reason</p>
                    <p className="text-sm text-amber-700 italic">"{reason}"</p>
                  </div>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Interview Start <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
                  value={start}
                  onChange={(e) => { setError(''); setStart(e.target.value); }}
                  min={getLocalDateTimeInputValue()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Interview End <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
                  value={end}
                  onChange={(e) => { setError(''); setEnd(e.target.value); }}
                  min={start || getLocalDateTimeInputValue()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Instructions (optional)</label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all resize-none"
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Any notes for the candidate..."
                />
              </div>
              {error && (
                <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button onClick={onClose} disabled={loading} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={!start || !end || loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {loading ? 'Approving...' : 'Approve & Schedule'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * ReInterviewDenyDialog — used by employer to deny a re-interview request
 * with an optional note.
 */
export const ReInterviewDenyDialog = ({ open, onClose, onDeny, application, loading }) => {
  const [note, setNote] = useState('');

  const candidateName = application?.candidate?.user?.fullName || 'Candidate';
  const reason = application?.reInterviewRequest?.reason || '';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 via-red-500/10 to-orange-500/10" />
              <div className="relative px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg shadow-rose-500/25">
                    <XCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Deny Re-Interview</h3>
                    <p className="text-sm text-slate-500">
                      Deny {candidateName}'s request
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Candidate's reason */}
            {reason && (
              <div className="px-6 pt-3">
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <MessageSquare className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-800 mb-0.5">Candidate's reason</p>
                    <p className="text-sm text-amber-700 italic">"{reason}"</p>
                  </div>
                </div>
              </div>
            )}

            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Note to candidate (optional)</label>
              <textarea
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 transition-all resize-none"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Explain your decision (visible to candidate)..."
              />
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button onClick={onClose} disabled={loading} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => onDeny({ note })}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-lg shadow-rose-500/25 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {loading ? 'Denying...' : 'Deny Request'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
