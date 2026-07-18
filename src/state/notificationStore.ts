/**
 * notificationStore — global notification system for toasts and error messages.
 */
import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  autoDismiss?: number; // ms, 0 = sticky
  action?: { label: string; onClick: () => void };
  timestamp: number;
}

interface NotificationStoreState {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id' | 'timestamp'>) => string;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationStoreState>((set, get) => ({
  notifications: [],

  addNotification: (n) => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const notification: Notification = { ...n, id, timestamp: Date.now() };
    set((s) => ({ notifications: [...s.notifications, notification] }));

    if (n.autoDismiss && n.autoDismiss > 0) {
      setTimeout(() => {
        get().dismissNotification(id);
      }, n.autoDismiss);
    }
    return id;
  },

  dismissNotification: (id) => {
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
  },

  clearAll: () => set({ notifications: [] }),
}));
