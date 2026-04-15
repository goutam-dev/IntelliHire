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
  interview_completed: CalendarDays,
  status_updated: ClipboardList,
  interview_scheduled: CalendarDays,
  interview_rescheduled: CalendarDays,
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
        className="relative flex items-center justify-center h-10 w-10 text-zinc-600 hover:text-zinc-900 border border-transparent hover:border-zinc-200 hover:bg-zinc-50 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-[22px] w-[22px]" />

        {/* Unread badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <Motion.span
              key="badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-sm shadow-red-500/20 leading-none border-2 border-white"
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
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-3 w-[360px] sm:w-[400px] origin-top-right rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-200/50 z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-white">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100 text-zinc-700">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-zinc-900 tracking-tight">Notifications</h3>
                  <p className="text-xs font-medium text-zinc-500 mt-0.5">
                    {unreadCount > 0 ? `You have ${unreadCount} unread` : 'You are all caught up'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAll}
                    className="inline-flex items-center justify-center p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-[440px] overflow-y-auto w-full [scrollbar-width:thin] [scrollbar-color:#e4e4e7_transparent]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
                    <Bell className="h-8 w-8 text-zinc-300" />
                  </div>
                  <p className="text-[15px] font-semibold text-zinc-900 mb-1">No notifications yet</p>
                  <p className="text-sm font-medium text-zinc-500">We'll let you know when something arrives.</p>
                </div>
              ) : (
                <ul className="flex flex-col">
                  {notifications.map((n) => (
                    <Motion.li
                      key={n._id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15 }}
                      className={`relative border-b border-zinc-100 last:border-none transition-colors duration-200 group ${
                        !n.isRead ? 'bg-zinc-50/50 hover:bg-zinc-100/80' : 'bg-white hover:bg-zinc-50/80'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(n)}
                        className="w-full text-left px-5 py-4 focus-visible:outline-none focus:bg-zinc-50 block"
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl flex-none ${
                            !n.isRead 
                              ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-100' 
                              : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                          }`}>
                            {React.createElement(typeIcons[n.type] || Bell, { className: 'h-[18px] w-[18px]' })}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 pr-6">
                            <p className="text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wide">
                              {timeAgo(n.createdAt)}
                            </p>
                            <p className={`text-sm tracking-tight leading-snug mb-1 ${
                              !n.isRead ? 'font-bold text-zinc-900' : 'font-semibold text-zinc-700'
                            }`}>
                              {n.title}
                            </p>
                            <p className="text-[13px] text-zinc-600 line-clamp-2 leading-relaxed">
                              {n.message}
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* Unread indicator & Mark read button */}
                      {!n.isRead && (
                        <div className="absolute right-5 inset-y-0 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkOne(n._id);
                            }}
                            className="p-1.5 rounded-lg text-zinc-300 hover:text-zinc-600 hover:bg-white border border-transparent hover:border-zinc-200 hover:shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
                            title="Mark as read"
                          >
                            <CheckCheck className="h-4 w-4" />
                          </button>
                          <div className="absolute top-1/2 -translate-y-1/2 right-1 lg:group-hover:opacity-0 transition-opacity pointer-events-none">
                            <span className="block h-2 w-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/40" />
                          </div>
                        </div>
                      )}
                    </Motion.li>
                  ))}
                </ul>
              )}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
