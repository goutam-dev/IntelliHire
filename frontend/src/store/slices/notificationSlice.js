import { createSlice } from '@reduxjs/toolkit';

/**
 * Notification slice
 *
 * State is populated two ways:
 *  1. REST: initial fetch on mount (via useNotifications hook)
 *  2. WebSocket: real-time push appended to the front of the list
 */
const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    notifications: [],
    unreadCount: 0,
    loading: false,
    wsConnected: false,
  },
  reducers: {
    setNotifications(state, action) {
      state.notifications = action.payload;
    },
    setUnreadCount(state, action) {
      state.unreadCount = action.payload;
    },
    /** Prepend a new notification pushed via WebSocket */
    addNotification(state, action) {
      state.notifications.unshift(action.payload);
      state.unreadCount += 1;
    },
    /** Mark a single notification as read, decrement count */
    markRead(state, action) {
      const id = action.payload;
      const n = state.notifications.find((n) => n._id === id);
      if (n && !n.isRead) {
        n.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    /** Mark all as read */
    markAllRead(state) {
      state.notifications.forEach((n) => { n.isRead = true; });
      state.unreadCount = 0;
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setWsConnected(state, action) {
      state.wsConnected = action.payload;
    },
  },
});

export const {
  setNotifications,
  setUnreadCount,
  addNotification,
  markRead,
  markAllRead,
  setLoading,
  setWsConnected,
} = notificationSlice.actions;

export default notificationSlice.reducer;
