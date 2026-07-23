/**
 * PerformancePanel — shows real-time FPS, rendering stats, JS heap,
 * and AE-style RAM + Disk cache usage bars.
 */
import React, { useEffect, useState } from 'react';
import { textureCache } from '../../../renderer/textures/TextureCache';
import { useCacheStore } from '../../../state/cacheStore';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

interface PerfSnapshot {
  fps: number;
  targetFps: number;
  frameTimeMs: number;
  frameTimeMin: number;
  frameTimeMax: number;
  droppedFrames: number;
  quality: string;
  qualityScale: number;
}

function getPerfSnapshot(): PerfSnapshot | null {
  const pm = (window as any).__perfMonitor;
  if (!pm) return null;
  return pm.getStats() as PerfSnapshot;
}

const MiniBar: React.FC<{
  value: number;
  max: number;
  color: string;
  height?: number;
  label?: string;
}> = ({ value, max, color, height = 4, label }) => (
  <div className="space-y-0.5">
    {label && (
      <div className="flex justify-between text-[9px] text-text-disabled">
        <span>{label}</span>
        <span>{formatBytes(value)} / {formatBytes(max)}</span>
      </div>
    )}
    <div className="w-full bg-surface rounded-sm overflow-hidden" style={{ height }}>
      <div
        className="rounded-sm transition-all duration-300"
        style={{
          width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%`,
          height: '100%',
          backgroundColor: color,
        }}
      />
    </div>
  </div>
);

const StatRow: React.FC<{ label: string; value: string; detail?: string }> = ({
  label, value, detail,
}) => (
  <div className="flex items-center justify-between py-0.5">
    <span className="text-[10px] text-text-secondary">{label}</span>
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-mono text-text-primary font-medium">{value}</span>
      {detail && <span className="text-[9px] text-text-disabled">{detail}</span>}
    </div>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title, children,
}) => (
  <div className="bg-surface-alt rounded-sm p-2 border border-border">
    <div className="text-[9px] text-text-disabled uppercase tracking-wider mb-1.5">{title}</div>
    {children}
  </div>
);

export const PerformancePanel: React.FC = () => {
  const [snapshot, setSnapshot] = useState<PerfSnapshot | null>(null);
  const [jsHeap, setJsHeap] = useState<{
    used: number; total: number; limit: number;
  } | null>(null);
  const [textureCount, setTextureCount] = useState(0);
  const [resourceCount, setResourceCount] = useState(0);

  const cacheStats = useCacheStore(s => s.stats);
  const refreshCacheStats = useCacheStore(s => s.refreshStats);
  const purgeRam = useCacheStore(s => s.purgeRam);
  const purgeDisk = useCacheStore(s => s.purgeDisk);
  const isPurging = useCacheStore(s => s.isPurging);

  useEffect(() => {
    const interval = setInterval(() => {
      setSnapshot(getPerfSnapshot());
      refreshCacheStats();

      const mem = (performance as any).memory;
      if (mem) {
        setJsHeap({
          used: mem.usedJSHeapSize,
          total: mem.totalJSHeapSize,
          limit: mem.jsHeapSizeLimit,
        });
      }

      const tc = (window as any).__textureCache ?? textureCache;
      setTextureCount((tc as any)?.cache?.size ?? 0);

      const rr = (window as any).__resourceRegistry;
      if (rr) setResourceCount(rr.totalTracked);
    }, 500);
    return () => clearInterval(interval);
  }, [refreshCacheStats]);

  const fps = snapshot?.fps ?? 0;
  const targetFps = snapshot?.targetFps ?? 30;
  const fpsRatio = targetFps > 0 ? fps / targetFps : 0;
  const fpsColor = fpsRatio >= 0.95
    ? '#4ade80'
    : fpsRatio >= 0.75
    ? '#facc15'
    : '#f87171';

  const ramUsed  = cacheStats?.ram.usedBytes  ?? 0;
  const ramMax   = cacheStats?.ram.maxBytes   ?? 1;
  const diskUsed = cacheStats?.disk.usedBytes ?? 0;
  const diskMax  = cacheStats?.disk.maxBytes  ?? 1;

  // AE-style: green bar = RAM cache, yellow bar = disk cache
  const ramColor  = '#4ade80';
  const diskColor = '#facc15';

  return (
    <div className="p-2.5 space-y-2.5 text-ui-xs overflow-auto h-full">
      <div className="text-text-secondary font-medium uppercase tracking-wider text-[10px]">
        Performance
      </div>

      {/* ── Rendering ── */}
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
          <StatRow label="Min"        value={snapshot ? `${snapshot.frameTimeMin}ms` : '-'} />
          <StatRow label="Max"        value={snapshot ? `${snapshot.frameTimeMax}ms` : '-'} />
        </div>
        <div className="flex gap-3">
          <StatRow label="Dropped" value={snapshot ? `${snapshot.droppedFrames}` : '-'} />
          <StatRow label="Quality" value={snapshot?.quality ?? '-'} />
        </div>
      </Section>

      {/* ── Cache (AE-style green/yellow bars) ── */}
      <Section title="Cache">
        {/* RAM cache bar */}
        <div className="mb-2">
          <MiniBar
            value={ramUsed}
            max={ramMax}
            color={ramColor}
            height={8}
            label="RAM Cache"
          />
          <div className="flex justify-between text-[9px] text-text-disabled mt-0.5">
            <span>
              Hit rate: {cacheStats
                ? `${(cacheStats.ram.hitRate * 100).toFixed(0)}%`
                : '-'}
            </span>
            <span>{cacheStats?.ram.size ?? 0} frames</span>
          </div>
        </div>

        {/* Disk cache bar */}
        <div className="mb-2">
          <MiniBar
            value={diskUsed}
            max={diskMax}
            color={diskColor}
            height={8}
            label="Disk Cache"
          />
          <div className="flex justify-between text-[9px] text-text-disabled mt-0.5">
            <span>
              Tier: {cacheStats?.disk.tier ?? '-'}
            </span>
            <span>
              Writes: {cacheStats?.pendingDiskWrites ?? 0} pending
            </span>
          </div>
        </div>

        {/* GPU texture cache */}
        {(() => {
          const gpuCache = (window as any).__gpuTextureCache;
          if (!gpuCache) return null;
          return (
            <div className="mb-2">
              <MiniBar
                value={gpuCache.usedBytes}
                max={gpuCache.maxBytes}
                color="#a78bfa"
                height={8}
                label="GPU Texture Cache"
              />
              <div className="text-[9px] text-text-disabled mt-0.5">
                {gpuCache.size} textures · {gpuCache.compCount} comps
              </div>
            </div>
          );
        })()}

        {/* Purge buttons */}
        <div className="flex gap-1.5 mt-2">
          <button
            onClick={purgeRam}
            disabled={isPurging}
            className="flex-1 text-[10px] py-0.5 px-1.5 rounded-sm border border-border
                       bg-surface hover:bg-panel-hover text-text-secondary cursor-pointer
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Purge RAM
          </button>
          <button
            onClick={() => purgeDisk()}
            disabled={isPurging}
            className="flex-1 text-[10px] py-0.5 px-1.5 rounded-sm border border-border
                       bg-surface hover:bg-panel-hover text-text-secondary cursor-pointer
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPurging ? 'Purging…' : 'Purge Disk'}
          </button>
        </div>
      </Section>

      {/* ── Memory ── */}
      <Section title="Memory">
        {jsHeap && (
          <div className="mb-1">
            <MiniBar
              value={jsHeap.used}
              max={jsHeap.total}
              color="#60a5fa"
              height={5}
              label="JS Heap"
            />
            <div className="text-[9px] text-text-disabled mt-0.5">
              Limit: {formatBytes(jsHeap.limit)}
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <StatRow label="Textures"          value={`${textureCount}`} />
          <StatRow label="Tracked Resources" value={`${resourceCount}`} />
        </div>
      </Section>
    </div>
  );
};

export default PerformancePanel;