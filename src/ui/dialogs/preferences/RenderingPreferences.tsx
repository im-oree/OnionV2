/**
 * RenderingPreferences — Rendering tab content for the Preferences dialog.
 * Currently holds only the backend selector; will grow with quality
 * knobs (MSAA, shadow resolution, etc.) later.
 */
import React, { useEffect } from 'react';
import { useRendererBackendStore } from '../../../state/rendererBackendStore';
import { BACKEND_LABELS, type BackendId } from '../../../renderer/backend/RenderBackend';

export const RenderingPreferences: React.FC = () => {
  const preferred = useRendererBackendStore(s => s.preferredBackend);
  const actual = useRendererBackendStore(s => s.actualBackend);
  const available = useRendererBackendStore(s => s.webgpuAvailable);
  const checked = useRendererBackendStore(s => s.webgpuChecked);
  const swapping = useRendererBackendStore(s => s.swapping);
  const fallbackReason = useRendererBackendStore(s => s.fallbackReason);
  const setPreferred = useRendererBackendStore(s => s.setPreferredBackend);
  const check = useRendererBackendStore(s => s.checkWebGPUAvailability);

  useEffect(() => { if (!checked) check(); }, [checked, check]);

  const handleSelect = async (backend: BackendId) => {
    if (backend === preferred) return;
    setPreferred(backend);
    // Attempt hot-swap immediately
    const renderer: any = (window as any).__renderer;
    if (renderer?.swapBackend) {
      await renderer.swapBackend(backend);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-primary)' }}>
        Render Backend
      </h3>
      <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
        Choose which graphics API drives the viewport. WebGL is stable and supports
        everything. WebGPU is experimental — layers, cameras, lights, and video render fine,
        but some effects will show a badge and either fall back to WebGL rendering or be skipped.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 480 }}>
        {/* WebGL — always active */}
        <label
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px',
            background: 'var(--color-accent-muted)',
            border: '1px solid var(--color-accent)',
            borderRadius: 6, cursor: 'default',
          }}
        >
          <input type="radio" name="backend" checked readOnly />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {BACKEND_LABELS.webgl}
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Default. Full compatibility.
            </div>
          </div>
        </label>

        {/* WebGPU — disabled placeholder */}
        <label
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px',
            background: 'var(--color-input-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 6, cursor: 'not-allowed',
            opacity: 0.5,
          }}
          title="WebGPU support is coming in a future update"
        >
          <input type="radio" name="backend" disabled />
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)',
            }}>
              WebGPU
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
                padding: '2px 6px',
                background: 'rgba(255,193,7,0.2)', color: '#ffc107',
                borderRadius: 3, fontFamily: 'var(--font-family-mono)',
              }}>
                COMING SOON
              </span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Full backend port in progress. All effects need to be migrated to
              Three Shading Language (TSL) before WebGPU can render correctly.
            </div>
          </div>
        </label>
      </div>

      {swapping && (
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--color-accent)' }}>
          Switching backend…
        </div>
      )}

      {actual !== preferred && !swapping && (
        <div style={{
          marginTop: 12, padding: '8px 10px',
          background: 'rgba(255,193,7,0.1)',
          border: '1px solid rgba(255,193,7,0.4)',
          borderRadius: 4, fontSize: 11, color: 'var(--color-text-secondary)',
        }}>
          Active backend ({actual}) differs from your preference ({preferred}).
          The requested backend failed to initialize and the app fell back.
        </div>
      )}
    </div>
  );
};

export default RenderingPreferences;