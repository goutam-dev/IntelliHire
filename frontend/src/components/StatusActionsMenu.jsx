import React, { useState } from 'react';
import { MoreHorizontal, CheckCircle2, XCircle, CalendarClock, Handshake, RotateCcw, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import Textarea from './forms/Textarea';

const MenuItem = ({ icon: Icon, label, onClick }) => (
  <button
    className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] font-semibold text-zinc-600 hover:text-zinc-900 transition-colors rounded-xl hover:bg-zinc-50"
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
          
const generateTimeOptions = (selectedDateStr) => {
  const options = [];
  
  // Calculate current date and time in the user's local timezone
  const now = new Date();
  const todayStr = getLocalDateTimeInputValue().split('T')[0];
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      // If the selected date is today, disable/filter out times in the past
      if (selectedDateStr === todayStr) {
        if (h < currentHours || (h === currentHours && m < currentMinutes)) {
          continue; // Skip past options for today
        }
      }

      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 === 0 ? 12 : h % 12;
      options.push({
        value: `${hh}:${mm}`,
        label: `${displayH}:${mm} ${ampm}`
      });
    }
  }
  return options;
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
  const [reInterviewApproveOpen, setReInterviewApproveOpen] = useState(false);
  const [reInterviewDenyOpen, setReInterviewDenyOpen] = useState(false);
  const [denyNote, setDenyNote] = useState('');
  const menuRef = React.useRef(null);
  const buttonRef = React.useRef(null);
  const dropdownRef = React.useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const status = application?.status;
  const isTerminal = ['Rejected', 'Hired', 'Withdrawn', 'Job Deleted'].includes(status);

  const canReschedule = (() => {
    if (status !== 'Interview Scheduled') return false;
    if (application?.interviewLocked) return false;
    if (!application?.interviewWindowEnd) return false;
    return new Date(application.interviewWindowEnd) > new Date();
  })();

  const hasCompletedInterview = Boolean(application?.interviewCompletedAt || status === 'Interviewed');
  const hasPendingReInterview = application?.reInterviewRequest?.status === 'pending';

  const getAllowedActions = () => {
    if (status === 'Applied') return ['shortlist', 'reject'];
    if (status === 'Shortlisted') {
      return hasCompletedInterview ? ['accept', 'reject'] : ['interview', 'reject'];
    }
    if (status === 'Interview Scheduled') {
      return canReschedule ? ['reschedule', 'reject'] : ['reject'];
    }
    if (status === 'Interviewed') return ['finalist', 'reject'];
    if (status === 'Finalist') return ['accept', 'reject'];
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
        className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors shadow-sm"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed w-[220px] rounded-2xl border border-zinc-200 bg-white p-1 shadow-lg z-40 flex flex-col gap-0.5"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            {allowedActions.includes('shortlist') && (
              <MenuItem icon={CheckCircle2} label="Shortlist" onClick={() => { setOpen(false); onAction('shortlist'); }} />
            )}
            {allowedActions.includes('finalist') && (
              <MenuItem icon={CheckCircle2} label="Mark as Finalist" onClick={() => { setOpen(false); onAction('finalist'); }} />
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
            {allowedActions.length === 0 && !hasPendingReInterview && (
              <div className="px-3 py-3 text-xs text-zinc-500 text-center italic font-medium">No actions available for this status.</div>
            )}
            {hasPendingReInterview && (
              <>
                <div className="border-t border-zinc-100 my-0.5 mx-2" />
                <MenuItem icon={Check} label="Approve Re-Interview" onClick={() => { setOpen(false); setInterviewError(''); setReInterviewApproveOpen(true); }} />
                <MenuItem icon={XCircle} label="Deny Request" onClick={() => { setOpen(false); setReInterviewDenyOpen(true); }} />
              </>
            )}
          </div>,
          document.body
        )
      )}

      {/* Reject dialog */}
      {rejectOpen && !isTerminal && allowedActions.includes('reject') && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-xl bg-white p-4 border border-zinc-200">
            <h3 className="text-base font-semibold text-zinc-900 mb-2">Reject application</h3>
            <p className="text-sm text-zinc-600 mb-3">Add optional feedback for the candidate.</p>
            <Textarea
              name="feedback"
              label="Feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
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
          <div className="w-full max-w-md rounded-xl bg-white p-6 border border-zinc-200 shadow-xl">
            <h3 className="text-base font-semibold text-zinc-900 mb-1">
              {allowedActions.includes('reschedule') ? 'Reschedule Interview' : 'Schedule Interview'}
            </h3>
            <p className="text-sm text-zinc-500 mb-4">Set interview start and end. Start cannot be in the past and end must be after start.</p>
            <div className="mb-3">
              <label className="block text-xs font-medium text-zinc-700 mb-1">Interview Start <span className="text-rose-500">*</span></label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="w-2/3 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  value={interviewStart ? interviewStart.split('T')[0] : ''}
                  onChange={(e) => {
                    setInterviewError('');
                    const newDate = e.target.value;
                    const currentTime = interviewStart ? interviewStart.split('T')[1] : '09:00';
                    setInterviewStart(newDate ? `${newDate}T${currentTime}` : '');
                  }}
                  min={getLocalDateTimeInputValue().split('T')[0]}
                />
                <select
                  className="w-1/3 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  value={interviewStart ? interviewStart.split('T')[1] : ''}
                  onChange={(e) => {
                    setInterviewError('');
                    const newTime = e.target.value;
                    const currentDate = (interviewStart && interviewStart.split('T')[0]) || getLocalDateTimeInputValue().split('T')[0];
                    setInterviewStart(`${currentDate}T${newTime}`);
                  }}
                >
                  <option value="" disabled>Time</option>
                  {generateTimeOptions(interviewStart ? interviewStart.split('T')[0] : '').map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-zinc-700 mb-1">Interview End <span className="text-rose-500">*</span></label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="w-2/3 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  value={interviewDeadline ? interviewDeadline.split('T')[0] : ''}
                  onChange={(e) => {
                    setInterviewError('');
                    const newDate = e.target.value;
                    const currentTime = interviewDeadline ? interviewDeadline.split('T')[1] : '17:00';
                    setInterviewDeadline(newDate ? `${newDate}T${currentTime}` : '');
                  }}
                  min={interviewStart ? interviewStart.split('T')[0] : getLocalDateTimeInputValue().split('T')[0]}
                />
                <select
                  className="w-1/3 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  value={interviewDeadline ? interviewDeadline.split('T')[1] : ''}
                  onChange={(e) => {
                    setInterviewError('');
                    const newTime = e.target.value;
                    const currentDate = (interviewDeadline && interviewDeadline.split('T')[0]) || (interviewStart ? interviewStart.split('T')[0] : getLocalDateTimeInputValue().split('T')[0]);
                    setInterviewDeadline(`${currentDate}T${newTime}`);
                  }}
                >
                  <option value="" disabled>Time</option>
                  {generateTimeOptions(interviewDeadline ? interviewDeadline.split('T')[0] : '').map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-1">
              <label className="block text-xs font-medium text-zinc-700 mb-1">Instructions (optional)</label>
              <textarea
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
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
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
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

      {/* Re-Interview Approve Dialog */}
      {reInterviewApproveOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-xl bg-white p-6 border border-zinc-200 shadow-xl">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900">Approve Re-Interview</h3>
            </div>
            <p className="text-sm text-zinc-500 mb-4">Set a new interview window. The candidate will be notified and can take the interview again.</p>
            <div className="mb-3">
              <label className="block text-xs font-medium text-zinc-700 mb-1">Interview Start <span className="text-rose-500">*</span></label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="w-2/3 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  value={interviewStart ? interviewStart.split('T')[0] : ''}
                  onChange={(e) => {
                    setInterviewError('');
                    const newDate = e.target.value;
                    const currentTime = interviewStart ? interviewStart.split('T')[1] : '09:00';
                    setInterviewStart(newDate ? `${newDate}T${currentTime}` : '');
                  }}
                  min={getLocalDateTimeInputValue().split('T')[0]}
                />
                <select
                  className="w-1/3 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  value={interviewStart ? interviewStart.split('T')[1] : ''}
                  onChange={(e) => {
                    setInterviewError('');
                    const newTime = e.target.value;
                    const currentDate = (interviewStart && interviewStart.split('T')[0]) || getLocalDateTimeInputValue().split('T')[0];
                    setInterviewStart(`${currentDate}T${newTime}`);
                  }}
                >
                  <option value="" disabled>Time</option>
                  {generateTimeOptions(interviewStart ? interviewStart.split('T')[0] : '').map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-zinc-700 mb-1">Interview End <span className="text-rose-500">*</span></label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="w-2/3 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  value={interviewDeadline ? interviewDeadline.split('T')[0] : ''}
                  onChange={(e) => {
                    setInterviewError('');
                    const newDate = e.target.value;
                    const currentTime = interviewDeadline ? interviewDeadline.split('T')[1] : '17:00';
                    setInterviewDeadline(newDate ? `${newDate}T${currentTime}` : '');
                  }}
                  min={interviewStart ? interviewStart.split('T')[0] : getLocalDateTimeInputValue().split('T')[0]}
                />
                <select
                  className="w-1/3 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  value={interviewDeadline ? interviewDeadline.split('T')[1] : ''}
                  onChange={(e) => {
                    setInterviewError('');
                    const newTime = e.target.value;
                    const currentDate = (interviewDeadline && interviewDeadline.split('T')[0]) || (interviewStart ? interviewStart.split('T')[0] : getLocalDateTimeInputValue().split('T')[0]);
                    setInterviewDeadline(`${currentDate}T${newTime}`);
                  }}
                >
                  <option value="" disabled>Time</option>
                  {generateTimeOptions(interviewDeadline ? interviewDeadline.split('T')[0] : '').map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-1">
              <label className="block text-xs font-medium text-zinc-700 mb-1">Instructions (optional)</label>
              <textarea
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                rows={3}
                value={instructions}
                onChange={(e) => { setInterviewError(''); setInstructions(e.target.value); }}
                placeholder="Add any notes for the candidate..."
              />
            </div>
            {interviewError && (
              <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{interviewError}</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
                onClick={() => { setReInterviewApproveOpen(false); setInterviewError(''); setInterviewStart(getLocalDateTimeInputValue()); setInterviewDeadline(''); setInstructions(''); }}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 text-sm font-medium hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                disabled={!interviewStart || !interviewDeadline}
                onClick={() => {
                  const validationError = validateInterviewWindow();
                  if (validationError) { setInterviewError(validationError); return; }
                  onAction('approve-reinterview', { interviewWindowStart: interviewStart, interviewWindowEnd: interviewDeadline, instructions });
                  setReInterviewApproveOpen(false);
                  setInterviewError('');
                  setInterviewStart(getLocalDateTimeInputValue());
                  setInterviewDeadline('');
                  setInstructions('');
                }}
              >
                Approve & Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-Interview Deny Dialog */}
      {reInterviewDenyOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-xl bg-white p-6 border border-zinc-200 shadow-xl">
            <h3 className="text-base font-semibold text-zinc-900 mb-2">Deny Re-Interview Request</h3>
            <p className="text-sm text-zinc-500 mb-3">Optionally provide a note explaining your decision.</p>
            <Textarea
              name="denyNote"
              label="Note to candidate (optional)"
              value={denyNote}
              onChange={(e) => setDenyNote(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
                onClick={() => { setReInterviewDenyOpen(false); setDenyNote(''); }}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-rose-600 text-white px-4 py-2 text-sm font-medium hover:bg-rose-700"
                onClick={() => {
                  onAction('deny-reinterview', { note: denyNote });
                  setReInterviewDenyOpen(false);
                  setDenyNote('');
                }}
              >
                Deny Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusActionsMenu;
