import React from 'react';
import { AppShell } from './ui/layout/AppShell';
import { DialogManager } from './ui/dialogs/DialogManager';
import { useKeyboardManager, registerAllShortcuts } from './input/KeyboardManager';
import { useCompositionStore } from './state/compositionStore';
import { useNavigationStore } from './state/navigationStore';

// Register all shortcuts once
registerAllShortcuts();

const App: React.FC = () => {
  // Mount keyboard listener
  useKeyboardManager();

  // Keep navigation stack in sync with active comp on first mount
  React.useEffect(() => {
    const activeId = useCompositionStore.getState().activeCompositionId;
    if (activeId && useNavigationStore.getState().stack.length === 0) {
      useNavigationStore.getState().reset(activeId);
    }
  }, []);

  return (
    <>
      <AppShell />
      <DialogManager />
    </>
  );
};
export default App;
