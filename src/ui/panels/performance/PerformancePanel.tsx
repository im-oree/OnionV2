/**
 * PerformancePanel — shows real-time memory, FPS, cache, and rendering stats.
 * Includes actions to clear cache and purge memory.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { textureCache } from '../../../renderer/textures/TextureCache';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatPercent(v: number): string {
  return `${Math.round(v * 100)}%`;
}

interface PerfSnapshot {
  fps: number;
  targetFps: number;
  frameTimeMs: number;
  frameTimeMin: number;
  frameTimeMax: number;
  droppedFrames: number;
  cacheHitRate: number;
  cacheMemoryBytes: number;
  cacheBudgetBytes: number;
  quality: string;
  qualityScale: number;
}

interface CacheInfo {
  totalFrames: number;
  totalBytes: number;
  maxBytes: number;
  compositions: Array<{ id: string; name: string; frames: number; bytes: number }>;
}

function getPerfSnapshot(): PerfSnapshot | null {
  const pm = (window as any).__perfMonitor;
  if (!pm) return null;
  const s = pm.getStats();
  return s as PerfSnapshot;
}

function getCacheInfo(): CacheInfo {
  const fc = (window as any).__frameCache;
  if (!fc) return { totalFrames: 0, totalBytes: 0, maxBytes: 0, compositions: [] };
  const comps = useCompositionStore.getState().compositions;
  const compData: CacheInfo['compositions'] = [];
  let totalBytes = 0;
  let totalFrames = 0;

  for (const comp of comps) {
    // Access frame cache internals — the cache is a Map<string, Map<number, CachedFrame>>
    const compCache = (fc as any)._cache.get(comp.id);
    if (compCache && compCache.size > 0) {
      let bytes = 0;
      for (const [, entry] of compCache) {
        bytes += entry.byteSize || 0;
      }
      totalBytes += bytes;
      totalFrames += compCache.size;
      compData.push({ id: comp.id, name: comp.name, frames: compCache.size, bytes });
    }
  }

  return {
    totalFrames,
    totalBytes,
    maxBytes: fc.maxBytes,
    compositions: compData.sort((a, b) => b.bytes - a.bytes),
  };
}

const MiniBar: React.FC<{ value: number; max: number; color: string; height?: number }> = ({
  value, max, color, height = 4,
}) => (
  <div className="w-full bg-surface rounded-sm overflow-hidden" style={{ height }}>
    <div
      className="rounded-sm transition-all duration-200"
      style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%`, height: '100%', backgroundColor: color }}
    />
  </div>
);

const StatRow: React.FC<{ label: string; value: string; detail?: string }> = ({ label, value, detail }) => (
  <div className="flex items-center justify-between py-0.5">
    <span className="text-[10px] text-text-secondary">{label}</span>
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-mono text-text-primary font-medium">{value}</span>
      {detail && <span className="text-[9px] text-text-disabled">{detail}</span>}
    </div>
  </div>
);

export const PerformancePanel: React.FC = () => {
  const [snapshot, setSnapshot] = useState<PerfSnapshot | null>(null);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo>({ totalFrames: 0, totalBytes: 0, maxBytes: 0, compositions: [] });
  const [jsHeap, setJsHeap] = useState<{ used: number; total: number; limit: number } | null>(null);
  const [textureCount, setTextureCount] = useState(0);
  const [resourceCount, setResourceCount] = useState(0);

  // Poll stats every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      setSnapshot(getPerfSnapshot());
      setCacheInfo(getCacheInfo());

      // JS heap from performance.memory (Chrome only)
      const mem = (performance as any).memory;
      if (mem) {
        setJsHeap({ used: mem.usedJSHeapSize, total: mem.totalJSHeapSize, limit: mem.jsHeapSizeLimit });
      }

      // Texture cache count
      const tc = (window as any).__textureCache ?? textureCache;
      const tcSize = (tc as any)?.cache?.size ?? 0;
      setTextureCount(tcSize);

      // Resource registry count
      const rr = (window as any).__resourceRegistry;
      if (rr) setResourceCount(rr.totalTracked);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const clearCache = useCallback(() => {
    const fc = (window as any).__frameCache;
    if (fc) fc.invalidateAllCompositions();
  }, []);

  const purgeAll = useCallback(() => {
    const fc = (window as any).__frameCache;
    if (fc) fc.invalidateAllCompositions();
    textureCache.clear();
    // Force GC hint
    if (typeof window !== 'undefined' && (window as any).gc) {
      try { (window as any).gc(); } catch {}
    }
  }, []);

  const trimCache = useCallback(() => {
    const fc = (window as any).__frameCache;
    if (fc) fc.trim(Math.floor(fc.maxBytes * 0.5));
  }, []);

  const fps = snapshot?.fps ?? 0;
  const targetFps = snapshot?.targetFps ?? 30;
  const fpsRatio = targetFps > 0 ? fps / targetFps : 0;
  const fpsColor = fpsRatio >= 0.95 ? '#4ade80' : fpsRatio >= 0.75 ? '#facc15' : '#f87171';

  const cachePct = cacheInfo.maxBytes > 0 ? cacheInfo.totalBytes / cacheInfo.maxBytes : 0;
  const cacheColor = cachePct > 0.8 ? '#f87171' : cachePct > 0.5 ? '#facc15' : '#4ade80';

  return (
    <div className="p-2.5 space-y-2.5 text-ui-xs overflow-auto h-full">
      {/* ===== Header ===== */}
      <div className="text-text-secondary font-medium uppercase tracking-wider text-[10px]">Performance</div>

      {/* ===== Rendering ===== */}
      <Section title="Rendering">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1">
            <StatRow label="FPS" value={`${fps}`} detail={`/ ${targetFps}`} />
          </div>
          <div className="w-[60px]">
            <MiniBar value={fps} max={Math.max(targetFps, 60)} color={fpsColor} height={6} />
          </div>
        </div>
        <div className="flex gap-3">
          <StatRow label="Frame time" value={snapshot ? `${snapshot.frameTimeMs}ms` : '-'} />
          <StatRow label="Min" value={snapshot ? `${snapshot.frameTimeMin}ms` : '-'} />
          <StatRow label="Max" value={snapshot ? `${snapshot.frameTimeMax}ms` : '-'} />
        </div>
        <div className="flex gap-3">
          <StatRow label="Dropped" value={snapshot ? `${snapshot.droppedFrames}` : '-'} />
          <StatRow label="Quality" value={snapshot?.quality ?? '-'} />
        </div>
      </Section>

      {/* ===== Memory ===== */}
      <Section title="Memory">
        {/* Frame Cache */}
        <div className="mb-1">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-text-secondary">Frame Cache</span>
            <span className="text-[9px] font-mono text-text-primary">
              {formatBytes(cacheInfo.totalBytes)} / {formatBytes(cacheInfo.maxBytes)}
            </span>
          </div>
          <MiniBar value={cacheInfo.totalBytes} max={cacheInfo.maxBytes} color={cacheColor} height={5} />
          <div className="flex justify-between mt-0.5">
            <span className="text-[9px] text-text-disabled">{cacheInfo.totalFrames} frames</span>
            <span className="text-[9px] text-text-disabled">{formatPercent(cachePct)} used</span>
          </div>
        </div>

        {/* JS Heap */}
        {jsHeap && (
          <div className="mb-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-text-secondary">JS Heap</span>
              <span className="text-[9px] font-mono text-text-primary">
                {formatBytes(jsHeap.used)} / {formatBytes(jsHeap.total)}
              </span>
            </div>
            <MiniBar value={jsHeap.used} max={jsHeap.total} color="#60a5fa" height={5} />
            <div className="text-[9px] text-text-disabled mt-0.5">
              Limit: {formatBytes(jsHeap.limit)}
            </div>
          </div>
        )}

        {/* Resources */}
        <div className="flex gap-3">
          <StatRow label="Textures" value={`${textureCount}`} />
          <StatRow label="Tracked Resources" value={`${resourceCount}`} />
        </div>
      </Section>

      {/* ===== Cache ===== */}
      <Section title="Cache">
        <StatRow
          label="Hit Rate"
          value={snapshot ? formatPercent(snapshot.cacheHitRate) : '-'}
        />
        <StatRow label="Coverage" value={`${cacheInfo.totalFrames} frames`} />
        {snapshot && (
          <StatRow label="Budget" value={formatBytes(snapshot.cacheBudgetBytes)} />
        )}

        {/* Per-composition breakdown */}
        {cacheInfo.compositions.length > 0 && (
          <div className="mt-1 space-y-0.5">
            <div className="text-[9px] text-text-disabled uppercase tracking-wider">Per Composition</div>
            {cacheInfo.compositions.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-0.5">
                <span className="text-[9px] text-text-secondary truncate flex-1 mr-2">{c.name}</span>
                <span className="text-[9px] font-mono text-text-primary">{c.frames} frames</span>
                <span className="text-[9px] font-mono text-text-disabled ml-1.5">{formatBytes(c.bytes)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ===== Actions ===== */}
      <Section title="Actions">
        <div className="flex flex-col gap-1.5">
          <button
            onClick={clearCache}
            className="w-full py-1.5 text-[10px] font-medium bg-surface text-text-primary border border-border rounded-sm cursor-pointer hover:bg-panel-hover transition-colors"
          >
            Clear Frame Cache
          </button>
          <button
            onClick={trimCache}
            className="w-full py-1.5 text-[10px] font-medium bg-surface text-text-primary border border-border rounded-sm cursor-pointer hover:bg-panel-hover transition-colors"
          >
            Trim Cache to 50%
          </button>
          <button
            onClick={purgeAll}
            className="w-full py-1.5 text-[10px] font-medium bg-danger/10 text-danger border border-danger/30 rounded-sm cursor-pointer hover:bg-danger/20 transition-colors"
          >
            Purge All Memory
          </button>
        </div>
        <div className="text-[9px] text-text-disabled mt-1">
          <span>⚠ Available actions</span>
          <ul className="list-disc pl-3 mt-0.5 space-y-0.5">
            <li>Clear Frame Cache — removes all cached frames</li>
            <li>Trim Cache to 50% — evicts oldest frames until half the budget is free</li>
            <li>Purge All Memory — clears cache + textures + hints GC</li>
          </ul>
        </div>
      </Section>
    </div>
  );
};

/** Simple collapsible section wrapper */
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-surface-alt rounded-sm p-2 border border-border">
    <div className="text-[9px] text-text-disabled uppercase tracking-wider mb-1.5">{title}</div>
    {children}
  </div>
);

export default PerformancePanel;
