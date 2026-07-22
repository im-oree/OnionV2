/**
 * ExportProgressDialog — live progress modal shown during export.
 * Renders a preview canvas of the current frame, stats grid, progress bar,
 * and pause/resume/cancel controls. On completion, shows a download button.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X, Pause, Play, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { useExportStore } from '../../state/exportStore';
import { getExportEngine, type ExportProgressPayload, type ExportDonePayload } from '../../renderer/export/ExportEngine';
import { formatBytes, formatDuration } from '../../renderer/export/ExportEstimator';
import type { ExportStatus } from '../../renderer/export/types';

export const ExportProgressDialog: React.FC = () => {
  const open = useExportStore((s) => s.progressDialogOpen);
  const close = useExportStore((s) => s.closeProgress);
  const settings = useExportStore((s) => s.settings);

  const [status, setStatus] = useState<ExportStatus>('idle');
  const [progress, setProgress] = useState<ExportProgressPayload>({
    currentFrame: 0, totalFrames: 0, elapsedMs: 0, etaMs: 0, avgFrameMs: 0, lastFrameMs: 0,
  });
  const [doneInfo, setDoneInfo] = useState<ExportDonePayload | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [frameHistory, setFrameHistory] = useState<number[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const appendLog = useCallback((msg: string) => {
    setLog((l) => [...l.slice(-99), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // Subscribe to engine events
  useEffect(() => {
    if (!open) return;

    setStatus('idle');
    setProgress({ currentFrame: 0, totalFrames: 0, elapsedMs: 0, etaMs: 0, avgFrameMs: 0, lastFrameMs: 0 });
    setDoneInfo(null);
    setErrorMsg(null);
    setLog([]);
    setFrameHistory([]);

    const engine = getExportEngine();
    if (!engine) {
      setErrorMsg('Export engine unavailable. Renderer not ready.');
      setStatus('error');
      return;
    }

    const offStatus = engine.on('status', (s: ExportStatus) => {
      setStatus(s);
      appendLog(`Status → ${s}`);
    });
    const offProgress = engine.on('progress', (p: ExportProgressPayload) => {
      setProgress(p);
      setFrameHistory((h) => [...h.slice(-59), p.lastFrameMs]);
    });
    const offPreview = engine.on('preview', ({ bitmap, frameNumber }: { bitmap: ImageBitmap; frameNumber: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = canvas.width;
      const h = canvas.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      // Fit bitmap into canvas preserving aspect
      const arSrc = bitmap.width / bitmap.height;
      const arDst = w / h;
      let dw = w, dh = h, dx = 0, dy = 0;
      if (arSrc > arDst) { dh = w / arSrc; dy = (h - dh) / 2; }
      else               { dw = h * arSrc; dx = (w - dw) / 2; }
      ctx.drawImage(bitmap, dx, dy, dw, dh);
    });
    const offDone = engine.on('done', (d: ExportDonePayload) => {
      setDoneInfo(d);
      setStatus('done');
      appendLog(`✔ Export complete: ${d.name} (${formatBytes(d.size)})`);
    });
    const offError = engine.on('error', ({ message }: { message: string }) => {
      setErrorMsg(message);
      setStatus('error');
      appendLog(`✖ Error: ${message}`);
    });
    const offCancel = engine.on('cancelled', () => {
      setStatus('cancelled');
      appendLog('Export cancelled');
    });

    return () => {
      offStatus(); offProgress(); offPreview(); offDone(); offError(); offCancel();
    };
  }, [open, appendLog]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  // Set preview canvas physical size to comp aspect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const targetH = 320;
    const ar = settings.width / settings.height;
    canvas.width = Math.round(targetH * ar);
    canvas.height = targetH;
  }, [settings.width, settings.height, open]);

  const handlePause = useCallback(() => getExportEngine()?.pause(), []);
  const handleResume = useCallback(() => getExportEngine()?.resume(), []);
  const handleCancel = useCallback(() => getExportEngine()?.cancel(), []);
  const handleClose = useCallback(() => {
    if (status === 'rendering' || status === 'encoding' || status === 'preparing' || status === 'paused') {
      getExportEngine()?.cancel();
    }
    close();
  }, [status, close]);

  const handleDownloadAgain = useCallback(async () => {
    if (!doneInfo?.blob) return;
    const { saveFile } = await import('../../renderer/export/FileSaver');
    const ext = settings.fileName.split('.').pop() ?? 'bin';
    await saveFile(doneInfo.blob, settings.fileName, ext, true);
  }, [doneInfo, settings.fileName]);

  if (!open) return null;

  const isRunning = status === 'preparing' || status === 'rendering' || status === 'encoding';
  const isPaused = status === 'paused';
  const isFinished = status === 'done' || status === 'cancelled' || status === 'error';
  const pct = progress.totalFrames > 0
    ? Math.min(100, (progress.currentFrame / progress.totalFrames) * 100)
    : 0;

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)',
        zIndex: 10001,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        width: 880, maxWidth: '94vw', maxHeight: '92vh',
        background: 'var(--color-panel)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-panel-hover)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusBadge status={status} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Exporting {settings.fileName}
            </span>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-tertiary)', padding: 4, display: 'flex',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{
          flex: 1, display: 'flex', gap: 14, padding: 14, overflow: 'hidden',
        }}>
          {/* Left: preview canvas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              background: '#000',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              padding: 4,
            }}>
              <canvas
                ref={canvasRef}
                style={{
                  display: 'block',
                  maxWidth: 340,
                  background: '#000',
                }}
              />
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-disabled)', textAlign: 'center' }}>
              Frame {progress.currentFrame} / {progress.totalFrames}
            </div>
          </div>

          {/* Right: stats + progress + log */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
            {/* Big % */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <div style={{
                fontSize: 42, fontWeight: 700, lineHeight: 1,
                color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums',
              }}>
                {pct.toFixed(1)}%
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                {isPaused && '⏸ Paused'}
                {status === 'preparing' && '⏳ Preparing'}
                {status === 'rendering' && '▶ Rendering'}
                {status === 'encoding' && '📦 Encoding'}
                {status === 'done' && '✔ Complete'}
                {status === 'cancelled' && '✖ Cancelled'}
                {status === 'error' && '⚠ Error'}
              </div>
            </div>

            {/* Progress bar */}
            <div style={{
              height: 10, background: 'var(--color-input-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 5, overflow: 'hidden', position: 'relative',
            }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${pct}%`,
                background: status === 'error'
                  ? 'linear-gradient(90deg, #cc4444, #ff6666)'
                  : status === 'done'
                    ? 'linear-gradient(90deg, #44cc66, #66dd88)'
                    : 'linear-gradient(90deg, var(--color-accent), #8b95ff)',
                transition: 'width 200ms ease-out',
              }} />
            </div>

            {/* Stats grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              fontSize: 10,
            }}>
              <StatBox label="Elapsed" value={formatDuration(progress.elapsedMs)} />
              <StatBox label="ETA" value={progress.etaMs > 0 ? formatDuration(progress.etaMs) : '—'} />
              <StatBox label="Avg / Frame" value={progress.avgFrameMs > 0 ? `${progress.avgFrameMs.toFixed(0)}ms` : '—'} />
              <StatBox label="Last Frame" value={progress.lastFrameMs > 0 ? `${progress.lastFrameMs.toFixed(0)}ms` : '—'} />
              <StatBox label="Effective FPS" value={progress.avgFrameMs > 0 ? (1000 / progress.avgFrameMs).toFixed(1) : '—'} />
              <StatBox label="Est. Size" value={doneInfo ? formatBytes(doneInfo.size) : '—'} />
            </div>

            {/* Sparkline */}
            {frameHistory.length > 1 && <Sparkline data={frameHistory} height={30} />}

            {/* Log */}
            <div
              ref={logRef}
              style={{
                flex: 1, minHeight: 80,
                background: 'var(--color-input-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 4, padding: 6,
                fontSize: 9, fontFamily: 'monospace',
                color: 'var(--color-text-secondary)',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {log.length === 0 ? (
                <div style={{ color: 'var(--color-text-disabled)' }}>Log will appear here…</div>
              ) : (
                log.map((line, i) => <div key={i}>{line}</div>)
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid var(--color-border)',
          padding: '10px 14px',
          background: 'var(--color-panel-hover)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {errorMsg && (
            <div style={{ flex: 1, fontSize: 11, color: '#ff8080' }}>
              {errorMsg}
            </div>
          )}
          {doneInfo && (
            <div style={{ flex: 1, fontSize: 11, color: 'var(--color-text-secondary)' }}>
              Saved: <strong>{doneInfo.name}</strong> · {formatBytes(doneInfo.size)}
              {doneInfo.frameCount ? ` · ${doneInfo.frameCount} frames` : ''}
            </div>
          )}
          {!errorMsg && !doneInfo && (
            <div style={{ flex: 1 }} />
          )}

          {isRunning && (
            <button onClick={handlePause} style={btnStyle('secondary')}>
              <Pause size={12} /> Pause
            </button>
          )}
          {isPaused && (
            <button onClick={handleResume} style={btnStyle('accent')}>
              <Play size={12} /> Resume
            </button>
          )}
          {(isRunning || isPaused) && (
            <button onClick={handleCancel} style={btnStyle('danger')}>
              Cancel
            </button>
          )}
          {doneInfo && doneInfo.blob && (
            <button onClick={handleDownloadAgain} style={btnStyle('accent')}>
              <Download size={12} /> Save Again
            </button>
          )}
          {isFinished && (
            <button onClick={close} style={btnStyle('secondary')}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

// ── Helper components ────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: ExportStatus }> = ({ status }) => {
  const map: Record<ExportStatus, { color: string; icon: React.ReactNode }> = {
    idle:       { color: '#888', icon: null },
    preparing:  { color: '#888', icon: null },
    rendering:  { color: 'var(--color-accent)', icon: null },
    encoding:   { color: 'var(--color-accent)', icon: null },
    paused:     { color: '#f0b040', icon: <Pause size={12} /> },
    done:       { color: '#44cc66', icon: <CheckCircle2 size={12} /> },
    cancelled:  { color: '#888', icon: null },
    error:      { color: '#cc4444', icon: <AlertCircle size={12} /> },
  };
  const cfg = map[status];
  return (
    <div style={{
      width: 18, height: 18, borderRadius: '50%',
      background: cfg.color, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      color: '#fff',
    }}>
      {cfg.icon}
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{
    background: 'var(--color-input-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 4, padding: '5px 8px',
  }}>
    <div style={{ color: 'var(--color-text-disabled)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    <div style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
  </div>
);

const Sparkline: React.FC<{ data: number[]; height: number }> = ({ data, height }) => {
  const w = 100;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - (v / max) * height}`).join(' ');
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="var(--color-accent)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

const btnStyle = (variant: 'accent' | 'danger' | 'secondary'): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 4,
  padding: '5px 12px', fontSize: 11, fontWeight: 600,
  border: 'none', borderRadius: 4, cursor: 'pointer',
  background: variant === 'accent' ? 'var(--color-accent)'
    : variant === 'danger' ? '#c44444'
    : 'transparent',
  color: variant === 'secondary' ? 'var(--color-text-secondary)' : '#fff',
  border: variant === 'secondary' ? '1px solid var(--color-border)' : 'none',
});

export default ExportProgressDialog;