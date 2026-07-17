import React from 'react';
import { AppShell } from './ui/layout/AppShell';
import { DialogManager } from './ui/dialogs/DialogManager';
import { useKeyboardManager, registerPhase1Shortcuts } from './input/KeyboardManager';

// Register Phase 1 shortcuts once
registerPhase1Shortcuts();

const App:React.FC = ()=>{
  // Mount keyboard listener
  useKeyboardManager();
  return (
    <>
      <AppShell/>
      <DialogManager/>
    </>
  );
};
export default App;
