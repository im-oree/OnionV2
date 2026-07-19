/**
 * NotificationCenter — bell icon in toolbar that opens a notification history panel.
 */
import React from 'react';
import { useNotificationStore } from '../../state/notificationStore';

export const NotificationCenter: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const notifications = useNotificationStore((s) => s.notifications);
  const dismiss = useNotificationStore((s) => s.dismissNotification);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const hasNotifications = notifications.length > 0;
  const hasErrors = notifications.some((n) => n.type === 'error');

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-5 h-5 flex items-center justify-center border-0 bg-transparent
          cursor-pointer text-text-secondary hover:text-text-primary transition-colors"
        title="Notifications"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {hasNotifications && (
          <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[8px]
            font-bold flex items-center justify-center ${hasErrors ? 'bg-[#f44336]' : 'bg-accent'} text-white`}>
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-[300px] max-h-[360px] overflow-y-auto
          bg-surface border border-border rounded-md shadow-xl z-[9999]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-ui-xs font-semibold text-text-primary">Notifications</span>
            <button
              onClick={clearAll}
              className="text-ui-xs text-text-disabled hover:text-text-secondary cursor-pointer border-0 bg-transparent p-0"
            >
              Clear all
            </button>
          </div>
          {notifications.length === 0 ? (
            <p className="px-3 py-4 text-ui-xs text-text-disabled text-center">No notifications</p>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-2 px-3 py-2 border-b border-border/50
                    hover:bg-panel-hover cursor-pointer transition-colors`}
                  onClick={() => dismiss(n.id)}
                >
                  <span className="shrink-0 mt-0.5">
                    {n.type === 'error' && <span className="text-[#f44336]">✕</span>}
                    {n.type === 'warning' && <span className="text-[#ff9800]">⚠</span>}
                    {n.type === 'success' && <span className="text-[#4caf50]">✓</span>}
                    {n.type === 'info' && <span className="text-accent">ℹ</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-ui-xs text-text-primary break-words leading-snug">{n.message}</p>
                    <p className="text-[10px] text-text-disabled mt-0.5">
                      {new Date(n.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
