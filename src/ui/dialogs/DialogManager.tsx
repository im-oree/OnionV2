import React from 'react';
import { NewCompositionDialog } from './NewCompositionDialog';

interface DialogState {
  newComposition: boolean;
}

let dialogState: DialogState = { newComposition: false };
const listeners: Array<() => void> = [];

function notifyListeners(): void {
  for (const l of listeners) l();
}

export function openNewCompositionDialog(): void {
  dialogState = { ...dialogState, newComposition: true };
  notifyListeners();
}

export function closeAllDialogs(): void {
  dialogState = { newComposition: false };
  notifyListeners();
}

function useDialogState(): DialogState {
  const [state, setState] = React.useState<DialogState>(dialogState);
  React.useEffect(() => {
    const handler = () => setState({ ...dialogState });
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);
  return state;
}

export const DialogManager: React.FC = () => {
  const state = useDialogState();
  return (
    <>
      {state.newComposition && <NewCompositionDialog open onClose={closeAllDialogs} />}
    </>
  );
};