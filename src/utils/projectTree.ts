/**
 * projectTree — utility to build the flat rendered list of the project tree
 * with nested folders, compositions, and assets.
 */
import type { ProjectFolder, ProjectAsset } from '../types/project';
import type { Composition } from '../types/composition';

export type TreeItem =
  | { kind: 'folder'; folder: ProjectFolder; depth: number; hasChildren: boolean }
  | { kind: 'comp'; comp: Composition; depth: number }
  | { kind: 'asset'; asset: ProjectAsset; depth: number };

export function buildProjectTree(
  folders: ProjectFolder[],
  comps: Composition[],
  assets: ProjectAsset[],
): TreeItem[] {
  const out: TreeItem[] = [];

  // Group folders by parent
  const foldersByParent = new Map<string | null, ProjectFolder[]>();
  for (const f of folders) {
    const key = f.parentId ?? null;
    const list = foldersByParent.get(key) ?? [];
    list.push(f);
    foldersByParent.set(key, list);
  }
  for (const [, list] of foldersByParent) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Group comps by folder
  const compsByFolder = new Map<string | null, Composition[]>();
  for (const c of comps) {
    const key = (c as any).folderId ?? null;
    const list = compsByFolder.get(key) ?? [];
    list.push(c);
    compsByFolder.set(key, list);
  }

  // Group assets by folder
  const assetsByFolder = new Map<string | null, ProjectAsset[]>();
  for (const a of assets) {
    const key = a.folderId ?? null;
    const list = assetsByFolder.get(key) ?? [];
    list.push(a);
    assetsByFolder.set(key, list);
  }

  function walk(parentId: string | null, depth: number): void {
    const childFolders = foldersByParent.get(parentId) ?? [];
    for (const f of childFolders) {
      const hasChildren =
        (foldersByParent.get(f.id) ?? []).length > 0 ||
        (compsByFolder.get(f.id) ?? []).length > 0 ||
        (assetsByFolder.get(f.id) ?? []).length > 0;
      out.push({ kind: 'folder', folder: f, depth, hasChildren });
      if (f.expanded ?? true) {
        walk(f.id, depth + 1);
        // Comps inside this folder
        for (const c of compsByFolder.get(f.id) ?? []) {
          out.push({ kind: 'comp', comp: c, depth: depth + 1 });
        }
        // Assets inside this folder
        for (const a of assetsByFolder.get(f.id) ?? []) {
          out.push({ kind: 'asset', asset: a, depth: depth + 1 });
        }
      }
    }

    if (parentId === null) {
      // Root-level comps and assets
      for (const c of compsByFolder.get(null) ?? []) {
        out.push({ kind: 'comp', comp: c, depth });
      }
      for (const a of assetsByFolder.get(null) ?? []) {
        out.push({ kind: 'asset', asset: a, depth });
      }
    }
  }

  walk(null, 0);
  return out;
}
