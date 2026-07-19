/**
 * Toast — lightweight notification popup that appears at the bottom-right.
 * Uses the global notification store.
 */
import React from 'react';
import { useNotificationStore, type Notification } from '../../state/notificationStore';

const TYPE_STYLES: Record<Notification['type'], string> = {
  info: 'bg-panel border-l-2 border-accent',
  success: 'bg-panel border-l-2 border-[#4caf50]',
  warning: 'bg-panel border-l-2 border-[#ff9800]',
  error: 'bg-panel border-l-2 border-[#f44336]',
};

const TYPE_ICONS: Record<Notification['type'], string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✕',
};

export const ToastContainer: React.FC = () => {
  const notifications = useNotificationStore((s) => s.notifications);
  const dismiss = useNotificationStore((s) => s.dismissNotification);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-[360px]">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`pointer-events-auto flex items-start gap-2 px-3 py-2.5 rounded-md shadow-lg
            text-ui-xs text-text-primary animate-slide-in-right
            ${TYPE_STYLES[n.type]}`}
          style={{
            animation: 'slideInRight 0.2s ease-out',
          }}
        >
          <span className="mt-0.5 text-sm shrink-0">{TYPE_ICONS[n.type]}</span>
          <div className="flex-1 min-w-0">
            <p className="leading-snug break-words">{n.message}</p>
            {n.action && (
              <button
                onClick={n.action.onClick}
                className="mt-1 text-accent hover:text-accent-hover underline cursor-pointer border-0 bg-transparent p-0"
              >
                {n.action.label}
              </button>
            )}
          </div>
          <button
            onClick={() => dismiss(n.id)}
            className="shrink-0 text-text-disabled hover:text-text-secondary cursor-pointer border-0 bg-transparent p-0 ml-1"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ToastContainer;
