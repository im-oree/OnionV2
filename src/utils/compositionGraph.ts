import type { Composition } from '../types/composition';
import type { CompData } from '../types/layer';

export const MAX_NESTING_DEPTH = 6;

/**
 * Check if adding `childCompId` inside `parentCompId` would create a cycle.
 * Returns true if the addition is SAFE (no cycle detected).
 */
export function canNestComposition(
  parentCompId: string,
  childCompId: string,
  allCompositions: Composition[],
): { ok: true } | { ok: false; reason: string } {
  if (parentCompId === childCompId) {
    return { ok: false, reason: 'A composition cannot contain itself.' };
  }

  // DFS through childCompId's descendants — if we find parentCompId, that's a cycle
  const visited = new Set<string>();
  const stack: string[] = [childCompId];

  while (stack.length > 0) {
    const currentId = stack.pop()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    if (currentId === parentCompId) {
      return { ok: false, reason: 'This would create a circular reference.' };
    }

    const comp = allCompositions.find(c => c.id === currentId);
    if (!comp) continue;

    for (const layer of comp.layers) {
      if (layer.type === 'comp' && layer.data) {
        const src = (layer.data as CompData).sourceCompId;
        if (src) stack.push(src);
      }
    }
  }

  // Check max nesting depth from parent
  const depth = getMaxDepth(childCompId, allCompositions, 0);
  if (depth + 1 > MAX_NESTING_DEPTH) {
    return { ok: false, reason: `Max nesting depth (${MAX_NESTING_DEPTH}) would be exceeded.` };
  }

  return { ok: true };
}

function getMaxDepth(compId: string, all: Composition[], current: number): number {
  if (current > MAX_NESTING_DEPTH + 2) return current; // hard cutoff
  const comp = all.find(c => c.id === compId);
  if (!comp) return current;
  let max = current;
  for (const layer of comp.layers) {
    if (layer.type === 'comp' && layer.data) {
      const src = (layer.data as CompData).sourceCompId;
      if (src) max = Math.max(max, getMaxDepth(src, all, current + 1));
    }
  }
  return max;
}

/** Find every composition that uses `compId` as a nested layer */
export function findCompositionsUsing(
  compId: string,
  allCompositions: Composition[],
): Composition[] {
  return allCompositions.filter(c =>
    c.layers.some(l => l.type === 'comp' && (l.data as CompData)?.sourceCompId === compId),
  );
}