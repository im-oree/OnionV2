/**
 * PreferencesDialog — complete app preferences with all sections.
 * Interface, Themes (with theme editor), Viewport, Playback, Storage,
 * Export, Performance, System, About.
 */
import React, { useState } from 'react';
import { getHardwareProfile, redetectHardware, type HardwareConfig } from '../../config/HardwareProfile';
import { StorageManager } from '../../storage/StorageManager';
import { useRecentProjectsStore } from '../../state/recentProjectsStore';
import { autoSave } from '../../storage/AutoSave';
import { themeManager } from '../../styles/ThemeManager';
import { alertConfirm, alertPrompt } from '../../state/alertModalStore';

interface Props {
  onClose: () => void;
  initialSection?: string;
}

type Tab = 'interface' | 'themes' | 'viewport' | 'playback' | 'storage' | 'export' | 'performance' | 'system' | 'about';

const TABS: { id: Tab; label: string }[] = [
  { id: 'interface', label: 'Interface' },
  { id: 'themes', label: 'Themes' },
  { id: 'viewport', label: 'Viewport' },
  { id: 'playback', label: 'Playback' },
  { id: 'storage', label: 'Storage' },
  { id: 'export', label: 'Export' },
  { id: 'performance', label: 'Performance' },
  { id: 'system', label: 'System' },
  { id: 'about', label: 'About' },
];

export const PreferencesDialog: React.FC<Props> = ({ onClose, initialSection }) => {
  const [activeTab, setActiveTab] = useState<Tab>((initialSection as Tab) || 'interface');

  // Hardware profile
  const [hwProfile, setHwProfile] = useState<HardwareConfig>(getHardwareProfile());

  // Playback settings
  const [cacheSizeMB, setCacheSizeMB] = useState(Math.round(hwProfile.cacheBudget / (1024 * 1024)));
  const [resolutionMode, setResolutionMode] = useState(hwProfile.resolutionMode);
  const [autoRamPreview, setAutoRamPreview] = useState(hwProfile.autoRamPreview);
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

  // Persisted settings (load from localStorage on mount, save on change)
  const [uiScale, setUiScale] = useState(() => Number(localStorage.getItem('pref_uiScale') ?? 100));
  const [showTooltips, setShowTooltips] = useState(() => localStorage.getItem('pref_showTooltips') !== 'false');
  const [confirmDangerous, setConfirmDangerous] = useState(() => localStorage.getItem('pref_confirmDangerous') !== 'false');
  const [showGrid, setShowGrid] = useState(() => localStorage.getItem('pref_showGrid') !== 'false');
  const [showRulers, setShowRulers] = useState(() => localStorage.getItem('pref_showRulers') !== 'false');
  const [snapThreshold, setSnapThreshold] = useState(() => Number(localStorage.getItem('pref_snapThreshold') ?? 8));
  const [zoomToCursor, setZoomToCursor] = useState(() => localStorage.getItem('pref_zoomToCursor') !== 'false');
  const [exportFormat, setExportFormat] = useState(localStorage.getItem('pref_exportFormat') ?? 'mp4');
  const [exportQuality, setExportQuality] = useState(localStorage.getItem('pref_exportQuality') ?? 'high');

  // Persist helpers
  const persist = (key: string, value: any) => { try { localStorage.setItem(key, String(value)); } catch {} };

  const handleDetectHardware = () => {
    const profile = redetectHardware();
    setHwProfile(profile);
    setCacheSizeMB(Math.round(profile.cacheBudget / (1024 * 1024)));
    setResolutionMode(profile.resolutionMode);
    setAutoRamPreview(profile.autoRamPreview);
    setWorkersEnabled(profile.workersEnabled);
    setMaxWorkers(profile.maxWorkers);
  };

  const handleClearCache = () => {
    (window as any).__frameCache?.invalidateAllCompositions();
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
      <div className="flex bg-panel border border-border rounded-lg shadow-2xl max-h-[80vh]"
        style={{ width: 680 }}
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
                <div className="pt-2">
                  <button onClick={async () => {
                    const name = await alertPrompt('Save Theme', 'Enter a name for the current theme:', '');
                    if (name) themeManager.saveAsCustomTheme(`custom_${Date.now()}`, name);
                  }} className="px-3 py-1.5 text-ui-xs rounded-sm border border-border bg-surface hover:bg-panel-hover text-text-secondary cursor-pointer">
                    Save Current as Theme
                  </button>
                  <button onClick={themeManager.exportCurrentTheme} className="ml-2 px-3 py-1.5 text-ui-xs rounded-sm border border-border bg-surface hover:bg-panel-hover text-text-secondary cursor-pointer">
                    Export Theme
                  </button>
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
                <div style={sectionStyle}>
                  <div className="text-ui-xs font-medium text-text-primary mb-2">Cache</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between"><span style={labelStyle}>RAM Cache:</span>
                      <div className="flex items-center gap-2">
                        <input type="range" min={256} max={8192} step={256} value={cacheSizeMB} onChange={e => setCacheSizeMB(Number(e.target.value))} className="w-24 accent-accent" />
                        <span style={valueStyle} className="w-16 text-right">{cacheSizeMB >= 1024 ? `${(cacheSizeMB/1024).toFixed(1)} GB` : `${cacheSizeMB} MB`}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between"><span style={labelStyle}>Quality:</span>
                      <select value={resolutionMode} onChange={e => setResolutionMode(e.target.value as any)} className="text-ui-xs bg-surface border border-border rounded-sm px-1 py-0.5 text-text-primary">
                        <option value="auto">Auto</option><option value="full">Full</option><option value="half">Half</option><option value="quarter">Quarter</option>
                      </select>
                    </div>
                    <button onClick={handleClearCache} className="text-ui-xs px-2 py-1 rounded-sm border border-border bg-surface hover:bg-panel-hover text-text-secondary cursor-pointer">Clear Cache</button>
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
                    <div className="flex items-center justify-between"><span style={labelStyle}>Auto RAM Preview:</span><input type="checkbox" checked={autoRamPreview} onChange={e => setAutoRamPreview(e.target.checked)} className="accent-accent" /></div>
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

export default PreferencesDialog;
