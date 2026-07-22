import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const isDev = !app.isPackaged;
const VITE_DEV_SERVER_URL = 'http://localhost:3000';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'OnionV2',
    backgroundColor: '#16181d',
    show: false,
    frame: false, // Custom frameless title bar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      sandbox: false,
      webSecurity: true,
      webviewTag: false,
    },
  });

  mainWindow.setMenu(null);
  setupWindowEvents(mainWindow);

  if (isDev) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      console.error(`[Electron] Production index.html not found at: ${indexPath}`);
      mainWindow.loadURL('data:text/html,<h1>Build not found</h1><p>Run npm run build first.</p>');
    }
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error(`[Electron] Failed to load: ${code} - ${desc}`);
    if (isDev) {
      console.log('[Electron] Retrying in 2s...');
      setTimeout(() => mainWindow?.loadURL(VITE_DEV_SERVER_URL), 2000);
    }
  });
}

// ── App lifecycle ──

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ── IPC Handlers ──

// File dialogs
ipcMain.handle('dialog:open-file', async (_e, options?: Electron.OpenDialogOptions) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Video', extensions: ['mp4', 'webm', 'mov', 'avi'] },
      { name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'] },
      { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a'] },
      { name: '3D Model', extensions: ['gltf', 'glb', 'obj', 'fbx'] },
      { name: 'Project', extensions: ['onion', 'json'] },
    ],
    ...options,
  });
  return result.canceled ? null : result.filePaths;
});

ipcMain.handle('dialog:save-file', async (_e, options?: Electron.SaveDialogOptions) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'OnionV2 Project', extensions: ['onion'] },
      { name: 'JSON', extensions: ['json'] },
    ],
    ...options,
  });
  return result.canceled ? null : result.filePath;
});

// File system access (for project save/load)
// Only allow absolute paths — reject traversal attempts
function isSafePath(p: string): boolean {
  const resolved = path.resolve(p);
  return path.isAbsolute(resolved) && !resolved.includes('..');
}

ipcMain.handle('fs:read-file', async (_e, filePath: string) => {
  if (!isSafePath(filePath)) return { data: null, error: 'Invalid path' };    try {
    const data = fs.readFileSync(filePath);
    return { data: new Uint8Array(data).slice(0), error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
});

ipcMain.handle('fs:write-file', async (_e, filePath: string, data: ArrayBuffer) => {
  if (!isSafePath(filePath)) return { error: 'Invalid path' };
  try {
    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, Buffer.from(data));
    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
});

// Window controls
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false);

// Forward maximize/unmaximize state changes to renderer
function setupWindowEvents(win: BrowserWindow): void {
  win.on('maximize', () => win.webContents.send('window:maximized-changed', true));
  win.on('unmaximize', () => win.webContents.send('window:maximized-changed', false));
}

// App info
ipcMain.handle('app:get-info', () => ({
  version: app.getVersion(),
  platform: process.platform,
  isDev,
}));
