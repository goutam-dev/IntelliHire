import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Bell, CalendarDays, CheckCheck, ClipboardList, FileText, X } from 'lucide-react';
import { markRead, markAllRead as markAllReadAction } from '../../store/slices/notificationSlice';
import { markAsRead, markAllRead } from '../../services/api/notificationApi';

/**
 * NotificationBell
 *
 * Shared component used in both CandidateHeader and EmployerHeader.
 * - Shows a bell icon with animated unread badge.
 * - Click opens a dropdown panel listing notifications.
 * - Clicking a notification marks it read (optimistic) + navigates to its link.
 * - "Mark all read" clears the badge.
 */

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const typeIcons = {
  application_received: FileText,
  status_updated: ClipboardList,
  interview_scheduled: CalendarDays,
};

const NotificationBell = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { notifications, unreadCount } = useSelector((s) => s.notifications);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleNotificationClick = async (notification) => {
    setOpen(false);
    // Optimistic update
    if (!notification.isRead) {
      dispatch(markRead(notification._id));
      try {
        await markAsRead(notification._id);
      } catch {
        // silent — optimistic update already applied
      }
    }
    if (notification.link) {
      // Strip the origin part if it matches the current app so we use client-side navigation
      try {
        const url = new URL(notification.link);
        const sameOrigin = url.origin === window.location.origin;
        const sameHostDifferentPort =
          url.hostname === window.location.hostname &&
          (url.pathname.startsWith('/candidate/') || url.pathname.startsWith('/employer/'));

        if (sameOrigin || sameHostDifferentPort) {
          navigate(url.pathname + url.search);
        } else {
          window.location.assign(notification.link);
        }
      } catch {
        navigate(notification.link);
      }
    }
  };

  const handleMarkAll = async () => {
    dispatch(markAllReadAction());
    try {
      await markAllRead();
    } catch {
      // silent
    }
  };

  const handleMarkOne = async (notificationId) => {
    dispatch(markRead(notificationId));
    try {
      await markAsRead(notificationId);
    } catch {
      // silent
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <Motion.button
        id="notification-bell-btn"
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex items-center justify-center h-9 w-9 rounded-xl border border-[#DBE2EF] bg-[#F9F7F7] text-[#112D4E] transition-colors hover:bg-[#DBE2EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F72AF]/40"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-4 w-4" />

        {/* Unread badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <Motion.span
              key="badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-[#DC2626] text-[#F9F7F7] text-[10px] font-semibold leading-none"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Motion.span>
          )}
        </AnimatePresence>
      </Motion.button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <Motion.div
            id="notification-dropdown"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-80 sm:w-96 origin-top-right rounded-2xl border border-[#DBE2EF] bg-[#F9F7F7] shadow-lg z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#DBE2EF]">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#112D4E]" />
                <div>
                  <p className="text-sm font-semibold text-[#112D4E]">Notifications</p>
                  <p className="text-[11px] text-[#112D4E]/60">
                    {unreadCount > 0 ? `${unreadCount} unread updates` : 'All caught up'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAll}
                    className="inline-flex items-center gap-1 text-xs text-[#112D4E]/70 hover:text-[#112D4E] transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-[#112D4E]/45 hover:text-[#112D4E] transition-colors"
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <ul className="max-h-[420px] overflow-y-auto p-2 space-y-1.5">
              {notifications.length === 0 ? (
                <li className="flex flex-col items-center justify-center gap-2 py-12 text-[#112D4E]/55">
                  <Bell className="h-8 w-8 opacity-40" />
                  <p className="text-sm font-medium">No notifications yet</p>
                </li>
              ) : (
                notifications.map((n) => (
                  <Motion.li
                    key={n._id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`rounded-lg border transition-colors duration-200 ${
                      !n.isRead
                        ? 'border-[#DBE2EF] bg-[#DBE2EF]/45 hover:bg-[#DBE2EF]/65'
                        : 'border-[#DBE2EF]/75 bg-[#F9F7F7] hover:bg-[#DBE2EF]/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(n)}
                        className="flex-1 min-w-0 px-3.5 py-3 text-left flex items-start gap-3 focus-visible:outline-none"
                      >
                        {/* Icon */}
                        <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-[#DBE2EF] bg-[#F9F7F7] text-[#112D4E]/80" aria-hidden="true">
                          {React.createElement(typeIcons[n.type] || Bell, { className: 'h-3.5 w-3.5' })}
                        </span>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-snug ${!n.isRead ? 'font-semibold text-[#112D4E]' : 'font-medium text-[#112D4E]'}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-[#112D4E]/70 mt-0.5 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                          <p className="text-[11px] text-[#112D4E]/50 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                      </button>

                      <div className="flex items-center gap-2 mt-3 mr-3.5">
                        {!n.isRead && (
                          <button
                            type="button"
                            onClick={() => handleMarkOne(n._id)}
                            className="text-[11px] font-medium text-[#112D4E]/65 hover:text-[#112D4E] transition-colors"
                            title="Mark as read"
                          >
                            Mark as read
                          </button>
                        )}

                        {/* Unread dot */}
                        {!n.isRead && (
                          <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-[#DC2626]/75" aria-hidden="true" />
                        )}
                      </div>
                    </div>
                  </Motion.li>
                ))
              )}
            </ul>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
