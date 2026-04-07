import { useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useAuth } from '@clerk/clerk-react';
import {
  setNotifications,
  setUnreadCount,
  addNotification,
  setLoading,
  setWsConnected,
} from '../store/slices/notificationSlice';
import { getNotifications, getUnreadCount } from '../services/api/notificationApi';

const WS_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api')
  .replace(/\/api$/, '')          // strip /api suffix → base origin
  .replace(/^http/, 'ws');        // http → ws, https → wss

const WS_RECONNECT_BASE_MS = 5000;
const WS_RECONNECT_MAX_MS = 60000;
const TOKEN_REFRESH_SKEW_MS = 60_000;

function decodeJwtExpMs(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload?.exp) return 0;
    return payload.exp * 1000;
  } catch {
    return 0;
  }
}

/**
 * useNotifications
 *
 * 1. On mount, fetches the initial notification list + unread count via REST.
 * 2. Opens a WebSocket to /ws and authenticates with the MongoDB userId.
 * 3. Incoming WS messages of type "notification" are prepended to Redux state.
 * 4. Cleans up the WS connection on unmount.
 *
 * Call this hook once at a high level (e.g. inside the layout components)
 * so the WS connection lives for the duration of the user's session.
 *
 * @param {string} mongoUserId - The MongoDB _id of the authenticated user.
 */
export function useNotifications(mongoUserId) {
  const dispatch = useDispatch();
  const { getToken } = useAuth();
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const unmountedRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const tokenCacheRef = useRef({ token: null, expMs: 0 });

  // ── Initial REST load ────────────────────────────────────────────────────
  const loadInitial = useCallback(async () => {
    if (!mongoUserId) return;
    dispatch(setLoading(true));
    try {
      const [data, count] = await Promise.all([
        getNotifications(1, 20),
        getUnreadCount(),
      ]);
      dispatch(setNotifications(data?.notifications ?? []));
      dispatch(setUnreadCount(count));
    } catch (err) {
      console.error('[useNotifications] Initial load failed:', err);
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, mongoUserId]);

  const getWsToken = useCallback(async () => {
    const now = Date.now();
    const cached = tokenCacheRef.current;

    // Reuse token if it is still valid for at least the skew window.
    if (cached.token && cached.expMs - now > TOKEN_REFRESH_SKEW_MS) {
      return cached.token;
    }

    const token = await getToken();
    const expMs = token ? decodeJwtExpMs(token) : 0;
    tokenCacheRef.current = { token: token || null, expMs };
    return token;
  }, [getToken]);

  // ── WebSocket connection ─────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!mongoUserId || unmountedRef.current) return;

    const ws = new WebSocket(`${WS_URL}/ws`);
    wsRef.current = ws;

    ws.onopen = async () => {
      if (unmountedRef.current) { ws.close(); return; }
      let token = null;
      try {
        token = await getWsToken();
      } catch (err) {
        console.error('[useNotifications] Failed to get auth token for WS:', err);
      }
      // Authenticate with Clerk JWT; userId is optional cross-check on the server.
      ws.send(JSON.stringify({ type: 'auth', token, userId: mongoUserId }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'auth_ok') {
          reconnectAttemptRef.current = 0;
          dispatch(setWsConnected(true));
          return;
        }
        if (msg.type === 'auth_error') {
          dispatch(setWsConnected(false));
          if (!unmountedRef.current) {
            const attempt = reconnectAttemptRef.current;
            const delay = Math.min(WS_RECONNECT_BASE_MS * (2 ** attempt), WS_RECONNECT_MAX_MS);
            reconnectAttemptRef.current = attempt + 1;
            tokenCacheRef.current = { token: null, expMs: 0 };
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = setTimeout(connect, delay);
          }
          ws.close();
          return;
        }
        if (msg.type === 'notification' && msg.notification) {
          dispatch(addNotification(msg.notification));
        }
      } catch {
        // malformed message — ignore
      }
    };

    ws.onclose = () => {
      dispatch(setWsConnected(false));
      if (!unmountedRef.current) {
        const attempt = reconnectAttemptRef.current;
        const delay = Math.min(WS_RECONNECT_BASE_MS * (2 ** attempt), WS_RECONNECT_MAX_MS);
        reconnectAttemptRef.current = attempt + 1;
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = (err) => {
      console.error('[useNotifications] WebSocket error:', err);
      ws.close();
    };
  }, [mongoUserId, dispatch, getWsToken]);

  useEffect(() => {
    unmountedRef.current = false;
    loadInitial();
    connect();

    return () => {
      unmountedRef.current = true;
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
      }
      reconnectAttemptRef.current = 0;
      dispatch(setWsConnected(false));
    };
  }, [loadInitial, connect, dispatch]);
}
