export type Model3DFormat = 'gltf' | 'glb' | 'obj' | 'ply' | 'stl';

export interface Model3DData {
  assetId: string;
  format: Model3DFormat;
  /** URL or path to the model file */
  url: string;
  /** Original filename (e.g. "model.glb") — needed to reconstruct a File with correct extension */
  fileName?: string;
  /** MIME type of the model file */
  mimeType?: string;
  /** Scale factor applied on import to fit comp */
  scale: number;
  /** Whether to auto-rotate the model in preview */
  autoRotate: boolean;
  /** Rotation speed for auto-rotate */
  autoRotateSpeed: number;
}

export function defaultModel3DData(): Model3DData {
  return {
    assetId: '',
    format: 'gltf',
    url: '',
    scale: 1,
    autoRotate: false,
    autoRotateSpeed: 1,
  };
}
