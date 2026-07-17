/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }

interface FileSystemFileHandle {
  kind:'file'; name:string;
  getFile():Promise<File>;
  createWritable(o?:FileSystemCreateWritableOptions):Promise<FileSystemWritableFileStream>;
  queryPermission(d?:FileSystemPermissionDescriptor):Promise<PermissionState>;
  requestPermission(d?:FileSystemPermissionDescriptor):Promise<PermissionState>;
}
interface FileSystemWritableFileStream extends WritableStream {
  write(d:FileSystemWriteChunkType):Promise<void>;
  seek(p:number):Promise<void>;
  truncate(s:number):Promise<void>;
}
interface FileSystemCreateWritableOptions { keepExistingData?:boolean }
interface FileSystemPermissionDescriptor { mode?:'read'|'readwrite' }
type FileSystemWriteChunkType = ArrayBuffer|ArrayBufferView|Blob|string
  |{type:'write';data:ArrayBuffer|ArrayBufferView|Blob|string;position?:number}
  |{type:'seek';position:number}|{type:'truncate';size:number};
interface Window {
  showOpenFilePicker(o?:{multiple?:boolean;types?:{description:string;accept:Record<string,string[]>}[];excludeAcceptAllOption?:boolean}):Promise<FileSystemFileHandle[]>;
  showSaveFilePicker(o?:{types?:{description:string;accept:Record<string,string[]>}[];excludeAcceptAllOption?:boolean}):Promise<FileSystemFileHandle>;
  showDirectoryPicker(o?:{mode?:'read'|'readwrite'}):Promise<FileSystemDirectoryHandle>;
}
interface FileSystemDirectoryHandle {
  name:string;
  getFileHandle(n:string,o?:{create?:boolean}):Promise<FileSystemFileHandle>;
  getDirectoryHandle(n:string,o?:{create?:boolean}):Promise<FileSystemDirectoryHandle>;
  removeEntry(n:string,o?:{recursive?:boolean}):Promise<void>;
  values():AsyncIterableIterator<FileSystemFileHandle|FileSystemDirectoryHandle>;
  keys():AsyncIterableIterator<string>;
  entries():AsyncIterableIterator<[string,FileSystemFileHandle|FileSystemDirectoryHandle]>;
}
