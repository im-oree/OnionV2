/**
 * PerfHUD â€” Blender-style performance overlay.
 * Toggle with Shift+F.
 */
import React, { useEffect, useState, useRef } from 'react';
import {
  usePreviewResolutionStore,
  PREVIEW_SCALE_LABELS,
} from '../../../state/previewResolutionStore';
import { useRendererBackendStore } from '../../../state/rendererBackendStore';

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
  gpuMemoryMB?: number;
  gpuMemoryBudgetMB?: number;
}

function fpsColor(fps: number, target: number): string {
  if (target <= 0) return '#8bd450';
  const ratio = fps / target;
  if (ratio >= 0.95) return '#6ad588';
  if (ratio >= 0.66) return '#f0c060';
  return '#ff5c5c';
}

function pathBadge(path: string | undefined) {
  if (path === 'cache') return { label: 'CACHE', color: '#6ad588' };
  if (path === 'live') return { label: 'LIVE', color: '#f0c060' };
  return { label: 'IDLE', color: 'rgba(255,255,255,0.4)' };
}

export const PerfHUD: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [stats, setStats] = useState<PerfSnapshot | null>(null);
  const [framePath, setFramePath] = useState<string>('idle');
  const scale = usePreviewResolutionStore((s) => s.scale);
  const effectiveScale = usePreviewResolutionStore((s) => s.getEffectiveScale());
  const isPlaybackActive = usePreviewResolutionStore((s) => s.isPlaybackActive);
  const rafRef = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === 'f' &&
        e.shiftKey &&
        !e.ctrlKey && !e.metaKey && !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setVisible((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!visible) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    let last = 0;
    const tick = (now: number) => {
      if (now - last > 200) {
        last = now;
        const monitor = (window as any).__perfMonitor;
        const renderer = (window as any).__renderer;
        if (monitor?.getStats) {
          const s = monitor.getStats();
          const rState = renderer?.getState?.();
          setStats({
            ...s,
            gpuMemoryMB: rState?.gpuMemoryMB,
            gpuMemoryBudgetMB: rState?.gpuMemoryBudgetMB,
          });
        }
        setFramePath((window as any).__lastFramePath ?? 'idle');
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible]);

  const backend = useRendererBackendStore(s => s.actualBackend);

  if (!visible || !stats) return null;

  const fpsCol = fpsColor(stats.fps, stats.targetFps);
  const budgetMs = stats.targetFps > 0 ? 1000 / stats.targetFps : 33.3;
  const budgetPct = Math.round((stats.frameTimeMs / budgetMs) * 100);
  const cacheUsedMB = Math.round(stats.cacheMemoryBytes / (1024 * 1024));
  const cacheBudgetMB = Math.round(stats.cacheBudgetBytes / (1024 * 1024));
  const cachePct = cacheBudgetMB > 0 ? Math.round((cacheUsedMB / cacheBudgetMB) * 100) : 0;
  const badge = pathBadge(framePath);

  return (
    <div
      style={{
        position: 'absolute',
        top: 50,
        right: 10,
        zIndex: 100,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '8px 10px',
        background: 'rgba(15,15,20,0.88)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 6,
        fontFamily: 'ui-monospace, "JetBrains Mono", Consolas, monospace',
        fontSize: 11,
        color: 'rgba(255,255,255,0.85)',
        minWidth: 210,
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: fpsCol,
            letterSpacing: '-0.5px',
            lineHeight: 1,
          }}
        >
          {stats.fps}
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
          / {stats.targetFps} fps
        </span>
        <span style={{
          fontSize: 8, fontWeight: 700,
          padding: '1px 4px', borderRadius: 2,
          background: backend === 'webgpu' ? 'rgba(191,64,255,0.3)' : 'rgba(60,120,220,0.3)',
          color: backend === 'webgpu' ? '#c37cff' : '#5cc0ff',
          marginLeft: 4,
        }}>{backend === 'webgpu' ? 'GPU' : 'GL'}</span>
        <span style={{ flex: 1 }} />
        <span
          style={{
            padding: '2px 6px',
            borderRadius: 3,
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '0.6px',
            background: `${badge.color}22`,
            color: badge.color,
            border: `1px solid ${badge.color}55`,
          }}
        >
          {badge.label}
        </span>
      </div>

      <Divider />
      <Row label="Frame" value={`${stats.frameTimeMs.toFixed(1)}ms`} sub={`${budgetPct}% of ${budgetMs.toFixed(1)}ms`} />
      <Row label="Min/Max" value={`${stats.frameTimeMin.toFixed(1)} / ${stats.frameTimeMax.toFixed(1)} ms`} muted />
      {stats.droppedFrames > 0 && (
        <Row label="Dropped" value={String(stats.droppedFrames)} valueColor="#f0c060" />
      )}

      <Divider />

      <Row
        label="Preview"
        value={`${PREVIEW_SCALE_LABELS[scale as 1 | 0.5 | 0.333 | 0.25] ?? String(scale)}`}
        sub={
          effectiveScale !== scale
            ? `active: ${PREVIEW_SCALE_LABELS[effectiveScale as 1 | 0.5 | 0.333 | 0.25]}${isPlaybackActive ? ' (auto)' : ''}`
            : undefined
        }
      />
      <Row
        label="Cache"
        value={`${cacheUsedMB}/${cacheBudgetMB} MB`}
        sub={`${cachePct}%  hit ${Math.round(stats.cacheHitRate * 100)}%`}
      />
      {stats.gpuMemoryMB !== undefined && stats.gpuMemoryBudgetMB !== undefined && (
        <Row label="GPU tex" value={`${stats.gpuMemoryMB}/${stats.gpuMemoryBudgetMB} MB`} />
      )}

      <Divider />

      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textAlign: 'right' }}>
        Shift+F to hide
      </div>
    </div>
  );
};

const Divider: React.FC = () => (
  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
);

const Row: React.FC<{
  label: string;
  value: string;
  sub?: string;
  muted?: boolean;
  valueColor?: string;
}> = ({ label, value, sub, muted, valueColor }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 8,
      opacity: muted ? 0.55 : 1,
    }}
  >
    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{label}</span>
    <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
      {sub && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9 }}>{sub}</span>}
      <span style={{ color: valueColor ?? 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
        {value}
      </span>
    </span>
  </div>
);