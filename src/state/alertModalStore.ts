/**
 * alertModalStore — manages a single global alert/confirm/prompt modal.
 * Designed as a queue: only one modal shows at a time.
 * All methods return Promises so callers can await user response.
 */
import { create } from 'zustand';

export type AlertModalType = 'info' | 'success' | 'warning' | 'error' | 'confirm' | 'prompt';

export interface AlertModalOptions {
  /** Modal type — determines icon styling and available buttons */
  type: AlertModalType;
  /** Title shown at the top */
  title: string;
  /** Body message (can include \n for line breaks) */
  message: string;
  /** Label for the primary/confirm button (default: "OK" for alert, "Yes" for confirm, "OK" for prompt) */
  confirmLabel?: string;
  /** Label for the cancel/secondary button (default: "Cancel" for confirm/prompt) */
  cancelLabel?: string;
  /** For prompt type: default input value */
  defaultValue?: string;
  /** For prompt type: placeholder text for the input */
  placeholder?: string;
  /** For prompt type: input validation — return an error string to prevent submission */
  validate?: (value: string) => string | null;
  /** For confirm type: text for the destructive/cancel button */
  destructiveLabel?: string;
  /** Mark the confirm action as destructive (red styling, default false) */
  destructive?: boolean;
  /** Don't show the cancel button (alert type always hides it) */
  hideCancel?: boolean;
  /** Custom CSS class for the modal */
  className?: string;
  /** Max width for the modal */
  maxWidth?: number;
}

export interface AlertModalState {
  /** Whether a modal is currently visible */
  visible: boolean;
  /** The current modal's options */
  options: AlertModalOptions | null;
  /** Internal resolve function for the pending promise */
  _resolve: ((value: any) => void) | null;

  /** Show a modal and return a promise that resolves with user response */
  show: (opts: AlertModalOptions) => Promise<any>;
  /** Dismiss the current modal without resolving (or resolve with null/false) */
  dismiss: () => void;
  /** Resolve the current modal with a value and close it */
  resolve: (value: any) => void;
}

export const useAlertModalStore = create<AlertModalState>((set, get) => ({
  visible: false,
  options: null,
  _resolve: null,

  show: (opts: AlertModalOptions): Promise<any> => {
    const { _resolve: prevResolve, options: prevOpts } = get();
    // If another modal is already showing, resolve it as dismissed first
    if (prevResolve) {
      if (prevOpts?.type === 'prompt') prevResolve(null);
      else if (prevOpts?.type === 'confirm') prevResolve(false);
      else prevResolve(undefined);
    }
    return new Promise((resolve) => {
      set({
        visible: true,
        options: opts,
        _resolve: resolve as any,
      });
    });
  },

  dismiss: () => {
    const { _resolve, options } = get();
    if (_resolve) {
      // Resolve with the appropriate default based on type
      if (options?.type === 'prompt') {
        _resolve(null);
      } else if (options?.type === 'confirm') {
        _resolve(false);
      } else {
        _resolve(undefined);
      }
    }
    set({ visible: false, options: null, _resolve: null });
  },

  resolve: (value: any) => {
    const { _resolve } = get();
    if (_resolve) _resolve(value);
    set({ visible: false, options: null, _resolve: null });
  },
}));

/**
 * Lightweight convenience API — use these helpers instead of calling the store directly.
 *
 * Examples:
 *   await alertConfirm('Delete layer?', 'This cannot be undone.');
 *   const name = await alertPrompt('Name your project', 'Enter a name...', 'My Project');
 *   await alertError('Export failed', 'Disk is full.');
 */
export function alertConfirm(
  title: string,
  message?: string,
  options?: Partial<AlertModalOptions>,
): Promise<boolean> {
  return useAlertModalStore.getState().show({
    type: 'confirm',
    title,
    message: message ?? '',
    confirmLabel: 'Yes',
    cancelLabel: 'Cancel',
    ...options,
  }) as Promise<boolean>;
}

export function alertPrompt(
  title: string,
  message?: string,
  defaultValue?: string,
  options?: Partial<AlertModalOptions>,
): Promise<string | null> {
  return useAlertModalStore.getState().show({
    type: 'prompt',
    title,
    message: message ?? '',
    defaultValue,
    confirmLabel: 'OK',
    cancelLabel: 'Cancel',
    ...options,
  }) as Promise<string | null>;
}

export function alertInfo(
  title: string,
  message?: string,
  options?: Partial<AlertModalOptions>,
): Promise<void> {
  return useAlertModalStore.getState().show({
    type: 'info',
    title,
    message: message ?? '',
    confirmLabel: 'OK',
    ...options,
  }) as Promise<void>;
}

export function alertSuccess(
  title: string,
  message?: string,
  options?: Partial<AlertModalOptions>,
): Promise<void> {
  return useAlertModalStore.getState().show({
    type: 'success',
    title,
    message: message ?? '',
    confirmLabel: 'OK',
    ...options,
  }) as Promise<void>;
}

export function alertWarning(
  title: string,
  message?: string,
  options?: Partial<AlertModalOptions>,
): Promise<void> {
  return useAlertModalStore.getState().show({
    type: 'warning',
    title,
    message: message ?? '',
    confirmLabel: 'OK',
    ...options,
  }) as Promise<void>;
}

export function alertError(
  title: string,
  message?: string,
  options?: Partial<AlertModalOptions>,
): Promise<void> {
  return useAlertModalStore.getState().show({
    type: 'error',
    title,
    message: message ?? '',
    confirmLabel: 'OK',
    ...options,
  }) as Promise<void>;
}
