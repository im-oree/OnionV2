/**
 * FileSaver — save blobs to disk with best-available UX.
 *
 * Priority:
 *   1. showSaveFilePicker (Chrome/Edge) — user picks exact path + name
 *   2. showDirectoryPicker (Chrome/Edge) — user picks folder for sequences
 *   3. Blob URL + <a download> — fallback for Firefox/Safari
 */

export interface SaveResult {
  saved: boolean;
  cancelled: boolean;
  method: 'save-picker' | 'directory-picker' | 'download';
  path?: string;
  error?: string;
}

/** Save a single Blob as a file. */
export async function saveFile(
  blob: Blob,
  suggestedName: string,
  extension: string,
  useSaveDialog: boolean,
  mimeType?: string,
): Promise<SaveResult> {
  const fullName = suggestedName.endsWith(`.${extension}`)
    ? suggestedName
    : `${suggestedName}.${extension}`;

  // Try File System Access saveFilePicker
  if (useSaveDialog && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fullName,
        types: [{
          description: extension.toUpperCase(),
          accept: {
            [mimeType ?? mimeForExt(extension)]: [`.${extension}`],
          },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { saved: true, cancelled: false, method: 'save-picker', path: handle.name };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { saved: false, cancelled: true, method: 'save-picker' };
      }
      // Fall through to blob download
      console.warn('[FileSaver] saveFilePicker failed, falling back:', err);
    }
  }

  // Fallback: Blob URL download
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fullName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Delay revoke so browser can start the download
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return { saved: true, cancelled: false, method: 'download', path: fullName };
  } catch (err: any) {
    return { saved: false, cancelled: false, method: 'download', error: err?.message ?? 'Save failed' };
  }
}

/**
 * Request a directory handle for sequence output. Falls back to null if
 * the browser doesn't support it — callers should then use ZIP delivery.
 */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!('showDirectoryPicker' in window)) return null;
  try {
    return await (window as any).showDirectoryPicker({ mode: 'readwrite' });
  } catch {
    return null;
  }
}

/** Write a single file into a directory handle. */
export async function writeFileToDir(
  dir: FileSystemDirectoryHandle,
  name: string,
  data: Blob | Uint8Array,
): Promise<void> {
  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await (handle as any).createWritable();
  await writable.write(data);
  await writable.close();
}

function mimeForExt(ext: string): string {
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    mp4: 'video/mp4',
    webm: 'video/webm',
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
    aac: 'audio/aac',
    opus: 'audio/opus',
    zip: 'application/zip',
  };
  return map[ext.toLowerCase()] ?? 'application/octet-stream';
}