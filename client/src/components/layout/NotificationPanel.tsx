import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '@/lib/api';
import { API_BASE_URL } from '@/lib/api';
import type { Notification } from '@/types';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

export default function NotificationPanel() {
  const { accessToken } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data.notifications);
      setUnread(res.data.data.unreadCount);
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!accessToken) return;

    const stream = new EventSource(`${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(accessToken)}`);

    stream.addEventListener('notification', (event) => {
      const notification = JSON.parse((event as MessageEvent).data) as Notification;
      setNotifications((prev) => {
        if (prev.some((item) => item.id === notification.id)) return prev;
        return [notification, ...prev].slice(0, 50);
      });
      setUnread((count) => count + (notification.isRead ? 0 : 1));
      toast.info(notification.title, {
        description: notification.message,
        action: notification.link
          ? {
            label: 'Open',
            onClick: () => navigate(notification.link!),
          }
          : undefined,
      });
    });

    stream.onerror = () => {
      stream.close();
    };

    return () => stream.close();
  }, [accessToken, navigate]);

  const markRead = async (id: string) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    toast.success('All notifications marked as read');
  };

  const handleClick = async (n: Notification) => {
    if (!n.isRead) await markRead(n.id);
    if (n.link) navigate(n.link);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative btn-ghost p-2 rounded-lg"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-priority-urgent rounded-full text-text-primary text-[10px] flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 bg-surface border border-border rounded-card shadow-card-hover z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-heading font-semibold text-text-primary text-sm">
                  Notifications {unread > 0 && <span className="text-accent">({unread})</span>}
                </h3>
                <div className="flex items-center gap-1">
                  {unread > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-text-muted hover:text-accent transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-hover"
                    >
                      <CheckCheck className="w-3 h-3" /> All read
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-8 h-8 text-text-muted mx-auto mb-2" />
                    <p className="text-text-muted text-sm">No notifications</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className="w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors border-b border-border last:border-0 flex items-start gap-3"
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.isRead ? 'bg-transparent' : 'bg-accent'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${n.isRead ? 'text-text-secondary' : 'text-text-primary'}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-text-muted line-clamp-2 mt-0.5">{n.message}</p>
                        <p className="text-xs text-text-muted mt-1">{formatDate(n.createdAt, 'relative')}</p>
                      </div>
                      {!n.isRead && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                          className="text-text-muted hover:text-accent flex-shrink-0 p-1"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
