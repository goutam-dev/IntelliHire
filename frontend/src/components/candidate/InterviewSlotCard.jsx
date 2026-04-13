import React from 'react';
import { CalendarClock } from 'lucide-react';

const InterviewSlotCard = ({
  start,
  end,
  title = 'Interview Slot',
  className = '',
}) => {
  if (!start || !end) return null;

  return (
    <div className={`w-full rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-sky-50 px-3 py-2 text-xs text-indigo-900 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700">{title}</p>
      <p className="mt-1 flex items-center gap-1.5 font-medium leading-tight">
        <CalendarClock className="h-3.5 w-3.5" />
        {start}
      </p>
      <p className="mt-0.5 pl-5 leading-tight text-indigo-700/90">{end}</p>
    </div>
  );
};

export default InterviewSlotCard;
