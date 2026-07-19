import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Pipette } from 'lucide-react';
import { hsvToHex, hexToHsv, hsvToRgb, rgbToHex, type HSV } from './ColorPickerUtils';

interface Props {
  value: string;
  onChange: (hex: string) => void;
}

const SV_SIZE = 200;
const HUE_H = 14;
const RECENT_KEY = '__onion_recent_colors';

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 12); }
  catch { return []; }
}
function pushRecent(hex: string) {
  const list = getRecent().filter(c => c !== hex);
  list.unshift(hex);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 12))); } catch {}
}

export const ColorPicker: React.FC<Props> = ({ value, onChange }) => {
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(value));
  const [hex, setHex] = useState(value);
  const svRef = useRef<HTMLCanvasElement>(null);
  const hueRef = useRef<HTMLCanvasElement>(null);
  const [recent] = useState(getRecent);

  // Sync external value
  useEffect(() => {
    const newHsv = hexToHsv(value);
    setHsv(newHsv);
    setHex(value);
  }, [value]);

  // Draw SV gradient
  useEffect(() => {
    const c = svRef.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    const w = c.width, h = c.height;
    // Hue base color
    const hueHex = hsvToHex(hsv.h, 100, 100);
    // Horizontal: white → hue
    const gH = ctx.createLinearGradient(0, 0, w, 0);
    gH.addColorStop(0, '#ffffff');
    gH.addColorStop(1, hueHex);
    ctx.fillStyle = gH;
    ctx.fillRect(0, 0, w, h);
    // Vertical: transparent → black
    const gV = ctx.createLinearGradient(0, 0, 0, h);
    gV.addColorStop(0, 'rgba(0,0,0,0)');
    gV.addColorStop(1, '#000000');
    ctx.fillStyle = gV;
    ctx.fillRect(0, 0, w, h);
  }, [hsv.h]);

  // Draw hue bar
  useEffect(() => {
    const c = hueRef.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    const w = c.width;
    const g = ctx.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${i * 60},100%,50%)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, c.height);
  }, []);

  const emit = useCallback((h: number, s: number, v: number) => {
    const newHex = hsvToHex(h, s, v);
    setHsv({ h, s, v });
    setHex(newHex);
    onChange(newHex);
  }, [onChange]);

  const onSvDown = useCallback((e: React.MouseEvent) => {
    const c = svRef.current; if (!c) return;
    const pick = (ev: MouseEvent | React.MouseEvent) => {
      const r = c.getBoundingClientRect();
      const s = Math.max(0, Math.min(100, ((ev.clientX - r.left) / r.width) * 100));
      const v = Math.max(0, Math.min(100, (1 - (ev.clientY - r.top) / r.height) * 100));
      emit(hsv.h, s, v);
    };
    pick(e);
    const mm = (ev: MouseEvent) => pick(ev);
    const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); pushRecent(hsvToHex(hsv.h, hsv.s, hsv.v)); };
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  }, [hsv.h, emit]);

  const onHueDown = useCallback((e: React.MouseEvent) => {
    const c = hueRef.current; if (!c) return;
    const pick = (ev: MouseEvent | React.MouseEvent) => {
      const r = c.getBoundingClientRect();
      const h = Math.max(0, Math.min(360, ((ev.clientX - r.left) / r.width) * 360));
      emit(h, hsv.s, hsv.v);
    };
    pick(e);
    const mm = (ev: MouseEvent) => pick(ev);
    const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); };
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  }, [hsv.s, hsv.v, emit]);

  const onHexCommit = useCallback(() => {
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      onChange(hex);
      setHsv(hexToHsv(hex));
      pushRecent(hex);
    } else { setHex(value); }
  }, [hex, value, onChange]);

  const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v);
  const svX = (hsv.s / 100) * SV_SIZE;
  const svY = (1 - hsv.v / 100) * SV_SIZE;
  const hueX = (hsv.h / 360) * SV_SIZE;

  return (
    <div style={{ width: SV_SIZE + 24, padding: 12 }}>
      {/* SV canvas */}
      <div className="relative" style={{ width: SV_SIZE, height: SV_SIZE, borderRadius: 'var(--radius-sm)', overflow: 'hidden', cursor: 'crosshair' }}>
        <canvas ref={svRef} width={SV_SIZE} height={SV_SIZE} onMouseDown={onSvDown} style={{ display: 'block', width: '100%', height: '100%' }} />
        <div className="absolute pointer-events-none" style={{
          left: svX - 7, top: svY - 7,
          width: 14, height: 14, borderRadius: '50%',
          border: '2px solid #fff',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(0,0,0,0.2)',
        }} />
      </div>

      {/* Hue bar */}
      <div className="relative mt-3" style={{ width: SV_SIZE, height: HUE_H, borderRadius: 999, overflow: 'hidden', cursor: 'ew-resize' }}>
        <canvas ref={hueRef} width={SV_SIZE} height={HUE_H} onMouseDown={onHueDown} style={{ display: 'block', width: '100%', height: '100%' }} />
        <div className="absolute top-0 pointer-events-none" style={{
          left: hueX - 3, width: 6, height: HUE_H,
          background: '#fff', borderRadius: 3,
          boxShadow: '0 0 2px rgba(0,0,0,0.5)',
        }} />
      </div>

      {/* Hex + RGB */}
      <div className="flex items-center gap-2 mt-3">
        <div className="flex-shrink-0" style={{
          width: 28, height: 28, borderRadius: 'var(--radius-sm)',
          background: hex, border: '1px solid var(--color-border)',
        }} />
        <input
          type="text" value={hex}
          onChange={(e) => setHex(e.target.value)}
          onBlur={onHexCommit}
          onKeyDown={(e) => { if (e.key === 'Enter') onHexCommit(); }}
          className="flex-1 outline-none"
          style={{
            height: 26, padding: '0 8px',
            background: 'var(--color-input-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-family-mono)',
          }}
        />
      </div>

      {/* RGB readout */}
      <div className="flex gap-2 mt-2" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
        <span>R {r}</span><span>G {g}</span><span>B {b}</span>
      </div>

      {/* Recent colors */}
      {recent.length > 0 && (
        <div className="mt-3">
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-disabled)', marginBottom: 6 }}>Recent</div>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((c, i) => (
              <button key={i} onClick={() => { onChange(c); setHsv(hexToHsv(c)); setHex(c); }}
                className="border-0 cursor-pointer transition-transform hover:scale-110"
                style={{
                  width: 18, height: 18, borderRadius: 4,
                  background: c, boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};