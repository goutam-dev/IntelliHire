import React, { useState } from 'react';
import { MoreHorizontal, CheckCircle2, XCircle, CalendarClock, Handshake } from 'lucide-react';
import { createPortal } from 'react-dom';
import Textarea from './forms/Textarea';

const MenuItem = ({ icon: Icon, label, onClick }) => (
  <button
    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50"
    onClick={onClick}
    type="button"
  >
    <Icon className="h-4 w-4" /> {label}
  </button>
);

const getLocalDateTimeInputValue = (date = new Date()) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const StatusActionsMenu = ({ application, onAction }) => {
  const [open, setOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [interviewStart, setInterviewStart] = useState(getLocalDateTimeInputValue());
  const [interviewDeadline, setInterviewDeadline] = useState('');
  const [instructions, setInstructions] = useState('');
  const [interviewError, setInterviewError] = useState('');
  const menuRef = React.useRef(null);
  const buttonRef = React.useRef(null);
  const dropdownRef = React.useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const status = application?.status;
  const isTerminal = ['Rejected', 'Hired', 'Withdrawn', 'Job Closed', 'Job Deleted'].includes(status);

  const canReschedule = (() => {
    if (status !== 'Interview Scheduled') return false;
    if (application?.interviewLocked) return false;
    if (!application?.interviewWindowEnd) return false;
    return new Date(application.interviewWindowEnd) > new Date();
  })();

  const hasCompletedInterview = Boolean(application?.interviewCompletedAt || status === 'Interviewed');

  const getAllowedActions = () => {
    if (status === 'Applied' || status === 'Under Review') return ['shortlist', 'reject'];
    if (status === 'Shortlisted') {
      return hasCompletedInterview ? ['accept', 'reject'] : ['interview', 'reject'];
    }
    if (status === 'Interview Scheduled') {
      return canReschedule ? ['reschedule', 'reject'] : ['reject'];
    }
    if (status === 'Interviewed') return ['accept', 'shortlist', 'reject'];
    return [];
  };

  const allowedActions = getAllowedActions();

  const validateInterviewWindow = () => {
    if (!interviewStart || !interviewDeadline) {
      return 'Interview start and end date/time are required.';
    }

    const startDate = new Date(interviewStart);
    const endDate = new Date(interviewDeadline);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return 'Please provide valid interview date/time values.';
    }

    if (startDate < new Date()) {
      return 'Interview start date/time cannot be in the past.';
    }

    if (endDate <= startDate) {
      return 'Interview end date/time must be after start date/time.';
    }

    return '';
  };

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInsideTrigger = menuRef.current && menuRef.current.contains(event.target);
      const clickedInsideDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);

      if (!clickedInsideTrigger && !clickedInsideDropdown) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  React.useEffect(() => {
    const updateMenuPosition = () => {
      if (!buttonRef.current) return;

      const rect = buttonRef.current.getBoundingClientRect();
      const menuHeight = dropdownRef.current?.offsetHeight || 220;
      const menuWidth = 208; // Tailwind w-52
      const gap = 8;
      const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
      const preferredTop = rect.top - menuHeight - gap;
      const top = preferredTop >= 8 ? preferredTop : rect.bottom + gap;

      setMenuPosition({
        top,
        left,
      });
    };

    if (open) {
      updateMenuPosition();
      window.addEventListener('resize', updateMenuPosition);
      window.addEventListener('scroll', updateMenuPosition, true);
    }

    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative inline-flex justify-end text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-700 hover:bg-slate-50"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed w-52 rounded-xl border border-slate-200 bg-white shadow-xl z-40 overflow-hidden"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            {allowedActions.includes('shortlist') && (
              <MenuItem icon={CheckCircle2} label="Shortlist" onClick={() => { setOpen(false); onAction('shortlist'); }} />
            )}
            {allowedActions.includes('accept') && (
              <MenuItem icon={Handshake} label="Accept" onClick={() => { setOpen(false); onAction('accept'); }} />
            )}
            {allowedActions.includes('interview') && (
              <MenuItem icon={CalendarClock} label="Schedule Interview" onClick={() => { setOpen(false); setInterviewError(''); setInterviewOpen(true); }} />
            )}
            {allowedActions.includes('reschedule') && (
              <MenuItem icon={CalendarClock} label="Reschedule Interview" onClick={() => { setOpen(false); setInterviewError(''); setInterviewOpen(true); }} />
            )}
            {allowedActions.includes('reject') && (
              <MenuItem icon={XCircle} label="Reject" onClick={() => { setOpen(false); setRejectOpen(true); }} />
            )}
            {allowedActions.length === 0 && (
              <div className="px-3 py-2 text-xs text-slate-500">No actions available for this status.</div>
            )}
          </div>,
          document.body
        )
      )}

      {/* Reject dialog */}
      {rejectOpen && !isTerminal && allowedActions.includes('reject') && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-xl bg-white p-4 border border-slate-200">
            <h3 className="text-base font-semibold text-slate-900 mb-2">Reject application</h3>
            <p className="text-sm text-slate-600 mb-3">Add optional feedback for the candidate.</p>
            <Textarea
              name="feedback"
              label="Feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                onClick={() => { setRejectOpen(false); setFeedback(''); }}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-rose-600 text-white px-3 py-2 text-sm hover:bg-rose-700"
                onClick={() => {
                  onAction('reject', { feedback });
                  setRejectOpen(false);
                  setFeedback('');
                }}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interview dialog */}
      {interviewOpen && !isTerminal && (allowedActions.includes('interview') || allowedActions.includes('reschedule')) && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-xl bg-white p-6 border border-slate-200 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              {allowedActions.includes('reschedule') ? 'Reschedule Interview' : 'Schedule Interview'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">Set interview start and end. Start cannot be in the past and end must be after start.</p>
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">Interview Start <span className="text-rose-500">*</span></label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                value={interviewStart}
                onChange={(e) => {
                  setInterviewError('');
                  setInterviewStart(e.target.value);
                }}
                min={getLocalDateTimeInputValue()}
              />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">Interview End <span className="text-rose-500">*</span></label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                value={interviewDeadline}
                onChange={(e) => {
                  setInterviewError('');
                  setInterviewDeadline(e.target.value);
                }}
                min={interviewStart || getLocalDateTimeInputValue()}
              />
            </div>
            <div className="mb-1">
              <label className="block text-xs font-medium text-slate-700 mb-1">Instructions (optional)</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                rows={3}
                value={instructions}
                onChange={(e) => {
                  setInterviewError('');
                  setInstructions(e.target.value);
                }}
                placeholder="Add any notes or instructions for the candidate..."
              />
            </div>
            {interviewError && (
              <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {interviewError}
              </p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                onClick={() => {
                  setInterviewOpen(false);
                  setInterviewError('');
                  setInterviewStart(getLocalDateTimeInputValue());
                  setInterviewDeadline('');
                  setInstructions('');
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-amber-600 text-white px-3 py-2 text-sm hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!interviewStart || !interviewDeadline}
                onClick={() => {
                  const validationError = validateInterviewWindow();
                  if (validationError) {
                    setInterviewError(validationError);
                    return;
                  }

                  const actionType = allowedActions.includes('reschedule') ? 'reschedule' : 'interview';
                  onAction(actionType, { interviewWindowStart: interviewStart, interviewWindowEnd: interviewDeadline, instructions });
                  setInterviewOpen(false);
                  setInterviewError('');
                  setInterviewStart(getLocalDateTimeInputValue());
                  setInterviewDeadline('');
                  setInstructions('');
                }}
              >
                {allowedActions.includes('reschedule') ? 'Reschedule' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusActionsMenu;