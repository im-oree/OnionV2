/**
 * PreferencesDialog — scaffold for app preferences with Playback section.
 * Finalized in Phase 10; provides Playback settings now.
 */
import React, { useState } from 'react';
import { getHardwareProfile, redetectHardware, type HardwareConfig } from '../../config/HardwareProfile';

interface Props {
  onClose: () => void;
  initialSection?: string;
}

import { StorageManager } from '../../storage/StorageManager';
import { useRecentProjectsStore } from '../../state/recentProjectsStore';
import { autoSave } from '../../storage/AutoSave';

type Tab = 'playback' | 'general' | 'appearance' | 'storage';

export const PreferencesDialog: React.FC<Props> = ({ onClose, initialSection }) => {
  const [activeTab, setActiveTab] = useState<Tab>((initialSection as Tab) || 'playback');
  const [hwProfile, setHwProfile] = useState<HardwareConfig>(getHardwareProfile());

  // Playback settings state
  const [cacheSizeMB, setCacheSizeMB] = useState(Math.round(hwProfile.cacheBudget / (1024 * 1024)));
  const [resolutionMode, setResolutionMode] = useState(hwProfile.resolutionMode);
  const [autoRamPreview, setAutoRamPreview] = useState(hwProfile.autoRamPreview);
  const [workersEnabled, setWorkersEnabled] = useState(hwProfile.workersEnabled);
  const [maxWorkers, setMaxWorkers] = useState(hwProfile.maxWorkers);
  const [playbackMode, setPlaybackMode] = useState<'realtime' | 'accurate' | 'cacheOnly'>('realtime');

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
    const fc = (window as any).__frameCache;
    if (fc) {
      fc.invalidateAllCompositions();
    }
  };

  // Storage settings state
  const [autoSaveInterval, setAutoSaveInterval] = useState(
    Math.round(autoSave.config.intervalMs / 60000),
  );
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(autoSave.config.enabled);
  const [autoSaveNotification, setAutoSaveNotification] = useState(autoSave.config.showNotification);
  const [storageInfo] = useState(() => StorageManager.getInstance().getStorageInfo());
  const [recentProjects, setRecentProjects] = useState(useRecentProjectsStore.getState().projects.length);

  const handleClearRecent = () => {
    useRecentProjectsStore.getState().clearAll();
    setRecentProjects(0);
  };

  const handleClearAllData = () => {
    if (window.confirm('This will clear all IndexedDB data. Are you sure?')) {
      indexedDB.deleteDatabase('OnionProjects');
      indexedDB.deleteDatabase('OnionWorkspaceHandle');
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleApplyStorageSettings = () => {
    autoSave.configure({
      intervalMs: autoSaveInterval * 60000,
      enabled: autoSaveEnabled,
      showNotification: autoSaveNotification,
    });
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'playback', label: 'Playback' },
    { id: 'storage', label: 'Storage' },
    { id: 'appearance', label: 'Appearance' },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-panel border border-border rounded-lg shadow-2xl w-[520px] max-h-[600px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-ui-sm font-semibold text-text-primary">Preferences</h2>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center border-0 bg-transparent text-text-disabled hover:text-text-primary cursor-pointer rounded-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-4 gap-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-ui-xs border-b-2 border-transparent cursor-pointer ${
                activeTab === tab.id
                  ? 'text-accent border-accent font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:border-text-disabled'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
          {activeTab === 'playback' && (
            <>
              {/* Hardware Profile */}
              <div className="bg-surface-alt rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-ui-xs font-medium text-text-primary">Hardware Profile</span>
                  <button
                    onClick={handleDetectHardware}
                    className="text-ui-xs px-2 py-1 rounded-sm border border-border bg-surface hover:bg-panel-hover text-text-secondary cursor-pointer"
                  >
                    Detect Hardware
                  </button>
                </div>
                <div className="text-ui-xs text-text-secondary space-y-1">
                  <div className="flex justify-between"><span>Profile:</span><span className="text-text-primary font-mono">{hwProfile.tier}</span></div>
                  <div className="flex justify-between"><span>CPU Cores:</span><span className="text-text-primary font-mono">{hwProfile.cores}</span></div>
                  <div className="flex justify-between"><span>Memory:</span><span className="text-text-primary font-mono">{hwProfile.deviceMemoryGB} GB</span></div>
                  <div className="flex justify-between"><span>GPU:</span><span className="text-text-primary font-mono truncate ml-2 max-w-[200px]">{hwProfile.gpuRenderer}</span></div>
                </div>
              </div>

              {/* Cache Settings */}
              <div className="bg-surface-alt rounded-md p-3 space-y-2">
                <span className="text-ui-xs font-medium text-text-primary">Cache</span>
                <div className="flex items-center justify-between">
                  <span className="text-ui-xs text-text-secondary">RAM Cache Size:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="256"
                      max="8192"
                      step="256"
                      value={cacheSizeMB}
                      onChange={(e) => setCacheSizeMB(Number(e.target.value))}
                      className="w-24 h-1 accent-accent"
                    />
                    <span className="text-ui-xs text-text-primary font-mono w-16 text-right">{cacheSizeMB >= 1024 ? `${(cacheSizeMB / 1024).toFixed(1)} GB` : `${cacheSizeMB} MB`}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ui-xs text-text-secondary">Cache Quality:</span>
                  <select
                    value={resolutionMode}
                    onChange={(e) => setResolutionMode(e.target.value as any)}
                    className="text-ui-xs bg-surface border border-border rounded-sm px-1 py-0.5 text-text-primary"
                  >
                    <option value="auto">Auto</option>
                    <option value="full">Full</option>
                    <option value="half">Half</option>
                    <option value="quarter">Quarter</option>
                  </select>
                </div>
                <button
                  onClick={handleClearCache}
                  className="text-ui-xs px-2 py-1 rounded-sm border border-border bg-surface hover:bg-panel-hover text-text-secondary cursor-pointer"
                >
                  Clear All Cache
                </button>
              </div>

              {/* Workers */}
              <div className="bg-surface-alt rounded-md p-3 space-y-2">
                <span className="text-ui-xs font-medium text-text-primary">Workers</span>
                <div className="flex items-center justify-between">
                  <span className="text-ui-xs text-text-secondary">Worker Threads:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={workersEnabled}
                      onChange={(e) => setWorkersEnabled(e.target.checked)}
                      className="accent-accent"
                    />
                    <span className="text-ui-xs text-text-secondary">Enabled</span>
                  </div>
                </div>
                {workersEnabled && (
                  <div className="flex items-center justify-between">
                    <span className="text-ui-xs text-text-secondary">Max Threads:</span>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={maxWorkers}
                      onChange={(e) => setMaxWorkers(Math.max(1, Math.min(8, Number(e.target.value))))}
                      className="w-16 text-ui-xs bg-surface border border-border rounded-sm px-1 py-0.5 text-text-primary text-right"
                    />
                  </div>
                )}
              </div>

              {/* Playback Mode */}
              <div className="bg-surface-alt rounded-md p-3 space-y-2">
                <span className="text-ui-xs font-medium text-text-primary">Playback</span>
                <div className="flex items-center justify-between">
                  <span className="text-ui-xs text-text-secondary">Playback Mode:</span>
                  <select
                    value={playbackMode}
                    onChange={(e) => setPlaybackMode(e.target.value as any)}
                    className="text-ui-xs bg-surface border border-border rounded-sm px-1 py-0.5 text-text-primary"
                  >
                    <option value="realtime">Real-time (drop frames)</option>
                    <option value="accurate">Accurate (render every frame)</option>
                    <option value="cacheOnly">Cache Only</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ui-xs text-text-secondary">Auto RAM Preview:</span>
                  <input
                    type="checkbox"
                    checked={autoRamPreview}
                    onChange={(e) => setAutoRamPreview(e.target.checked)}
                    className="accent-accent"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'storage' && (
            <>
              {/* Auto-save Settings */}
              <div className="bg-surface-alt rounded-md p-3 space-y-2">
                <span className="text-ui-xs font-medium text-text-primary">Auto-save</span>
                <div className="flex items-center justify-between">
                  <span className="text-ui-xs text-text-secondary">Enable Auto-save:</span>
                  <input
                    type="checkbox"
                    checked={autoSaveEnabled}
                    onChange={(e) => { setAutoSaveEnabled(e.target.checked); handleApplyStorageSettings(); }}
                    className="accent-accent"
                  />
                </div>
                {autoSaveEnabled && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-ui-xs text-text-secondary">Interval:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={autoSaveInterval}
                          onChange={(e) => { setAutoSaveInterval(Number(e.target.value)); handleApplyStorageSettings(); }}
                          className="w-12 text-ui-xs bg-surface border border-border rounded-sm px-1 py-0.5 text-text-primary text-right"
                        />
                        <span className="text-ui-xs text-text-disabled">min</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ui-xs text-text-secondary">Show Notification:</span>
                      <input
                        type="checkbox"
                        checked={autoSaveNotification}
                        onChange={(e) => { setAutoSaveNotification(e.target.checked); handleApplyStorageSettings(); }}
                        className="accent-accent"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Storage Adapter Info */}
              <div className="bg-surface-alt rounded-md p-3 space-y-2">
                <span className="text-ui-xs font-medium text-text-primary">Storage Backend</span>
                {storageInfo ? (
                  <div className="text-ui-xs text-text-secondary space-y-1">
                    <div className="flex justify-between"><span>Adapter:</span><span className="text-text-primary font-mono">{storageInfo.adapterName}</span></div>
                    <div className="flex justify-between"><span>Type:</span><span className="text-text-primary font-mono">{storageInfo.adapterType}</span></div>
                    <div className="flex justify-between"><span>Direct File Access:</span><span className="text-text-primary font-mono">{storageInfo.capabilities.directFileAccess ? 'Yes' : 'No'}</span></div>
                    <div className="flex justify-between"><span>Persistent Workspace:</span><span className="text-text-primary font-mono">{storageInfo.capabilities.persistentWorkspace ? 'Yes' : 'No'}</span></div>
                  </div>
                ) : (
                  <p className="text-ui-xs text-text-disabled">No storage adapter detected</p>
                )}
              </div>

              {/* Recent Projects */}
              <div className="bg-surface-alt rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-ui-xs font-medium text-text-primary">Recent Projects</span>
                  <span className="text-ui-xs text-text-disabled">{recentProjects} items</span>
                </div>
                <button
                  onClick={handleClearRecent}
                  className="text-ui-xs px-2 py-1 rounded-sm border border-border bg-surface hover:bg-panel-hover text-text-secondary cursor-pointer"
                >
                  Clear Recent Projects
                </button>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-900/10 border border-red-700/20 rounded-md p-3 space-y-2">
                <span className="text-ui-xs font-medium text-[#ff5c5c]">Danger Zone</span>
                <p className="text-ui-xs text-text-secondary">
                  Clear all stored data including projects, assets, and settings.
                </p>
                <button
                  onClick={handleClearAllData}
                  className="text-ui-xs px-2 py-1 rounded-sm border border-[#ff5c5c]/30 bg-transparent hover:bg-[#ff5c5c]/10 text-[#ff5c5c] cursor-pointer"
                >
                  Clear All IndexedDB Data
                </button>
              </div>
            </>
          )}

          {activeTab === 'general' && (
            <div className="text-ui-xs text-text-disabled text-center py-8">
              General preferences coming in Phase 10
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="text-ui-xs text-text-disabled text-center py-8">
              Appearance preferences coming in Phase 10
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-ui-xs rounded-sm border border-border bg-surface text-text-secondary hover:bg-panel-hover cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreferencesDialog;
