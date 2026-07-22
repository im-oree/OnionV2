/**
 * ExportSettingsDialog — the full export settings modal (React portal).
 * Opens from the Render menu. On "Start Export" it will close and open the
 * ExportProgressDialog (Stage H). For now Start Export just shows a toast.
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import {
  useExportStore,
  initializeExportSettingsFromComp,
} from '../../state/exportStore';
import { useCompositionStore } from '../../state/compositionStore';
import { useNotificationStore } from '../../state/notificationStore';
import {
  FORMAT_LABELS,
  RESOLUTION_PRESETS,
  FPS_PRESETS,
  BITRATE_PRESETS,
  AUDIO_BITRATE_PRESETS,
  AUDIO_SAMPLE_RATES,
  ENCODER_LABELS,
  formatCategory,
  formatSupportsAudio,
  formatSupportsAlpha,
  type ExportFormat,
  type AudioCodec,
  type EncoderPreference,
  type ExportPriority,
} from '../../renderer/export/types';
import {
  estimateFileSize,
  estimateRenderTime,
  formatBytes,
  formatDuration,
} from '../../renderer/export/ExportEstimator';

// ── Small subcomponents ──────────────────────────────────────────────

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: 'var(--color-text-tertiary)',
      marginBottom: 8,
      paddingBottom: 4,
      borderBottom: '1px solid var(--color-border)',
    }}>
      {title}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
  </div>
);

const Row: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <label style={{
        flex: '0 0 130px',
        fontSize: 11,
        color: 'var(--color-text-secondary)',
      }}>{label}</label>
      <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center' }}>{children}</div>
    </div>
    {hint && (
      <div style={{
        marginLeft: 138, marginTop: 2,
        fontSize: 10, color: 'var(--color-text-disabled)',
      }}>{hint}</div>
    )}
  </div>
);

const inputStyle: React.CSSProperties = {
  height: 26,
  padding: '0 8px',
  background: 'var(--color-input-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 4,
  color: 'var(--color-text-primary)',
  fontSize: 11,
  outline: 'none',
  minWidth: 0,
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  flex: 1,
};

// ── Main dialog ──────────────────────────────────────────────────────

export const ExportSettingsDialog: React.FC = () => {
  const open = useExportStore((s) => s.settingsDialogOpen);
  const close = useExportStore((s) => s.closeSettings);
  const settings = useExportStore((s) => s.settings);
  const updateSettings = useExportStore((s) => s.updateSettings);

  const comp = useCompositionStore((s) =>
    s.activeCompositionId
      ? s.compositions.find((c) => c.id === s.activeCompositionId) ?? null
      : null,
  );

  // Initialize settings from comp when dialog opens
  useEffect(() => {
    if (open && comp) {
      initializeExportSettingsFromComp({
        width: comp.width,
        height: comp.height,
        fps: comp.fps,
        duration: comp.duration,
        name: comp.name,
      });
    }
  }, [open, comp]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const category = formatCategory(settings.format);
  const supportsAudio = formatSupportsAudio(settings.format);
  const supportsAlpha = formatSupportsAlpha(settings.format);

  const estSize = useMemo(() => estimateFileSize(settings), [settings]);
  const estTime = useMemo(() => estimateRenderTime(settings), [settings]);

  const onResolutionChange = useCallback((id: string) => {
    const p = RESOLUTION_PRESETS.find((x) => x.id === id);
    if (!p) return;
    const patch: any = { resolutionPresetId: id };
    if (p.width && p.height) {
      patch.width = p.width;
      patch.height = p.height;
    } else if (p.scale != null && comp) {
      patch.width = Math.round(comp.width * p.scale);
      patch.height = Math.round(comp.height * p.scale);
    }
    updateSettings(patch);
  }, [updateSettings, comp]);

  const onFpsChange = useCallback((id: string) => {
    const p = FPS_PRESETS.find((x) => x.id === id);
    if (!p) return;
    const patch: any = { fpsPresetId: id };
    if (p.value === 'comp' && comp) patch.fps = comp.fps;
    else if (typeof p.value === 'number') patch.fps = p.value;
    updateSettings(patch);
  }, [updateSettings, comp]);

  const onBitrateChange = useCallback((id: string) => {
    const p = BITRATE_PRESETS.find((x) => x.id === id);
    if (!p) return;
    const patch: any = { bitratePresetId: id };
    if (typeof p.bps === 'number') patch.bitrate = p.bps;
    updateSettings(patch);
  }, [updateSettings]);

  const handleStart = useCallback(() => {
    if (!comp) {
      useNotificationStore.getState().addNotification({
        type: 'warning',
        message: 'No composition to export.',
        autoDismiss: 3000,
      });
      return;
    }
    import('../../renderer/export/ExportEngine').then(({ getExportEngine }) => {
      const engine = getExportEngine();
      if (!engine) {
        useNotificationStore.getState().addNotification({
          type: 'error',
          message: 'Renderer not ready. Try again in a moment.',
          autoDismiss: 4000,
        });
        return;
      }
      close();
      useExportStore.getState().openProgress();
      // Fire and forget — engine emits events consumed by the progress dialog
      engine.start(comp, settings).catch((err) => {
        console.error('[Export] Failed:', err);
      });
    });
  }, [close, comp, settings]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(2px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        style={{
          width: 720,
          maxWidth: '92vw',
          maxHeight: '92vh',
          background: 'var(--color-panel)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-panel-hover)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Export Composition
            </span>
            {comp && (
              <span style={{ fontSize: 10, color: 'var(--color-text-disabled)' }}>
                — {comp.name}
              </span>
            )}
          </div>
          <button
            onClick={close}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-tertiary)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '14px 18px',
        }}>
          {/* ── Output ── */}
          <Section title="Output">
            <Row label="File name">
              <input
                type="text"
                value={settings.fileName}
                onChange={(e) => updateSettings({ fileName: e.target.value })}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="my-export"
              />
            </Row>
            <Row label="Format">
              <select
                value={settings.format}
                onChange={(e) => updateSettings({ format: e.target.value as ExportFormat })}
                style={selectStyle}
              >
                <optgroup label="Video">
                  <option value="mp4-h264">{FORMAT_LABELS['mp4-h264']}</option>
                  <option value="mp4-h265">{FORMAT_LABELS['mp4-h265']}</option>
                  <option value="webm-vp9">{FORMAT_LABELS['webm-vp9']}</option>
                  <option value="webm-vp8">{FORMAT_LABELS['webm-vp8']}</option>
                  <option value="gif">{FORMAT_LABELS['gif']}</option>
                </optgroup>
                <optgroup label="Image Sequence">
                  <option value="png-sequence">{FORMAT_LABELS['png-sequence']}</option>
                  <option value="jpg-sequence">{FORMAT_LABELS['jpg-sequence']}</option>
                </optgroup>
                <optgroup label="Single Frame">
                  <option value="frame-png">{FORMAT_LABELS['frame-png']}</option>
                  <option value="frame-jpg">{FORMAT_LABELS['frame-jpg']}</option>
                  <option value="frame-webp">{FORMAT_LABELS['frame-webp']}</option>
                </optgroup>
                <optgroup label="Audio Only">
                  <option value="audio-wav">{FORMAT_LABELS['audio-wav']}</option>
                  <option value="audio-mp3">{FORMAT_LABELS['audio-mp3']}</option>
                  <option value="audio-aac">{FORMAT_LABELS['audio-aac']}</option>
                  <option value="audio-opus">{FORMAT_LABELS['audio-opus']}</option>
                </optgroup>
              </select>
            </Row>
            <Row label="Save as">
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={settings.useSaveDialog}
                  onChange={(e) => updateSettings({ useSaveDialog: e.target.checked })}
                />
                Show save dialog to choose location
              </label>
            </Row>
          </Section>

          {/* ── Video / Sequence / Frame section ── */}
          {(category === 'video' || category === 'sequence' || category === 'frame') && (
            <Section title="Video">
              <Row label="Resolution">
                <select
                  value={settings.resolutionPresetId}
                  onChange={(e) => onResolutionChange(e.target.value)}
                  style={selectStyle}
                >
                  {RESOLUTION_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </Row>
              <Row label="Width × Height">
                <input
                  type="number"
                  value={settings.width}
                  min={1}
                  onChange={(e) => updateSettings({
                    width: Math.max(1, +e.target.value),
                    resolutionPresetId: 'custom',
                  })}
                  style={{ ...inputStyle, width: 90 }}
                />
                <span style={{ color: 'var(--color-text-disabled)' }}>×</span>
                <input
                  type="number"
                  value={settings.height}
                  min={1}
                  onChange={(e) => updateSettings({
                    height: Math.max(1, +e.target.value),
                    resolutionPresetId: 'custom',
                  })}
                  style={{ ...inputStyle, width: 90 }}
                />
              </Row>

              {(category === 'video' || category === 'sequence') && (
                <Row label="Frame rate">
                  <select
                    value={settings.fpsPresetId}
                    onChange={(e) => onFpsChange(e.target.value)}
                    style={selectStyle}
                  >
                    {FPS_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                  {settings.fpsPresetId === 'custom' && (
                    <input
                      type="number"
                      value={settings.fps}
                      min={1}
                      step={0.001}
                      onChange={(e) => updateSettings({ fps: +e.target.value })}
                      style={{ ...inputStyle, width: 90 }}
                    />
                  )}
                </Row>
              )}

              {category === 'video' && (
                <>
                  <Row label="Bitrate">
                    <select
                      value={settings.bitratePresetId}
                      onChange={(e) => onBitrateChange(e.target.value)}
                      style={selectStyle}
                    >
                      {BITRATE_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                    {settings.bitratePresetId === 'custom' && (
                      <input
                        type="number"
                        value={Math.round(settings.bitrate / 1000)}
                        min={100}
                        step={100}
                        onChange={(e) => updateSettings({ bitrate: +e.target.value * 1000 })}
                        style={{ ...inputStyle, width: 90 }}
                      />
                    )}
                    {settings.bitratePresetId === 'custom' && (
                      <span style={{ fontSize: 10, color: 'var(--color-text-disabled)' }}>kbps</span>
                    )}
                  </Row>
                  <Row label="Encoder">
                    <select
                      value={settings.encoder}
                      onChange={(e) => updateSettings({ encoder: e.target.value as EncoderPreference })}
                      style={selectStyle}
                    >
                      {(Object.keys(ENCODER_LABELS) as EncoderPreference[]).map((k) => (
                        <option key={k} value={k}>{ENCODER_LABELS[k]}</option>
                      ))}
                    </select>
                  </Row>
                </>
              )}

              {(category === 'frame' || category === 'sequence' || settings.format === 'gif') && (
                <Row label="Quality" hint={`${settings.quality}%`}>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={settings.quality}
                    onChange={(e) => updateSettings({ quality: +e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="number"
                    value={settings.quality}
                    min={1}
                    max={100}
                    onChange={(e) => updateSettings({ quality: Math.max(1, Math.min(100, +e.target.value)) })}
                    style={{ ...inputStyle, width: 60 }}
                  />
                </Row>
              )}

              {supportsAlpha && (
                <Row label="Alpha channel">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={settings.includeAlpha}
                      onChange={(e) => updateSettings({ includeAlpha: e.target.checked })}
                    />
                    Include transparency
                  </label>
                </Row>
              )}

              {settings.format === 'gif' && (
                <Row label="Loop count" hint="0 = infinite">
                  <input
                    type="number"
                    value={settings.gifLoopCount}
                    min={0}
                    onChange={(e) => updateSettings({ gifLoopCount: Math.max(0, +e.target.value) })}
                    style={{ ...inputStyle, width: 90 }}
                  />
                </Row>
              )}
            </Section>
          )}

          {/* ── Audio section ── */}
          {(supportsAudio || category === 'audio') && (
            <Section title="Audio">
              {supportsAudio && (
                <Row label="Include audio">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={settings.includeAudio}
                      onChange={(e) => updateSettings({ includeAudio: e.target.checked })}
                    />
                    Mix and include audio track
                  </label>
                </Row>
              )}

              {(settings.includeAudio || category === 'audio') && (
                <>
                  <Row label="Codec">
                    <select
                      value={settings.audioCodec}
                      onChange={(e) => updateSettings({ audioCodec: e.target.value as AudioCodec })}
                      style={selectStyle}
                    >
                      <option value="aac">AAC</option>
                      <option value="mp3">MP3</option>
                      <option value="opus">Opus</option>
                      <option value="wav">WAV (Lossless)</option>
                    </select>
                  </Row>

                  {settings.audioCodec !== 'wav' && (
                    <Row label="Bitrate">
                      <select
                        value={settings.audioBitrate}
                        onChange={(e) => updateSettings({ audioBitrate: +e.target.value })}
                        style={selectStyle}
                      >
                        {AUDIO_BITRATE_PRESETS[settings.audioCodec].map((b) => (
                          <option key={b} value={b}>{b} kbps</option>
                        ))}
                      </select>
                    </Row>
                  )}

                  <Row label="Sample rate">
                    <select
                      value={settings.audioSampleRate}
                      onChange={(e) => updateSettings({ audioSampleRate: +e.target.value })}
                      style={selectStyle}
                    >
                      {AUDIO_SAMPLE_RATES.map((sr) => (
                        <option key={sr} value={sr}>{sr / 1000} kHz</option>
                      ))}
                    </select>
                  </Row>

                  <Row label="Channels">
                    <select
                      value={settings.audioChannels}
                      onChange={(e) => updateSettings({ audioChannels: +e.target.value as 1 | 2 })}
                      style={selectStyle}
                    >
                      <option value={1}>Mono</option>
                      <option value={2}>Stereo</option>
                    </select>
                  </Row>
                </>
              )}
            </Section>
          )}

          {/* ── Range ── */}
          {category !== 'frame' && (
            <Section title="Range">
              <Row label="Mode">
                <select
                  value={settings.range.mode}
                  onChange={(e) => {
                    const mode = e.target.value as 'full' | 'workArea' | 'custom';
                    const totalFrames = comp ? Math.floor(comp.duration * comp.fps) : 300;
                    const startFrame = mode === 'workArea' && comp
                      ? Math.floor((comp.workAreaStart ?? 0) * comp.fps)
                      : settings.range.startFrame;
                    const endFrame = mode === 'full'
                      ? Math.max(0, totalFrames - 1)
                      : mode === 'workArea' && comp
                        ? Math.floor((comp.workAreaEnd ?? comp.duration) * comp.fps) - 1
                        : settings.range.endFrame;
                    updateSettings({ range: { mode, startFrame, endFrame } });
                  }}
                  style={selectStyle}
                >
                  <option value="full">Full Duration</option>
                  <option value="workArea">Work Area</option>
                  <option value="custom">Custom Range</option>
                </select>
              </Row>
              <Row label="Frames" hint={
                `${settings.range.endFrame - settings.range.startFrame + 1} frames · ` +
                `${formatDuration(((settings.range.endFrame - settings.range.startFrame + 1) / settings.fps) * 1000)}`
              }>
                <input
                  type="number"
                  value={settings.range.startFrame}
                  min={0}
                  disabled={settings.range.mode !== 'custom'}
                  onChange={(e) => updateSettings({
                    range: { ...settings.range, startFrame: Math.max(0, +e.target.value) },
                  })}
                  style={{ ...inputStyle, width: 90, opacity: settings.range.mode === 'custom' ? 1 : 0.5 }}
                />
                <span style={{ color: 'var(--color-text-disabled)' }}>→</span>
                <input
                  type="number"
                  value={settings.range.endFrame}
                  min={settings.range.startFrame}
                  disabled={settings.range.mode !== 'custom'}
                  onChange={(e) => updateSettings({
                    range: { ...settings.range, endFrame: Math.max(settings.range.startFrame, +e.target.value) },
                  })}
                  style={{ ...inputStyle, width: 90, opacity: settings.range.mode === 'custom' ? 1 : 0.5 }}
                />
              </Row>
            </Section>
          )}

          {/* ── Advanced ── */}
          <Section title="Advanced">
            <Row label="Priority">
              <select
                value={settings.priority}
                onChange={(e) => updateSettings({ priority: e.target.value as ExportPriority })}
                style={selectStyle}
              >
                <option value="fast">Fast (Lower Quality)</option>
                <option value="balanced">Balanced</option>
                <option value="best">Best (Slower)</option>
              </select>
            </Row>
            {category === 'video' && (
              <Row label="Motion blur">
                <input
                  type="number"
                  value={settings.motionBlurSamples}
                  min={1}
                  max={32}
                  onChange={(e) => updateSettings({ motionBlurSamples: Math.max(1, Math.min(32, +e.target.value)) })}
                  style={{ ...inputStyle, width: 90 }}
                />
                <span style={{ fontSize: 10, color: 'var(--color-text-disabled)' }}>samples per frame</span>
              </Row>
            )}
            <Row label="Author">
              <input
                type="text"
                value={settings.metadata.author ?? ''}
                onChange={(e) => updateSettings({
                  metadata: { ...settings.metadata, author: e.target.value },
                })}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Optional"
              />
            </Row>
            <Row label="Comment">
              <input
                type="text"
                value={settings.metadata.comment ?? ''}
                onChange={(e) => updateSettings({
                  metadata: { ...settings.metadata, comment: e.target.value },
                })}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Optional"
              />
            </Row>
          </Section>
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid var(--color-border)',
          padding: '10px 14px',
          background: 'var(--color-panel-hover)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
          <div style={{ flex: 1, display: 'flex', gap: 18, fontSize: 10, color: 'var(--color-text-secondary)' }}>
            <div>
              <div style={{ color: 'var(--color-text-disabled)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Est. File Size
              </div>
              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {formatBytes(estSize)}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--color-text-disabled)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Est. Render Time
              </div>
              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {formatDuration(estTime)}
              </div>
            </div>
          </div>

          <button
            onClick={close}
            style={{
              padding: '6px 14px', fontSize: 11,
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={!comp}
            style={{
              padding: '6px 18px', fontSize: 11, fontWeight: 600,
              background: 'var(--color-accent)',
              border: 'none',
              borderRadius: 4,
              color: '#ffffff',
              cursor: comp ? 'pointer' : 'not-allowed',
              opacity: comp ? 1 : 0.5,
            }}
          >
            Start Export
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ExportSettingsDialog;