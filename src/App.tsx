import React from 'react';
import { AppShell } from './ui/layout/AppShell';
import { DialogManager } from './ui/dialogs/DialogManager';
import { useKeyboardManager, registerAllShortcuts } from './input/KeyboardManager';

// Register all shortcuts once
registerAllShortcuts();

const App: React.FC = () => {
  // Mount keyboard listener
  useKeyboardManager();
  return (
    <>
      <AppShell />
      <DialogManager />
    </>
  );
};
export default App;
