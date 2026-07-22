/**
 * TitleBar — Custom frameless window title bar for Electron.
 * Reads theme CSS variables to match the current color scheme.
 * Includes draggable region + window control buttons.
 */
import React, { useEffect, useState, useCallback } from 'react';

declare global {
  interface Window {
    electronAPI?: {
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      isMaximized: () => Promise<boolean>;
      onMaximizedChange: (cb: (maximized: boolean) => void) => void;
      offMaximizedChange: () => void;
      platform: string;
      isElectron: boolean;
    };
  }
}

const isElectron = !!(window as any).electronAPI?.isElectron;

// React's CSSProperties doesn't include WebkitAppRegion (Electron-specific)
const DRAG: React.CSSProperties = { WebkitAppRegion: 'drag' } as React.CSSProperties;
const NO_DRAG: React.CSSProperties = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

export const TitleBar: React.FC = () => {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!isElectron) return;
    const api = window.electronAPI!;
    api.isMaximized().then(setMaximized);
    api.onMaximizedChange(setMaximized);
    return () => { api.offMaximizedChange(); };
  }, []);

  const onMinimize = useCallback(() => window.electronAPI?.minimizeWindow(), []);
  const onMaximize = useCallback(() => window.electronAPI?.maximizeWindow(), []);
  const onClose = useCallback(() => window.electronAPI?.closeWindow(), []);
  const onDoubleClick = useCallback(() => window.electronAPI?.maximizeWindow(), []);

  if (!isElectron) return null;

  const platform = window.electronAPI?.platform ?? 'win32';

  return (
    <div
      className="electron-titlebar"
      onDoubleClick={onDoubleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 36,
        background: 'var(--color-app-bg)',
        borderBottom: '1px solid var(--color-border)',
        ...DRAG,
        userSelect: 'none',
        flexShrink: 0,
        position: 'relative',
        zIndex: 100,
      }}
    >
      {/* App icon + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 12, ...NO_DRAG }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" fill="var(--color-accent)" opacity="0.9" />
          <circle cx="12" cy="12" r="6" fill="var(--color-accent)" opacity="0.5" />
          <circle cx="12" cy="12" r="2.5" fill="var(--color-accent)" />
        </svg>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.02em' }}>
          OnionV2
        </span>
      </div>

      {platform === 'darwin' ? (
        <MacOSControls onMinimize={onMinimize} onMaximize={onMaximize} onClose={onClose} />
      ) : (
        <WindowsControls onMinimize={onMinimize} onMaximize={onMaximize} onClose={onClose} maximized={maximized} />
      )}
    </div>
  );
};

// ── macOS traffic light style ──

const MacOSControls: React.FC<{
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}> = ({ onMinimize, onMaximize, onClose }) => {
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 12, paddingLeft: 12, ...NO_DRAG }}>
      <TrafficLight color="#ff5f57" onClick={(e) => { stop(e); onClose(); }} />
      <TrafficLight color="#febc2e" onClick={(e) => { stop(e); onMinimize(); }} />
      <TrafficLight color="#28c840" onClick={(e) => { stop(e); onMaximize(); }} />
    </div>
  );
};

const TrafficLight: React.FC<{ color: string; onClick: (e: React.MouseEvent) => void }> = ({ color, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onDoubleClick={(e) => e.stopPropagation()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 12, height: 12, borderRadius: '50%', border: 'none',
        background: color, cursor: 'pointer', padding: 0, opacity: hovered ? 0.8 : 1,
        transition: 'opacity 0.15s', ...NO_DRAG,
      }}
    />
  );
};

// ── Windows style ──

const WindowsControls: React.FC<{
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  maximized: boolean;
}> = ({ onMinimize, onMaximize, onClose, maximized }) => (
  <div style={{ display: 'flex', alignItems: 'stretch', height: '100%', ...NO_DRAG }}>
    <WinBtn onClick={onMinimize} hoverBg="var(--color-panel-hover)">
      <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="var(--color-text-secondary)" /></svg>
    </WinBtn>
    <WinBtn onClick={onMaximize} hoverBg="var(--color-panel-hover)">
      {maximized ? (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <rect x="2" y="0" width="8" height="8" rx="1" stroke="var(--color-text-secondary)" strokeWidth="1" />
          <rect x="0" y="2" width="8" height="8" rx="1" fill="var(--color-app-bg)" stroke="var(--color-text-secondary)" strokeWidth="1" />
        </svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <rect x="0.5" y="0.5" width="9" height="9" rx="1" stroke="var(--color-text-secondary)" strokeWidth="1" />
        </svg>
      )}
    </WinBtn>
    <WinBtn onClick={onClose} hoverBg="#e81123" hoverFg="#ffffff">
      <svg width="10" height="10" viewBox="0 0 10 10">
        <line x1="0" y1="0" x2="10" y2="10" stroke="var(--color-text-secondary)" strokeWidth="1.2" />
        <line x1="10" y1="0" x2="0" y2="10" stroke="var(--color-text-secondary)" strokeWidth="1.2" />
      </svg>
    </WinBtn>
  </div>
);

const WinBtn: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  hoverBg?: string;
  hoverFg?: string;
}> = ({ onClick, children, hoverBg = 'var(--color-panel-hover)', hoverFg }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onDoubleClick={(e) => e.stopPropagation()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 46, height: '100%', border: 'none',
        background: hovered ? hoverBg : 'transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.1s', padding: 0, ...NO_DRAG,
      }}
    >
      <span style={{ color: hoverFg ?? 'var(--color-text-secondary)' }}>{children}</span>
    </button>
  );
};

export default TitleBar;
