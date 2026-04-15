import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  X,
  AlertTriangle,
  Send,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  MessageSquare,
} from 'lucide-react';

/**
 * Predefined reason chips the candidate can pick from.
 */
const REASON_SUGGESTIONS = [
  'Internet disconnection during interview',
  'Browser crashed unexpectedly',
  'Audio/microphone issues',
  'System froze or restarted',
  'Power outage',
  'Other technical issue',
];

/**
 * ReInterviewRequestDialog
 *
 * A modal for candidates to request a re-interview with a reason.
 * Also shows the current status of a pending/denied request inline.
 */
const ReInterviewRequestDialog = ({ open, onClose, onSubmit, loading, application }) => {
  const [reason, setReason] = useState('');
  const [selectedChip, setSelectedChip] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 200);
    }
    if (open) {
      setReason('');
      setSelectedChip(null);
    }
  }, [open]);

  const handleChipClick = (suggestion) => {
    if (selectedChip === suggestion) {
      setSelectedChip(null);
      setReason('');
    } else {
      setSelectedChip(suggestion);
      setReason(suggestion);
    }
  };

  const handleSubmit = () => {
    if (reason.trim()) {
      onSubmit(reason.trim());
    }
  };

  const canSubmit = reason.trim().length >= 10;

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
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10" />
              <div className="relative px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                    <RotateCcw className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Request Re-Interview</h3>
                    <p className="text-sm text-slate-500">
                      Tell the employer why you need another chance
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-4">
              {/* Info banner */}
              <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  The employer will review your reason and decide whether to grant a new interview window.
                  Your previous interview data will remain on record.
                </p>
              </div>

              {/* Reason chips */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Common reasons
                </label>
                <div className="flex flex-wrap gap-2">
                  {REASON_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleChipClick(suggestion)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                        selectedChip === suggestion
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-200'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:bg-amber-50'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Your reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  ref={textareaRef}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setSelectedChip(null);
                  }}
                  placeholder="Describe what went wrong during your interview..."
                  rows={4}
                  maxLength={500}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all resize-none"
                />
                <div className="flex justify-between mt-1.5">
                  <p className={`text-xs ${reason.trim().length < 10 && reason.length > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                    {reason.trim().length < 10 && reason.length > 0
                      ? 'Please provide at least 10 characters'
                      : 'Be specific — it helps the employer make a decision'}
                  </p>
                  <span className="text-xs text-slate-400">{reason.length}/500</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Request
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * ReInterviewStatusBadge
 *
 * Inline badge that shows the current re-interview request status.
 * Used on both MyApplications and ApplicationDetails pages.
 */
export const ReInterviewStatusBadge = ({ reInterviewRequest }) => {
  if (!reInterviewRequest || reInterviewRequest.status === 'none') return null;

  const configs = {
    pending: {
      icon: Clock,
      label: 'Re-interview requested',
      sublabel: 'Awaiting employer response',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      iconColor: 'text-amber-600',
      dot: 'bg-amber-500',
    },
    approved: {
      icon: CheckCircle,
      label: 'Re-interview approved',
      sublabel: 'A new interview window has been set',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-800',
      iconColor: 'text-emerald-600',
      dot: 'bg-emerald-500',
    },
    denied: {
      icon: XCircle,
      label: 'Re-interview request denied',
      sublabel: reInterviewRequest.employerNote
        ? `Employer note: ${reInterviewRequest.employerNote}`
        : 'The employer has declined this request',
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      iconColor: 'text-red-600',
      dot: 'bg-red-500',
    },
  };

  const config = configs[reInterviewRequest.status];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-xl border ${config.bg} ${config.border}`}>
      <Icon className={`w-4 h-4 ${config.iconColor} shrink-0 mt-0.5`} />
      <div className="min-w-0">
        <p className={`text-sm font-medium ${config.text}`}>{config.label}</p>
        <p className={`text-xs ${config.text} opacity-75 mt-0.5`}>{config.sublabel}</p>
        {reInterviewRequest.reason && reInterviewRequest.status === 'pending' && (
          <div className="mt-2 flex items-start gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 italic">"{reInterviewRequest.reason}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReInterviewRequestDialog;
