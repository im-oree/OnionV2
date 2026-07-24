/**
 * PreferencesDialog — complete app preferences with all sections.
 * Interface, Themes (with theme editor), Viewport, Playback, Storage,
 * Export, Performance, System, About.
 */
import React, { useState } from 'react';
import { getHardwareProfile, redetectHardware, type HardwareConfig } from '../../config/HardwareProfile';
import { StorageManager } from '../../storage/StorageManager';
import { useRecentProjectsStore } from '../../state/recentProjectsStore';
import { useViewportStore } from '../../state/viewportStore';
import { autoSave } from '../../storage/AutoSave';
import { themeManager } from '../../styles/ThemeManager';
import { alertConfirm, alertPrompt } from '../../state/alertModalStore';
import { useRendererBackendStore } from '../../state/rendererBackendStore';
import type { BackendId } from '../../renderer/backend/RenderBackend';

// ─── Color Utility Helpers ───
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lightenColor(hex: string, percent: number): string {
  const h = hex.replace('#', '');
  let r = parseInt(h.substring(0, 2), 16);
  let g = parseInt(h.substring(2, 4), 16);
  let b = parseInt(h.substring(4, 6), 16);
  r = Math.min(255, r + Math.round((255 - r) * percent / 100));
  g = Math.min(255, g + Math.round((255 - g) * percent / 100));
  b = Math.min(255, b + Math.round((255 - b) * percent / 100));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function darkenColor(hex: string, percent: number): string {
  const h = hex.replace('#', '');
  let r = parseInt(h.substring(0, 2), 16);
  let g = parseInt(h.substring(2, 4), 16);
  let b = parseInt(h.substring(4, 6), 16);
  r = Math.max(0, Math.round(r * (1 - percent / 100)));
  g = Math.max(0, Math.round(g * (1 - percent / 100)));
  b = Math.max(0, Math.round(b * (1 - percent / 100)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Apply custom theme colors live as the user picks them */
function applyCustomTheme(colors: Record<string, string>): void {
  const root = document.documentElement;
  root.style.setProperty('--color-accent', colors.accent);
  root.style.setProperty('--color-accent-hover', lightenColor(colors.accent, 15));
  root.style.setProperty('--color-accent-muted', hexToRgba(colors.accent, 0.16));
  root.style.setProperty('--color-app-bg', colors.bgApp);
  root.style.setProperty('--color-panel', colors.panel);
  root.style.setProperty('--color-panel-raised', colors.panelRaised);
  root.style.setProperty('--color-panel-hover', lightenColor(colors.panel, 8));
  root.style.setProperty('--color-panel-active', lightenColor(colors.panel, 14));
  root.style.setProperty('--color-text-primary', colors.textPrimary);
  root.style.setProperty('--color-text-secondary', colors.textSecondary);
  root.style.setProperty('--color-border', hexToRgba(colors.border, 0.4));
  root.style.setProperty('--color-danger', colors.danger);
  root.style.setProperty('--color-success', colors.success);
  root.style.setProperty('--color-input-bg', darkenColor(colors.panel, 10));
  // Derived vars
  root.style.setProperty('--color-border-strong', hexToRgba(colors.border, 0.6));
  root.style.setProperty('--scrollbar-thumb', hexToRgba(colors.textPrimary, 0.15));
}

interface Props {
  onClose: () => void;
  initialSection?: string;
}

type Tab = 'interface' | 'themes' | 'viewport' | 'playback' | 'storage' | 'export' | 'performance' | 'system' | 'rendering' | 'about';

const TABS: { id: Tab; label: string }[] = [
  { id: 'interface', label: 'Interface' },
  { id: 'themes', label: 'Themes' },
  { id: 'viewport', label: 'Viewport' },
  { id: 'playback', label: 'Playback' },
  { id: 'storage', label: 'Storage' },
  { id: 'export', label: 'Export' },
  { id: 'performance', label: 'Performance' },
  { id: 'system', label: 'System' },
  { id: 'rendering', label: 'Rendering' },
  { id: 'about', label: 'About' },
];

export const PreferencesDialog: React.FC<Props> = ({ onClose, initialSection }) => {
  const [activeTab, setActiveTab] = useState<Tab>((initialSection as Tab) || 'interface');

  // Hardware profile
  const [hwProfile, setHwProfile] = useState<HardwareConfig>(getHardwareProfile());

  // Playback settings
  const [cacheSizeMB, setCacheSizeMB] = useState(Math.round(hwProfile.cacheBudget / (1024 * 1024)));
  const [diskCacheMB, setDiskCacheMB] = useState(() => {
    const saved = localStorage.getItem('pref_diskCacheMB');
    return saved ? Number(saved) : 10240; // default 10 GB
  });
  const [gpuMemoryBudgetMB, setGpuMemoryBudgetMB] = useState(() => {
    const saved = localStorage.getItem('pref_gpuMemoryBudgetMB');
    if (saved) return Number(saved);
    const gpuCache = (window as any).__gpuTextureCache;
    return gpuCache ? Math.round(gpuCache.maxBytes / (1024 * 1024)) : 512;
  });
  const [resolutionMode, setResolutionMode] = useState(hwProfile.resolutionMode);
  const [workersEnabled, setWorkersEnabled] = useState(hwProfile.workersEnabled);
  const [maxWorkers, setMaxWorkers] = useState(hwProfile.maxWorkers);
  const [playbackModeVal, setPlaybackMode] = useState<'realtime' | 'accurate' | 'cacheOnly'>('realtime');

  // Storage settings
  const [autoSaveInterval, setAutoSaveInterval] = useState(Math.round(autoSave.config.intervalMs / 60000));
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(autoSave.config.enabled);
  const [autoSaveNotification, setAutoSaveNotification] = useState(autoSave.config.showNotification);
  const [storageInfo] = useState(() => StorageManager.getInstance().getStorageInfo());
  const [recentCount, setRecentCount] = useState(useRecentProjectsStore.getState().projects.length);

  // Theme state
  const themes = themeManager.getThemes();
  const currentThemeId = themeManager.currentThemeId;
  const [themeEditorOpen, setThemeEditorOpen] = useState(false);
  const [themeSearch, setThemeSearch] = useState('');

  // Custom theme editor state
  const [customColors, setCustomColors] = useState<Record<string, string>>({
    accent: '#5865ff',
    bgApp: '#16181d',
    panel: '#1f2229',
    panelRaised: '#262a33',
    textPrimary: '#ffffff',
    textSecondary: '#8c8c8c',
    border: '#3a3a3a',
    danger: '#ff5c5c',
    success: '#6ad588',
  });

  // Persisted settings (load from localStorage on mount, save on change)
  const [uiScale, setUiScale] = useState(() => Number(localStorage.getItem('pref_uiScale') ?? 100));
  const [showTooltips, setShowTooltips] = useState(() => localStorage.getItem('pref_showTooltips') !== 'false');
  const [tooltipDelay, setTooltipDelay] = useState(() => Number(localStorage.getItem('pref_tooltipDelay') ?? 600));
  const [confirmDangerous, setConfirmDangerous] = useState(() => localStorage.getItem('pref_confirmDangerous') !== 'false');
  const [showGrid, setShowGrid] = useState(() => localStorage.getItem('pref_showGrid') !== 'false');
  const [showRulers, setShowRulers] = useState(() => localStorage.getItem('pref_showRulers') !== 'false');
  const [snapThreshold, setSnapThreshold] = useState(() => Number(localStorage.getItem('pref_snapThreshold') ?? 8));
  const [zoomToCursor, setZoomToCursor] = useState(() => localStorage.getItem('pref_zoomToCursor') !== 'false');
  const [showTransparencyCheckerboard, setShowTransparencyCheckerboard] = useState(
    () => localStorage.getItem('pref_showTransparencyCheckerboard') === 'true',
  );
  const [outsideBgStyle, setOutsideBgStyle] = useState<'gradient' | 'dark' | 'checkerboard'>(
    () => (localStorage.getItem('pref_outsideBgStyle') as any) ?? 'gradient',
  );
  const [exportFormat, setExportFormat] = useState(localStorage.getItem('pref_exportFormat') ?? 'mp4');
  const [exportQuality, setExportQuality] = useState(localStorage.getItem('pref_exportQuality') ?? 'high');

  // Persist helpers
  const persist = (key: string, value: any) => { try { localStorage.setItem(key, String(value)); } catch {} };

  const handleDetectHardware = () => {
    const profile = redetectHardware();
    setHwProfile(profile);
    setCacheSizeMB(Math.round(profile.cacheBudget / (1024 * 1024)));
    setResolutionMode(profile.resolutionMode);
    setWorkersEnabled(profile.workersEnabled);
    setMaxWorkers(profile.maxWorkers);
  };



  const handleClearRecent = () => {
    useRecentProjectsStore.getState().clearAll();
    setRecentCount(0);
  };

  const handleClearAllData = async () => {
    const confirmed = await alertConfirm(
      'Clear All Data?',
      'This will clear all IndexedDB data and reload the app. Are you sure? This cannot be undone.',
      { confirmLabel: 'Clear Everything', destructive: true, destructiveLabel: 'Cancel' },
    );
    if (confirmed) {
      indexedDB.deleteDatabase('OnionProjects');
      indexedDB.deleteDatabase('OnionWorkspaceHandle');
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleApplyStorage = () => {
    autoSave.configure({ intervalMs: autoSaveInterval * 60000, enabled: autoSaveEnabled, showNotification: autoSaveNotification });
  };

  const handleThemeChange = (id: string) => {
    themeManager.loadTheme(id);
  };

  const sectionStyle: React.CSSProperties = {
    background: 'var(--color-surface-alt)',
    borderRadius: 'var(--radius-sm)',
    padding: 12,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-secondary)',
  };
  const valueStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-family-mono)',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex bg-panel border border-border rounded-lg shadow-2xl"
        style={{ width: 680, height: 560 }}
        onClick={(e) => e.stopPropagation()}>
        
        {/* Sidebar */}
        <div className="flex flex-col shrink-0 py-3 overflow-auto" style={{ width: 140, borderRight: '1px solid var(--color-border)' }}>
          {TABS.map((tab) => (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="w-full text-left border-0 bg-transparent cursor-pointer transition-colors"
              style={{
                padding: '7px 16px',
                fontSize: 'var(--font-size-xs)',
                color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                background: activeTab === tab.id ? 'var(--color-panel-active)' : 'transparent',
                fontWeight: activeTab === tab.id ? 600 : 400,
                borderLeft: `3px solid ${activeTab === tab.id ? 'var(--color-accent)' : 'transparent'}`,
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <h2 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{TABS.find(t => t.id === activeTab)?.label}</h2>
            <button onClick={onClose} className="w-6 h-6 flex items-center justify-center border-0 bg-transparent text-text-disabled hover:text-text-primary cursor-pointer rounded-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
            {/* ─── INTERFACE ─── */}
            {activeTab === 'interface' && (
              <>
                <div style={sectionStyle}>
                  <div className="text-ui-xs font-medium text-text-primary mb-2">Appearance</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span style={labelStyle}>UI Scale</span>
                      <div className="flex items-center gap-2">
                        <input type="range" min={50} max={200} step={10} value={uiScale} onChange={e => { const v = Number(e.target.value); setUiScale(v); persist('pref_uiScale', v); }} className="w-24 accent-accent" />
                        <span style={valueStyle} className="w-10 text-right">{uiScale}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={labelStyle}>Show Tooltips</span>
                      <input type="checkbox" checked={showTooltips} onChange={e => { const v = e.target.checked; setShowTooltips(v); persist('pref_showTooltips', v); }} className="accent-accent" />
                    </div>
                    {showTooltips && (
                      <div className="flex items-center justify-between">
                        <span style={labelStyle}>Tooltip Delay</span>
                        <div className="flex items-center gap-2">
                          <input type="range" min={100} max={2000} step={50} value={tooltipDelay} onChange={e => { const v = Number(e.target.value); setTooltipDelay(v); persist('pref_tooltipDelay', v); }} className="w-24 accent-accent" />
                          <span style={valueStyle} className="w-12 text-right">{tooltipDelay}ms</span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span style={labelStyle}>Confirm Dangerous Actions</span>
                      <input type="checkbox" checked={confirmDangerous} onChange={e => { const v = e.target.checked; setConfirmDangerous(v); persist('pref_confirmDangerous', v); }} className="accent-accent" />
                    </div>
                  </div>
                </div>
                <div className="p-4 text-center text-ui-xs text-text-disabled">Language: English (default)</div>
              </>
            )}

            {/* ─── THEMES ─── */}
            {activeTab === 'themes' && (
              <>
                <div style={sectionStyle}>
                  <div className="text-ui-xs font-medium text-text-primary mb-2">Theme</div>
                  <div className="flex flex-col gap-1">
                    {themes.filter(t => !themeSearch || t.name.toLowerCase().includes(themeSearch.toLowerCase())).map((theme) => (
                      <label key={theme.id} className="flex items-center gap-3 cursor-pointer py-1.5 px-2 rounded-sm hover:bg-panel-hover transition-colors">
                        <input type="radio" name="theme" checked={currentThemeId === theme.id} onChange={() => handleThemeChange(theme.id)} className="accent-accent" />
                        <span className="flex-1 text-ui-xs" style={{ color: 'var(--color-text-primary)' }}>{theme.name}</span>
                        <span className="text-[10px]" style={{ color: 'var(--color-text-disabled)' }}>{theme.type === 'built-in' ? 'Built-in' : 'Custom'}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Search themes..." value={themeSearch} onChange={e => setThemeSearch(e.target.value)}
                    className="flex-1 h-7 text-ui-xs px-2 bg-surface border border-border rounded-sm text-text-primary outline-none focus:border-accent" />
                </div>
                <div className="pt-2 flex gap-2 flex-wrap">
                  <button onClick={async () => {
                    const name = await alertPrompt('Save Theme', 'Enter a name for the current theme:', '');
                    if (name) themeManager.saveAsCustomTheme(`custom_${Date.now()}`, name);
                  }} className="px-3 py-1.5 text-ui-xs rounded-sm border border-border bg-surface hover:bg-panel-hover text-text-secondary cursor-pointer">
                    Save Current as Theme
                  </button>
                  <button onClick={() => {
                    const json = themeManager.exportCurrentTheme();
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `onion-theme-${currentThemeId}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }} className="px-3 py-1.5 text-ui-xs rounded-sm border border-border bg-surface hover:bg-panel-hover text-text-secondary cursor-pointer">
                    Export Theme
                  </button>
                  <button onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = async () => {
                      const file = input.files?.[0];
                      if (!file) return;
                      const text = await file.text();
                      const imported = themeManager.importCustomTheme(text);
                      if (imported) {
                        themeManager.loadTheme(imported.id);
                      }
                    };
                    input.click();
                  }} className="px-3 py-1.5 text-ui-xs rounded-sm border border-border bg-surface hover:bg-panel-hover text-text-secondary cursor-pointer">
                    Import Theme
                  </button>
                </div>

                {/* Custom Theme Editor */}
                <div style={{ ...sectionStyle, marginTop: 12 }}>
                  <button
                    onClick={() => setThemeEditorOpen(!themeEditorOpen)}
                    className="flex items-center gap-2 w-full text-left bg-transparent border-0 cursor-pointer py-1"
                  >
                    <span style={{ fontSize: 10, transform: themeEditorOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', color: 'var(--color-text-secondary)' }}>▶</span>
                    <span className="text-ui-xs font-medium text-text-primary">Custom Theme Editor</span>
                  </button>

                  {themeEditorOpen && (
                    <div className="mt-3 space-y-3">
                      <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                        Pick colors to create your own theme. Changes apply live.
                      </p>

                      {/* Color Pickers Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                        <ColorPickerRow
                          label="Accent"
                          value={customColors.accent}
                          onChange={(v) => {
                            setCustomColors(c => ({ ...c, accent: v }));
                            applyCustomTheme({ ...customColors, accent: v });
                          }}
                        />
                        <ColorPickerRow
                          label="Background"
                          value={customColors.bgApp}
                          onChange={(v) => {
                            setCustomColors(c => ({ ...c, bgApp: v }));
                            applyCustomTheme({ ...customColors, bgApp: v });
                          }}
                        />
                        <ColorPickerRow
                          label="Panel"
                          value={customColors.panel}
                          onChange={(v) => {
                            setCustomColors(c => ({ ...c, panel: v }));
                            applyCustomTheme({ ...customColors, panel: v });
                          }}
                        />
                        <ColorPickerRow
                          label="Panel Raised"
                          value={customColors.panelRaised}
                          onChange={(v) => {
                            setCustomColors(c => ({ ...c, panelRaised: v }));
                            applyCustomTheme({ ...customColors, panelRaised: v });
                          }}
                        />
                        <ColorPickerRow
                          label="Text Primary"
                          value={customColors.textPrimary}
                          onChange={(v) => {
                            setCustomColors(c => ({ ...c, textPrimary: v }));
                            applyCustomTheme({ ...customColors, textPrimary: v });
                          }}
                        />
                        <ColorPickerRow
                          label="Text Secondary"
                          value={customColors.textSecondary}
                          onChange={(v) => {
                            setCustomColors(c => ({ ...c, textSecondary: v }));
                            applyCustomTheme({ ...customColors, textSecondary: v });
                          }}
                        />
                        <ColorPickerRow
                          label="Border"
                          value={customColors.border}
                          onChange={(v) => {
                            setCustomColors(c => ({ ...c, border: v }));
                            applyCustomTheme({ ...customColors, border: v });
                          }}
                        />
                        <ColorPickerRow
                          label="Danger"
                          value={customColors.danger}
                          onChange={(v) => {
                            setCustomColors(c => ({ ...c, danger: v }));
                            applyCustomTheme({ ...customColors, danger: v });
                          }}
                        />
                        <ColorPickerRow
                          label="Success"
                          value={customColors.success}
                          onChange={(v) => {
                            setCustomColors(c => ({ ...c, success: v }));
                            applyCustomTheme({ ...customColors, success: v });
                          }}
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={async () => {
                            const name = await alertPrompt('Save Custom Theme', 'Enter a name:', '');
                            if (name) {
                              const id = `custom_${Date.now()}`;
                              // applyCustomTheme already set all CSS vars on :root,
                              // so saveAsCustomTheme will snapshot them correctly.
                              themeManager.saveAsCustomTheme(id, name);
                              themeManager.loadTheme(id);
                            }
                          }}
                          className="px-3 py-1.5 text-ui-xs rounded-sm border border-accent bg-accent/10 text-accent hover:bg-accent/20 cursor-pointer"
                        >
                          Save as Custom Theme
                        </button>
                        <button
                          onClick={() => {
                            themeManager.loadTheme(currentThemeId);
                          }}
                          className="px-3 py-1.5 text-ui-xs rounded-sm border border-border bg-surface hover:bg-panel-hover text-text-secondary cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ─── VIEWPORT ─── */}
            {activeTab === 'viewport' && (
              <div style={sectionStyle}>
                <div className="text-ui-xs font-medium text-text-primary mb-2">Viewport Defaults</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><span style={labelStyle}>Show Grid</span><input type="checkbox" checked={showGrid} onChange={e => { const v = e.target.checked; setShowGrid(v); persist('pref_showGrid', v); }} className="accent-accent" /></div>
                  <div className="flex items-center justify-between"><span style={labelStyle}>Show Rulers</span><input type="checkbox" checked={showRulers} onChange={e => { const v = e.target.checked; setShowRulers(v); persist('pref_showRulers', v); }} className="accent-accent" /></div>
                  <div className="flex items-center justify-between">
                    <span style={labelStyle}>Snap Threshold</span>
                    <div className="flex items-center gap-2">
                      <input type="range" min={1} max={20} value={snapThreshold} onChange={e => { const v = Number(e.target.value); setSnapThreshold(v); persist('pref_snapThreshold', v); }} className="w-20 accent-accent" />
                      <span style={valueStyle} className="w-8 text-right">{snapThreshold}px</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between"><span style={labelStyle}>Zoom to Cursor</span><input type="checkbox" checked={zoomToCursor} onChange={e => { const v = e.target.checked; setZoomToCursor(v); persist('pref_zoomToCursor', v); }} className="accent-accent" /></div>
                  <div className="flex items-center justify-between">
                    <span style={labelStyle}>Transparency Checkerboard</span>
                    <input
                      type="checkbox"
                      checked={showTransparencyCheckerboard}
                      onChange={e => {
                        const v = e.target.checked;
                        setShowTransparencyCheckerboard(v);
                        useViewportStore.getState().setShowTransparencyCheckerboard(v);
                        persist('pref_showTransparencyCheckerboard', v);
                      }}
                      className="accent-accent"
                    />
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'viewport' && (
              <div style={sectionStyle}>
                <div className="text-ui-xs font-medium text-text-primary mb-2">Outside Background</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span style={labelStyle}>Style</span>
                    <select
                      value={outsideBgStyle}
                      onChange={e => {
                        const v = e.target.value;
                        setOutsideBgStyle(v as any);
                        useViewportStore.getState().setOutsideBgStyle(v as any);
                        persist('pref_outsideBgStyle', v);
                      }}
                      className="text-ui-xs bg-surface border border-border rounded-sm px-1 py-0.5 text-text-primary"
                    >
                      <option value="gradient">Dark Gradient (default)</option>
                      <option value="dark">Solid Dark</option>
                      <option value="checkerboard">Checkerboard</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-text-tertiary mt-1">
                    Controls the area outside the composition rectangle.
                  </p>
                </div>
              </div>
            )}

            {/* ─── PLAYBACK ─── */}
            {activeTab === 'playback' && (
              <>
                <div style={sectionStyle}>
                  <div className="flex items-center justify-between mb-2"><span className="text-ui-xs font-medium text-text-primary">Hardware Profile</span>
                    <button onClick={handleDetectHardware} className="text-ui-xs px-2 py-1 rounded-sm border border-border bg-surface hover:bg-panel-hover text-text-secondary cursor-pointer">Detect</button>
                  </div>
                  <div className="text-ui-xs text-text-secondary space-y-1">
                    <div className="flex justify-between"><span>Profile:</span><span style={valueStyle}>{hwProfile.tier}</span></div>
                    <div className="flex justify-between"><span>CPU Cores:</span><span style={valueStyle}>{hwProfile.cores}</span></div>
                    <div className="flex justify-between"><span>Memory:</span><span style={valueStyle}>{hwProfile.deviceMemoryGB} GB</span></div>
                    <div className="flex justify-between"><span>GPU:</span><span style={valueStyle} className="truncate max-w-[200px]">{hwProfile.gpuRenderer}</span></div>
                  </div>
                </div>
                {/* ─── CACHE ─── */}
                <div style={sectionStyle}>
                  <div className="text-ui-xs font-medium text-text-primary mb-2">Frame Cache</div>
                  <div className="space-y-2">

                    {/* RAM cache size */}
                    <div className="flex items-center justify-between">
                      <span style={labelStyle}>RAM Cache Size</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="range" min={256} max={8192} step={256}
                          value={cacheSizeMB}
                          onChange={e => {
                            const v = Number(e.target.value);
                            setCacheSizeMB(v);
                            // Apply live
                            const { setRamMaxBytes } = (window as any).__cacheStoreActions ?? {};
                            setRamMaxBytes?.(v * 1024 * 1024);
                            persist('pref_ramCacheMB', v);
                          }}
                          className="w-24 accent-accent"
                        />
                        <span style={valueStyle} className="w-16 text-right">
                          {cacheSizeMB >= 1024
                            ? `${(cacheSizeMB / 1024).toFixed(1)} GB`
                            : `${cacheSizeMB} MB`}
                        </span>
                      </div>
                    </div>

                    {/* Disk cache size */}
                    <div className="flex items-center justify-between">
                      <span style={labelStyle}>Disk Cache Size</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="range" min={1024} max={51200} step={1024}
                          value={diskCacheMB}
                          onChange={e => {
                            const v = Number(e.target.value);
                            setDiskCacheMB(v);
                            const { setDiskMaxBytes } = (window as any).__cacheStoreActions ?? {};
                            setDiskMaxBytes?.(v * 1024 * 1024);
                            persist('pref_diskCacheMB', v);
                          }}
                          className="w-24 accent-accent"
                        />
                        <span style={valueStyle} className="w-16 text-right">
                          {diskCacheMB >= 1024
                            ? `${(diskCacheMB / 1024).toFixed(1)} GB`
                            : `${diskCacheMB} MB`}
                        </span>
                      </div>
                    </div>

                    {/* Cache tier info */}
                    <div className="flex justify-between">
                      <span style={labelStyle}>Disk Tier</span>
                      <span style={valueStyle}>
                        {(window as any).__frameCache?.disk?.isOPFS ? 'OPFS (fast)' : 'IndexedDB'}
                      </span>
                    </div>

                    {/* Purge buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          (window as any).__frameCache?.purge('ram');
                        }}
                        className="flex-1 text-ui-xs px-2 py-1 rounded-sm border border-border
                                   bg-surface hover:bg-panel-hover text-text-secondary cursor-pointer"
                      >
                        Empty RAM Cache
                      </button>
                      <button
                        onClick={async () => {
                          await (window as any).__frameCache?.purge('disk');
                        }}
                        className="flex-1 text-ui-xs px-2 py-1 rounded-sm border border-border
                                   bg-surface hover:bg-panel-hover text-text-secondary cursor-pointer"
                      >
                        Empty Disk Cache
                      </button>
                    </div>
                  </div>
                </div>

                {/* ─── GPU CACHE ─── */}
                <div style={sectionStyle}>
                  <div className="text-ui-xs font-medium text-text-primary mb-2">GPU Cache</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between"><span style={labelStyle}>Quality:</span>
                      <select value={resolutionMode} onChange={e => setResolutionMode(e.target.value as any)} className="text-ui-xs bg-surface border border-border rounded-sm px-1 py-0.5 text-text-primary">
                        <option value="auto">Auto</option><option value="full">Full</option><option value="half">Half</option><option value="quarter">Quarter</option>
                      </select>
                    </div>
                                    <div className="flex items-center justify-between"><span style={labelStyle}>GPU Memory Budget:</span>
                      <div className="flex items-center gap-2">
                        <input type="range" min={64} max={4096} step={64} value={gpuMemoryBudgetMB}
                          onChange={e => {
                            const v = Number(e.target.value);
                            setGpuMemoryBudgetMB(v);
                            persist('pref_gpuMemoryBudgetMB', v);
                            const gpuCache = (window as any).__gpuTextureCache;
                            if (gpuCache) gpuCache.setMaxBytes(v * 1024 * 1024);
                          }}
                          className="w-24 accent-accent" />
                        <span style={valueStyle} className="w-16 text-right">{gpuMemoryBudgetMB >= 1024 ? `${(gpuMemoryBudgetMB/1024).toFixed(1)} GB` : `${gpuMemoryBudgetMB} MB`}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={sectionStyle}>
                  <div className="text-ui-xs font-medium text-text-primary mb-2">Playback</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between"><span style={labelStyle}>Mode:</span>
                      <select value={playbackModeVal} onChange={e => setPlaybackMode(e.target.value as any)} className="text-ui-xs bg-surface border border-border rounded-sm px-1 py-0.5 text-text-primary">
                        <option value="realtime">Real-time</option><option value="accurate">Accurate</option><option value="cacheOnly">Cache Only</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between"><span style={labelStyle}>Worker Threads:</span>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={workersEnabled} onChange={e => setWorkersEnabled(e.target.checked)} className="accent-accent" />
                        {workersEnabled && <input type="number" min={1} max={8} value={maxWorkers} onChange={e => setMaxWorkers(Math.max(1, Math.min(8, Number(e.target.value))))} className="w-14 text-ui-xs bg-surface border border-border rounded-sm px-1 py-0.5 text-text-primary text-right" />}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ─── STORAGE ─── */}
            {activeTab === 'storage' && (
              <>
                <div style={sectionStyle}>
                  <div className="text-ui-xs font-medium text-text-primary mb-2">Auto-save</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between"><span style={labelStyle}>Enable:</span><input type="checkbox" checked={autoSaveEnabled} onChange={e => { setAutoSaveEnabled(e.target.checked); handleApplyStorage(); }} className="accent-accent" /></div>
                    {autoSaveEnabled && (<>
                      <div className="flex items-center justify-between"><span style={labelStyle}>Interval:</span>
                        <div className="flex items-center gap-2">
                          <input type="number" min={1} max={30} value={autoSaveInterval} onChange={e => { setAutoSaveInterval(Number(e.target.value)); handleApplyStorage(); }} className="w-12 text-ui-xs bg-surface border border-border rounded-sm px-1 py-0.5 text-text-primary text-right" />
                          <span className="text-ui-xs text-text-disabled">min</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between"><span style={labelStyle}>Show Notification:</span><input type="checkbox" checked={autoSaveNotification} onChange={e => { setAutoSaveNotification(e.target.checked); handleApplyStorage(); }} className="accent-accent" /></div>
                    </>)}
                  </div>
                </div>
                <div style={sectionStyle}>
                  <div className="text-ui-xs font-medium text-text-primary mb-2">Storage Backend</div>
                  {storageInfo ? (
                    <div className="text-ui-xs text-text-secondary space-y-1">
                      <div className="flex justify-between"><span>Adapter:</span><span style={valueStyle}>{storageInfo.adapterName}</span></div>
                      <div className="flex justify-between"><span>Type:</span><span style={valueStyle}>{storageInfo.adapterType}</span></div>
                      <div className="flex justify-between"><span>File Access:</span><span style={valueStyle}>{storageInfo.capabilities.directFileAccess ? 'Yes' : 'No'}</span></div>
                    </div>
                  ) : <p className="text-ui-xs text-text-disabled">No storage adapter detected</p>}
                </div>
                <div style={sectionStyle}>
                  <div className="flex items-center justify-between"><span className="text-ui-xs font-medium text-text-primary">Recent Projects</span><span className="text-ui-xs text-text-disabled">{recentCount} items</span></div>
                  <button onClick={handleClearRecent} className="mt-2 text-ui-xs px-2 py-1 rounded-sm border border-border bg-surface hover:bg-panel-hover text-text-secondary cursor-pointer">Clear Recent Projects</button>
                </div>
                <div style={{ ...sectionStyle, border: '1px solid rgba(255,92,92,0.2)' }}>
                  <div className="text-ui-xs font-medium" style={{ color: '#ff5c5c' }}>Danger Zone</div>
                  <p className="text-ui-xs text-text-secondary my-1">Clear all stored data including projects, assets, and settings.</p>
                  <button onClick={handleClearAllData} className="text-ui-xs px-2 py-1 rounded-sm border border-[#ff5c5c]/30 bg-transparent hover:bg-[#ff5c5c]/10" style={{ color: '#ff5c5c', cursor: 'pointer' }}>Clear All Data</button>
                </div>
              </>
            )}

            {/* ─── EXPORT ─── */}
            {activeTab === 'export' && (
              <div style={sectionStyle}>
                <div className="text-ui-xs font-medium text-text-primary mb-2">Default Export Settings</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><span style={labelStyle}>Format:</span>
                    <select value={exportFormat} onChange={e => setExportFormat(e.target.value)} className="text-ui-xs bg-surface border border-border rounded-sm px-1 py-0.5 text-text-primary">
                      <option value="mp4">MP4</option><option value="webm">WebM</option><option value="mov">MOV</option><option value="gif">GIF</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between"><span style={labelStyle}>Quality:</span>
                    <select value={exportQuality} onChange={e => setExportQuality(e.target.value)} className="text-ui-xs bg-surface border border-border rounded-sm px-1 py-0.5 text-text-primary">
                      <option value="draft">Draft</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="lossless">Lossless</option>
                    </select>
                  </div>
                  <p className="text-ui-xs text-text-disabled pt-2">Full export settings available in Export Dialog (Ctrl+M)</p>
                </div>
              </div>
            )}

            {/* ─── PERFORMANCE ─── */}
            {activeTab === 'performance' && (
              <div style={sectionStyle}>
                <div className="text-ui-xs font-medium text-text-primary mb-2">Performance Monitoring</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><span style={labelStyle}>Show FPS Overlay:</span><input type="checkbox" className="accent-accent" /></div>
                  <div className="flex items-center justify-between"><span style={labelStyle}>Prefer Hardware Acceleration:</span><input type="checkbox" defaultChecked className="accent-accent" /></div>
                  <div className="flex items-center justify-between"><span style={labelStyle}>Max Texture Size:</span><span style={valueStyle}>4096</span></div>
                  <div className="flex items-center justify-between"><span style={labelStyle}>Worker Count:</span><span style={valueStyle}>{navigator.hardwareConcurrency || 4}</span></div>
                </div>
              </div>
            )}

            {/* ─── SYSTEM ─── */}
            {activeTab === 'system' && (
              <>
                <div style={sectionStyle}>
                  <div className="text-ui-xs font-medium text-text-primary mb-2">Startup</div>
                  <div className="flex items-center justify-between"><span style={labelStyle}>On Start:</span>
                    <select className="text-ui-xs bg-surface border border-border rounded-sm px-1 py-0.5 text-text-primary">
                      <option>Open last project</option><option>Show welcome screen</option><option>Empty project</option>
                    </select>
                  </div>
                </div>
                <div style={sectionStyle}>
                  <div className="text-ui-xs font-medium text-text-primary mb-2">Reset</div>
                  <button onClick={async () => {
                    const confirmed = await alertConfirm('Reset Preferences', 'Reset all preferences to defaults? This will reload the app.');
                    if (confirmed) { localStorage.clear(); window.location.reload(); }
                  }}
                    className="px-3 py-1.5 text-ui-xs rounded-sm border border-border bg-surface hover:bg-panel-hover text-text-secondary cursor-pointer">Reset Preferences</button>
                </div>
              </>
            )}

            {/* ─── RENDERING ─── */}
            {activeTab === 'rendering' && (
              <>
                <div style={sectionStyle}>
                  <div className="text-ui-xs font-medium text-text-primary mb-2">Rendering Backend</div>
                  <RenderingPreferences />
                </div>
              </>
            )}

            {/* ─── ABOUT ─── */}
            {activeTab === 'about' && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <div className="text-center">
                  <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-text-primary)' }}>Onion</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>Version 1.0.0</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-disabled)', marginTop: 8, maxWidth: 300 }}>
                    Professional 2D motion graphics compositing application.
                  </div>
                </div>
                <div className="flex gap-3 text-ui-xs">
                  <a href="#" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>Documentation</a>
                  <span style={{ color: 'var(--color-text-disabled)' }}>·</span>
                  <a href="#" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>Changelog</a>
                  <span style={{ color: 'var(--color-text-disabled)' }}>·</span>
                  <a href="#" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>Report Bug</a>
                </div>
                <div className="text-[10px]" style={{ color: 'var(--color-text-disabled)', marginTop: 8 }}>
                  MIT License · Built with Three.js, React, Zustand
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--color-border)' }}>
            <button onClick={onClose} className="px-4 py-1.5 text-ui-xs rounded-sm border border-border bg-surface hover:bg-panel-hover text-text-secondary cursor-pointer">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Rendering Preferences ─────────────────────────────────────

const RenderingPreferences: React.FC = () => {
  const preferred = useRendererBackendStore(s => s.preferredBackend);
  const actual = useRendererBackendStore(s => s.actualBackend);
  const swapping = useRendererBackendStore(s => s.swapping);
  const webgpuAvailable = useRendererBackendStore(s => s.webgpuAvailable);
  const webgpuChecked = useRendererBackendStore(s => s.webgpuChecked);
  const fallbackReason = useRendererBackendStore(s => s.fallbackReason);
  const mismatch = actual !== preferred;

  const setPreferred = (backend: BackendId) => {
    useRendererBackendStore.getState().setPreferredBackend(backend);
  };

  const applyNow = async (backend: BackendId) => {
    useRendererBackendStore.getState().setPreferredBackend(backend);
    const r: any = (window as any).__renderer;
    if (r?.swapBackend) {
      const result = await r.swapBackend(backend);
      if (!result.ok && result.reason) {
        alert(`Backend switch failed: ${result.reason}`);
      }
    }
  };

  const retryDetection = async () => {
    await useRendererBackendStore.getState().checkWebGPUAvailability();
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-secondary)',
  };
  const valueStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-family-mono)',
  };

  return (
    <div className="space-y-3">
      {/* Preferred backend selector */}
      <div className="flex items-center justify-between">
        <span style={labelStyle}>Preferred Backend</span>
        <select
          value={preferred}
          onChange={e => setPreferred(e.target.value as BackendId)}
          className="text-ui-xs bg-surface border border-border rounded-sm px-1 py-0.5 text-text-primary"
        >
          <option value="webgl">WebGL (default)</option>
          <option value="webgpu" disabled={!webgpuAvailable}>
            WebGPU{!webgpuAvailable ? ' (unavailable)' : ''}
          </option>
        </select>
      </div>

      {/* Currently active backend */}
      <div className="flex items-center justify-between">
        <span style={labelStyle}>Active Backend</span>
        <span style={valueStyle}>
          {actual === 'webgl' ? 'WebGL' : 'WebGPU'}
          {swapping && ' (swapping…)'}
          {mismatch && !swapping && (
            <span style={{ color: 'var(--color-warning)', marginLeft: 4 }}>
              (fallback)
            </span>
          )}
        </span>
      </div>

      {/* WebGPU detection status */}
      <div className="flex items-center justify-between">
        <span style={labelStyle}>WebGPU Available</span>
        <div className="flex items-center gap-2">
          <span style={valueStyle}>
            {!webgpuChecked
              ? 'Checking…'
              : webgpuAvailable
                ? 'Yes'
                : 'No'}
          </span>
          {!webgpuChecked && (
            <button
              onClick={retryDetection}
              className="text-ui-xs px-1.5 py-0.5 rounded-sm border border-border bg-surface hover:bg-panel-hover text-text-secondary cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
      </div>

      {/* Fallback reason */}
      {fallbackReason && (
        <div
          style={{
            padding: '6px 8px',
            background: 'rgba(255,160,50,0.12)',
            border: '1px solid rgba(255,160,50,0.3)',
            borderRadius: 3,
            fontSize: 10,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.4,
          }}
        >
          <strong style={{ color: '#ffa030' }}>Fallback reason:</strong>{' '}
          {fallbackReason}
        </div>
      )}

      {/* Apply Now button */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => applyNow('webgl')}
          disabled={swapping}
          className="flex-1 text-ui-xs px-2 py-1 rounded-sm border border-border
                     bg-surface hover:bg-panel-hover text-text-secondary cursor-pointer
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Apply WebGL Now
        </button>
        <button
          onClick={() => applyNow('webgpu')}
          disabled={swapping || !webgpuAvailable}
          className="flex-1 text-ui-xs px-2 py-1 rounded-sm border border-border
                     bg-surface hover:bg-panel-hover text-text-secondary cursor-pointer
                     disabled:opacity-40 disabled:cursor-not-allowed"
          title={
            !webgpuAvailable
              ? 'WebGPU not available in this browser'
              : 'Switch to WebGPU backend'
          }
        >
          {swapping ? 'Swapping…' : 'Apply WebGPU Now'}
        </button>
      </div>

      {/* Info note */}
      <p className="text-[10px] text-text-tertiary mt-1" style={{ lineHeight: 1.4 }}>
        WebGPU is experimental — some features (custom effects, motion blur, DOF)
        may not work. You can switch back to WebGL at any time.
      </p>
    </div>
  );
};

/** Inline color picker row with label + color input + hex display */
const ColorPickerRow: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{label}</span>
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        value={value.startsWith('#') ? value : '#5865ff'}
        onChange={e => onChange(e.target.value)}
        className="w-6 h-6 rounded cursor-pointer border-0 p-0"
        style={{ background: 'transparent' }}
      />
      <span className="text-[9px] w-16 text-right" style={{ color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-mono)' }}>
        {value.length > 12 ? value.substring(0, 12) + '…' : value}
      </span>
    </div>
  </div>
);

export default PreferencesDialog;
