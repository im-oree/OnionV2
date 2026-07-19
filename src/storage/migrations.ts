/**
 * Project file schema migrations + validation.
 * Each migration transforms data from one version to the next.
 */
import type { SerializedProject } from './StorageAdapter';

export const CURRENT_VERSION = '1.0';

type Migration = (data: any) => any;

const migrations: Record<string, Migration> = {
  // Example: '0.9_to_1.0': (data) => { data.version = '1.0'; return data; },
};

export function runMigrations(
  data: SerializedProject,
  fromVersion: string,
  toVersion: string,
): SerializedProject {
  // For now, just stamp the version — add real migrations as schema evolves
  if (fromVersion !== toVersion) {
    (data as any).version = toVersion;
  }
  return data;
}

export function validateProjectData(data: any): { valid: true } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Project data is not an object' };
  }
  if (!data.name || typeof data.name !== 'string') {
    return { valid: false, error: 'Project name is missing or invalid' };
  }
  if (!Array.isArray(data.compositions)) {
    return { valid: false, error: 'Compositions array is missing' };
  }
  if (!data.layers || typeof data.layers !== 'object') {
    return { valid: false, error: 'Layers object is missing' };
  }
  return { valid: true };
}