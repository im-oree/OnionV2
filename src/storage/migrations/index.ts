/**
 * Migrations — registry and runner for project schema version upgrades.
 * Each migration is a pure function: (data: any) => data
 * Migrations are applied in order from the source version to current.
 */

export const CURRENT_VERSION = '1.1';

/** Migration function: receives old data, returns transformed data */
export type Migration = (data: any) => any;

/**
 * Registry of all migrations, keyed by target version.
 * Example: '1.0' → '2.0' migration transforms v1 data into v2 format.
 */
const MIGRATIONS: Array<{ from: string; to: string; migrate: Migration }> = [
  // v1.0 → v1.1: introduce project folders
  {
    from: '1.0', to: '1.1',
    migrate: (data) => {
      if (!data.folders) data.folders = [];
      // Ensure every asset has an explicit folderId field
      if (Array.isArray(data.assets)) {
        data.assets = data.assets.map((a: any) => ({ ...a, folderId: a.folderId ?? null }));
      }
      if (Array.isArray(data.compositions)) {
        data.compositions = data.compositions.map((c: any) => ({ ...c, folderId: c.folderId ?? null }));
      }
      return data;
    },
  },
];

/**
 * Version ordering — used to determine migration order.
 */
const VERSION_ORDER: string[] = ['0.0', '1.0', '1.1'];

function versionIndex(v: string): number {
  const idx = VERSION_ORDER.indexOf(v);
  return idx >= 0 ? idx : -1;
}

function isNewer(a: string, b: string): boolean {
  const ia = versionIndex(a);
  const ib = versionIndex(b);
  if (ia < 0 || ib < 0) return a > b; // fallback string comparison
  return ia > ib;
}

/**
 * Run all migrations from `fromVersion` to `toVersion`.
 * If no migrations are needed (same version or already current), returns data unchanged.
 */
export function runMigrations(data: any, fromVersion: string, toVersion: string): any {
  if (fromVersion === toVersion) return data;

  // Find applicable migrations
  let current = { ...data };
  let currentVersion = fromVersion;

  // Apply migrations in order until we reach target version
  let applied = 0;
  const maxIterations = 20; // safety limit
  while (currentVersion !== toVersion && applied < maxIterations) {
    const applicable = MIGRATIONS.find((m) => m.from === currentVersion);
    if (!applicable) break;

    current = applicable.migrate(current);
    currentVersion = applicable.to;
    applied++;
  }

  current.version = toVersion;
  return current;
}

/**
 * Validate a loaded project file has the minimum required structure.
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateProjectData(data: any): { valid: true } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Project file is not a valid JSON object.' };
  }
  if (!data.version) {
    return { valid: false, error: 'Project file is missing a version field.' };
  }
  if (!isNewer(CURRENT_VERSION, data.version) && data.version !== CURRENT_VERSION) {
    // Project is from a newer version of Onion — refuse to load
    return { valid: false, error: `Project was saved with a newer version of Onion (${data.version}). Please update Onion to open it.` };
  }
  if (typeof data.name !== 'string') {
    return { valid: false, error: 'Project file is missing a name.' };
  }
  return { valid: true };
}
