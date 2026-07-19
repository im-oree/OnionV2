import React from 'react';
import { NewCompositionDialog } from './NewCompositionDialog';
import { NewProjectDialog } from './NewProjectDialog';
import { PreferencesDialog } from './PreferencesDialog';
import { WorkspacePicker } from './WorkspacePicker';
import { ProjectSettingsDialog } from './ProjectSettingsDialog';

interface DialogState {
  newComposition: boolean;
  newProject: boolean;
  preferences: boolean;
  preferencesSection?: string;
  workspacePicker: boolean;
  projectSettings: boolean;
}

let dialogState: DialogState = { newComposition: false, newProject: false, preferences: false, workspacePicker: false, projectSettings: false };
const listeners: Array<() => void> = [];

function notifyListeners(): void {
  for (const l of listeners) l();
}

export function openNewCompositionDialog(): void {
  dialogState = { ...dialogState, newComposition: true };
  notifyListeners();
}

export function openNewProjectDialog(): void {
  dialogState = { ...dialogState, newProject: true };
  notifyListeners();
}

export function closeAllDialogs(): void {
  dialogState = { newComposition: false, newProject: false, preferences: false, workspacePicker: false, projectSettings: false };
  notifyListeners();
}

export function openPreferencesDialog(section?: string): void {
  dialogState = { ...dialogState, preferences: true, preferencesSection: section };
  notifyListeners();
}

export function openWorkspacePicker(): void {
  dialogState = { ...dialogState, workspacePicker: true };
  notifyListeners();
}

export function openProjectSettings(): void {
  dialogState = { ...dialogState, projectSettings: true };
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
      {state.newProject && <NewProjectDialog open onClose={closeAllDialogs} />}
      {state.preferences && <PreferencesDialog onClose={closeAllDialogs} initialSection={state.preferencesSection} />}
      {state.workspacePicker && <WorkspacePicker onClose={closeAllDialogs} />}
      {state.projectSettings && <ProjectSettingsDialog onClose={closeAllDialogs} />}
    </>
  );
};