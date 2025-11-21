import React, { useState } from 'react';
import { MoreHorizontal, CheckCircle2, XCircle, CalendarClock, Handshake } from 'lucide-react';
import Textarea from './forms/Textarea';
import Input from './forms/Input';

const MenuItem = ({ icon: Icon, label, onClick }) => (
  <button
    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50"
    onClick={onClick}
    type="button"
  >
    <Icon className="h-4 w-4" /> {label}
  </button>
);

const StatusActionsMenu = ({ application, onAction }) => {
  const [open, setOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
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

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      <button
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
        <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg z-50">
          <MenuItem icon={CheckCircle2} label="Shortlist" onClick={() => { setOpen(false); onAction('shortlist'); }} />
          <MenuItem icon={Handshake} label="Accept" onClick={() => { setOpen(false); onAction('accept'); }} />
          <MenuItem icon={CalendarClock} label="Interview" onClick={() => { setOpen(false); setInterviewOpen(true); }} />
          <MenuItem icon={XCircle} label="Reject" onClick={() => { setOpen(false); setRejectOpen(true); }} />
        </div>
      )}

      {/* Reject dialog */}
      {rejectOpen && (
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
      {interviewOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-xl bg-white p-4 border border-slate-200">
            <h3 className="text-base font-semibold text-slate-900 mb-2">Schedule interview</h3>
            <p className="text-sm text-slate-600 mb-3">Specify date/time and instructions.</p>
            <Input
              name="interviewDate"
              label="Date & time"
              type="datetime-local"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
            />
            <Textarea
              name="instructions"
              label="Instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                onClick={() => { setInterviewOpen(false); setInterviewDate(''); setInstructions(''); }}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-amber-600 text-white px-3 py-2 text-sm hover:bg-amber-700"
                onClick={() => {
                  onAction('interview', { scheduledAt: interviewDate, instructions });
                  setInterviewOpen(false);
                  setInterviewDate('');
                  setInstructions('');
                }}
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusActionsMenu;