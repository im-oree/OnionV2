import { create } from 'zustand';
import { expressionEngine, type CompiledExpression } from '../animation/ExpressionEngine';
import { markProjectDirty } from '../storage/StorageManager';

export interface ExpressionEntry {
  layerId: string;
  property: string;
  source: string;
  enabled: boolean;
  compiled: CompiledExpression;
}

interface ExpressionState {
  expressions: Map<string, ExpressionEntry>;
  revision: number;

  /** Add or update an expression for a property */
  setExpression: (layerId: string, property: string, source: string) => void;
  /** Toggle enable/disable */
  toggleExpression: (layerId: string, property: string) => void;
  /** Remove an expression */
  removeExpression: (layerId: string, property: string) => void;
  /** Get expression for a property, or null */
  getExpression: (layerId: string, property: string) => ExpressionEntry | null;
  /** Check if a property has an enabled expression */
  hasExpression: (layerId: string, property: string) => boolean;
}

function makeKey(layerId: string, property: string): string {
  return `${layerId}::${property}`;
}

export const useExpressionStore = create<ExpressionState>((set, get) => ({
  expressions: new Map(),
  revision: 0,

  setExpression: (layerId, property, source) => {
    const key = makeKey(layerId, property);
    const compiled = expressionEngine.compile(source);
    set((s) => {
      const next = new Map(s.expressions);
      next.set(key, { layerId, property, source, enabled: true, compiled });
      return { expressions: next, revision: s.revision + 1 };
    });
    markProjectDirty();
  },

  toggleExpression: (layerId, property) => {
    const key = makeKey(layerId, property);
    set((s) => {
      const existing = s.expressions.get(key);
      if (!existing) return s;
      const next = new Map(s.expressions);
      next.set(key, { ...existing, enabled: !existing.enabled });
      return { expressions: next, revision: s.revision + 1 };
    });
    markProjectDirty();
  },

  removeExpression: (layerId, property) => {
    const key = makeKey(layerId, property);
    set((s) => {
      const next = new Map(s.expressions);
      next.delete(key);
      return { expressions: next, revision: s.revision + 1 };
    });
    markProjectDirty();
  },

  getExpression: (layerId, property) => {
    return get().expressions.get(makeKey(layerId, property)) ?? null;
  },

  hasExpression: (layerId, property) => {
    const e = get().expressions.get(makeKey(layerId, property));
    return !!e && e.enabled && !e.compiled.error;
  },
}));