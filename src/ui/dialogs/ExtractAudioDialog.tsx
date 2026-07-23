/**
 * ExtractAudioDialog — small React portal modal for the "Extract Audio" action.
 * Buttons: Yes (import as asset) / No (save to file) / Cancel.
 */
import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X, Music } from 'lucide-react';
import { extractAudioFromLayer, type ExtractFormat } from '../../utils/extractAudio';
import { useCompositionStore } from '../../state/compositionStore';
import type { Layer } from '../../types/layer';

interface Props {
  layer: Layer;
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  height: 26, padding: '0 8px',
  background: 'var(--color-input-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 4,
  color: 'var(--color-text-primary)',
  fontSize: 11, outline: 'none',
  minWidth: 0, flex: 1,
};

export const ExtractAudioDialog: React.FC<Props> = ({ layer, onClose }) => {
  const comp = useCompositionStore((s) =>
    s.activeCompositionId
      ? s.compositions.find((c) => c.id === s.activeCompositionId) ?? null
      : null,
  );

  const suggestName = (layer.name || 'audio').replace(/[^\w\s-]/g, '').trim();

  const [format, setFormat] = useState<ExtractFormat>('mp3');
  const [bitrate, setBitrate] = useState(192);
  const [sampleRate, setSampleRate] = useState(48000);
  const [channels, setChannels] = useState<1 | 2>(2);
  const [fileName, setFileName] = useState(suggestName);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const doExtract = useCallback(async (destination: 'project-asset' | 'file') => {
    if (!comp) return;
    setBusy(true);
    setStatusMsg(destination === 'project-asset'
      ? 'Extracting and importing to project…'
      : 'Extracting and saving to disk…');
    try {
      const res = await extractAudioFromLayer({
        layer, comp, format, bitrate, sampleRate, channels,
        destination, fileName,
      });
      if (res.ok) {
        onClose();
      } else if (res.cancelled) {
        setBusy(false);
        setStatusMsg('Cancelled');
      } else {
        setBusy(false);
        setStatusMsg(`Error: ${res.error ?? 'unknown'}`);
      }
    } catch (err: any) {
      setBusy(false);
      setStatusMsg(`Error: ${err?.message ?? err}`);
    }
  }, [comp, layer, format, bitrate, sampleRate, channels, fileName, onClose]);

  if (!comp) return null;

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
        zIndex: 10002,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseDown={(e) => { if (!busy && e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 460, maxWidth: '92vw',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Music size={14} strokeWidth={1.75} style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Extract Audio
            </span>
            <span style={{ fontSize: 10, color: 'var(--color-text-disabled)' }}>
              — {layer.name}
            </span>
          </div>
          <button
            onClick={() => !busy && onClose()}
            disabled={busy}
            style={{
              background: 'transparent', border: 'none', cursor: busy ? 'default' : 'pointer',
              color: 'var(--color-text-tertiary)', padding: 4, display: 'flex', opacity: busy ? 0.4 : 1,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Row label="File name">
            <input
              type="text" value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              disabled={busy}
              style={inputStyle}
            />
          </Row>

          <Row label="Format">
            <select
              value={format} onChange={(e) => setFormat(e.target.value as ExtractFormat)}
              disabled={busy}
              style={{ ...inputStyle, cursor: busy ? 'default' : 'pointer' }}
            >
              <option value="mp3">MP3 (fast, universal)</option>
              <option value="wav">WAV (lossless)</option>
              <option value="aac">AAC (.m4a)</option>
              <option value="opus">Opus (.webm)</option>
            </select>
          </Row>

          {format !== 'wav' && (
            <Row label="Bitrate">
              <select
                value={bitrate} onChange={(e) => setBitrate(+e.target.value)}
                disabled={busy}
                style={{ ...inputStyle, cursor: busy ? 'default' : 'pointer' }}
              >
                {[96, 128, 192, 256, 320].map((b) => (
                  <option key={b} value={b}>{b} kbps</option>
                ))}
              </select>
            </Row>
          )}

          <Row label="Sample rate">
            <select
              value={sampleRate} onChange={(e) => setSampleRate(+e.target.value)}
              disabled={busy}
              style={{ ...inputStyle, cursor: busy ? 'default' : 'pointer' }}
            >
              <option value={22050}>22.05 kHz</option>
              <option value={44100}>44.1 kHz</option>
              <option value={48000}>48 kHz</option>
              <option value={96000}>96 kHz</option>
            </select>
          </Row>

          <Row label="Channels">
            <select
              value={channels} onChange={(e) => setChannels(+e.target.value as 1 | 2)}
              disabled={busy}
              style={{ ...inputStyle, cursor: busy ? 'default' : 'pointer' }}
            >
              <option value={1}>Mono</option>
              <option value={2}>Stereo</option>
            </select>
          </Row>

          {statusMsg && (
            <div style={{
              padding: '6px 8px',
              background: 'var(--color-input-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              fontSize: 10, color: 'var(--color-text-secondary)',
              fontFamily: 'monospace',
            }}>
              {statusMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid var(--color-border)',
          padding: '10px 14px',
          background: 'var(--color-panel-hover)',
          display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose} disabled={busy}
            style={btn('secondary', busy)}
          >
            Cancel
          </button>
          <button
            onClick={() => doExtract('file')} disabled={busy}
            style={btn('secondary', busy)}
          >
            No — Save to File
          </button>
          <button
            onClick={() => doExtract('project-asset')} disabled={busy}
            style={btn('accent', busy)}
          >
            Yes — Add to Project
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <label style={{
      flex: '0 0 100px', fontSize: 11, color: 'var(--color-text-secondary)',
    }}>{label}</label>
    <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center' }}>{children}</div>
  </div>
);

const btn = (variant: 'accent' | 'secondary', busy: boolean): React.CSSProperties => ({
  padding: '6px 14px', fontSize: 11, fontWeight: 600,
  border: variant === 'secondary' ? '1px solid var(--color-border)' : 'none',
  borderRadius: 4,
  background: variant === 'accent' ? 'var(--color-accent)' : 'transparent',
  color: variant === 'accent' ? '#fff' : 'var(--color-text-secondary)',
  cursor: busy ? 'default' : 'pointer',
  opacity: busy ? 0.55 : 1,
});

export default ExtractAudioDialog;