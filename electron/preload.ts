// Electron preload script — exposes safe IPC bridge to renderer
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // File dialogs
  openFileDialog: (options?: any) => ipcRenderer.invoke('dialog:open-file', options),
  saveFileDialog: (options?: any) => ipcRenderer.invoke('dialog:save-file', options),

  // File system (for project save/load)
  readFile: (filePath: string) => ipcRenderer.invoke('fs:read-file', filePath),
  writeFile: (filePath: string, data: ArrayBuffer) => ipcRenderer.invoke('fs:write-file', filePath, data),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onMaximizedChange: (cb: (maximized: boolean) => void) => {
    ipcRenderer.on('window:maximized-changed', (_e, v) => cb(v));
  },
  offMaximizedChange: () => {
    ipcRenderer.removeAllListeners('window:maximized-changed');
  },

  // App info
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),

  // Platform detection
  platform: process.platform,
  isElectron: true,
});
