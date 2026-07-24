import React from 'react';
import { NewCompositionDialog } from './NewCompositionDialog';
import { NewProjectDialog } from './NewProjectDialog';
import { PreferencesDialog } from './PreferencesDialog';
import { WorkspacePicker } from './WorkspacePicker';
import { ProjectSettingsDialog } from './ProjectSettingsDialog';
import { ExportSettingsDialog } from './ExportSettingsDialog';
import { ExportProgressDialog } from './ExportProgressDialog';
import { ExtractAudioDialog } from './ExtractAudioDialog';
import { SaveProjectDialog } from './SaveProjectDialog';
import { RenameProjectDialog } from './RenameProjectDialog';

interface DialogState {
  newComposition: boolean;
  newProject: boolean;
  preferences: boolean;
  preferencesSection?: string;
  workspacePicker: boolean;
  projectSettings: boolean;
  extractAudioLayerId: string | null;
  saveProject: { open: boolean; mode: 'first-save' | 'save-as' };
  renameProject: boolean;
}

let dialogState: DialogState = {
  newComposition: false, newProject: false, preferences: false,
  workspacePicker: false, projectSettings: false, extractAudioLayerId: null,
  saveProject: { open: false, mode: 'first-save' },
  renameProject: false,
};
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

export function openExtractAudioDialog(layerId: string): void {
  dialogState = { ...dialogState, extractAudioLayerId: layerId };
  notifyListeners();
}

export function closeExtractAudioDialog(): void {
  dialogState = { ...dialogState, extractAudioLayerId: null };
  notifyListeners();
}

export function openSaveProjectDialog(mode: 'first-save' | 'save-as' = 'first-save'): void {
  dialogState = { ...dialogState, saveProject: { open: true, mode } };
  notifyListeners();
}

export function closeSaveProjectDialog(): void {
  dialogState = { ...dialogState, saveProject: { open: false, mode: 'first-save' } };
  notifyListeners();
}

export function openRenameProjectDialog(): void {
  dialogState = { ...dialogState, renameProject: true };
  notifyListeners();
}

export function closeRenameProjectDialog(): void {
  dialogState = { ...dialogState, renameProject: false };
  notifyListeners();
}

export function closeAllDialogs(): void {
  dialogState = {
    newComposition: false, newProject: false, preferences: false,
    workspacePicker: false, projectSettings: false, extractAudioLayerId: null,
    saveProject: { open: false, mode: 'first-save' },
    renameProject: false,
  };
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

  // Look up the layer for extract-audio dialog
  const extractLayer = React.useMemo(() => {
    if (!state.extractAudioLayerId) return null;
    const cs = (window as any).__compositionStore?.getState?.();
    if (!cs) return null;
    for (const comp of cs.compositions) {
      const l = comp.layers.find((x: any) => x.id === state.extractAudioLayerId);
      if (l) return l;
    }
    return null;
  }, [state.extractAudioLayerId]);

  return (
    <>
      {state.newComposition && <NewCompositionDialog open onClose={closeAllDialogs} />}
      {state.newProject && <NewProjectDialog open onClose={closeAllDialogs} />}
      {state.preferences && <PreferencesDialog onClose={closeAllDialogs} initialSection={state.preferencesSection} />}
      {state.workspacePicker && <WorkspacePicker onClose={closeAllDialogs} />}
      {state.projectSettings && <ProjectSettingsDialog onClose={closeAllDialogs} />}
      {extractLayer && (
        <ExtractAudioDialog layer={extractLayer} onClose={closeExtractAudioDialog} />
      )}
      {state.saveProject.open && (
        <SaveProjectDialog
          open
          mode={state.saveProject.mode}
          onClose={closeSaveProjectDialog}
        />
      )}
      {state.renameProject && (
        <RenameProjectDialog open onClose={closeRenameProjectDialog} />
      )}
      {/* Export dialogs are self-managed via useExportStore */}
      <ExportSettingsDialog />
      <ExportProgressDialog />
    </>
  );
};