import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, X } from 'lucide-react';
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
  application_received: '📩',
  status_updated: '📋',
  interview_scheduled: '🗓️',
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

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <Motion.button
        id="notification-bell-btn"
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
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
              className="absolute -top-1 -right-1 flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none"
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
            className="absolute right-0 mt-2 w-80 sm:w-96 origin-top-right rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-slate-700" />
                <span className="text-sm font-semibold text-slate-900">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-xs font-medium text-white bg-red-500 rounded-full px-1.5 py-0.5 leading-none">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAll}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <ul className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
              {notifications.length === 0 ? (
                <li className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
                  <Bell className="h-8 w-8 opacity-30" />
                  <span className="text-sm">No notifications yet</span>
                </li>
              ) : (
                notifications.map((n) => (
                  <Motion.li
                    key={n._id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:bg-slate-50 ${
                        !n.isRead ? 'bg-blue-50/60' : 'bg-white'
                      }`}
                    >
                      {/* Icon */}
                      <span className="text-lg flex-shrink-0 mt-0.5" aria-hidden="true">
                        {typeIcons[n.type] ?? '🔔'}
                      </span>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${!n.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>

                      {/* Unread dot */}
                      {!n.isRead && (
                        <span className="flex-shrink-0 mt-1.5 h-2 w-2 rounded-full bg-blue-500" aria-hidden="true" />
                      )}
                    </button>
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
