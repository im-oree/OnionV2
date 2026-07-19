/**
 * ErrorBoundary — catches React render errors and shows a friendly dialog.
 * Each major panel should be wrapped with its own boundary so one panel's
 * crash doesn't take down the entire app.
 */
import React from 'react';
import { useNotificationStore } from '../../state/notificationStore';

interface Props {
  children: React.ReactNode;
  /** Optional name for identifying which panel crashed */
  name?: string;
  /** Optional fallback UI instead of default error dialog */
  fallback?: React.ReactNode;
  /** Callback when error is recovered (user clicks dismiss) */
  onRecover?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    try {
      useNotificationStore.getState().addNotification({
        type: 'error',
        message: `${this.props.name || 'Panel'} crashed: ${error.message}`,
        autoDismiss: 8000,
      });
    } catch {
      // Notification system itself might have crashed
    }
    // Log to console for debugging
    console.error(`[ErrorBoundary:${this.props.name || 'unknown'}]`, error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onRecover?.();
  };

  handleCopyError = (): void => {
    const { error, errorInfo } = this.state;
    const text = [
      `Error: ${error?.message}`,
      `Stack: ${error?.stack}`,
      `Component Stack: ${errorInfo?.componentStack}`,
    ].join('\n\n');
    navigator.clipboard.writeText(text).catch(() => {});
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className="flex flex-col items-center justify-center h-full gap-4 p-6"
          style={{
            background: 'var(--color-panel)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
            {this.props.name || 'This panel'} encountered an error.
          </span>
          <div className="flex gap-2">
            <button
              onClick={this.handleReset}
              style={{
                padding: '6px 14px', fontSize: 'var(--font-size-xs)',
                background: 'var(--color-accent)', color: '#fff',
                border: 0, borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              }}
            >
              Reload Panel
            </button>
            <button
              onClick={this.handleCopyError}
              style={{
                padding: '6px 14px', fontSize: 'var(--font-size-xs)',
                background: 'var(--color-panel-raised)', color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              }}
            >
              Copy Error
            </button>
          </div>
          {this.state.error && (
            <details style={{ width: '100%', maxHeight: 120, overflow: 'auto' }}>
              <summary style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', cursor: 'pointer' }}>
                Details
              </summary>
              <pre style={{ fontSize: 10, color: 'var(--color-text-disabled)', whiteSpace: 'pre-wrap', marginTop: 4 }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
