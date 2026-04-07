import api from '../../lib/api';

/**
 * Notification API service
 * All calls go through the shared axios instance (auto-attaches Clerk JWT).
 */

/** Fetch paginated notifications list */
export const getNotifications = async (page = 1, limit = 20) => {
  const res = await api.get('/notifications', { params: { page, limit } });
  return res.data?.data;
};

/** Get unread count for the bell badge */
export const getUnreadCount = async () => {
  const res = await api.get('/notifications/unread-count');
  return res.data?.data?.count ?? 0;
};

/** Mark a single notification as read */
export const markAsRead = async (id) => {
  const res = await api.patch(`/notifications/${id}/read`);
  return res.data?.data;
};

/** Mark all notifications as read */
export const markAllRead = async () => {
  const res = await api.patch('/notifications/read-all');
  return res.data?.data;
};

export default { getNotifications, getUnreadCount, markAsRead, markAllRead };
