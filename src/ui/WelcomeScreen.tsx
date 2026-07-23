import React, { useState, useEffect, useCallback } from 'react';
import { FolderOpen, Film } from 'lucide-react';
import { openNewCompositionDialog, openWorkspacePicker } from './dialogs/DialogManager';
import { useRecentProjectsStore, type RecentProjectEntry } from '../state/recentProjectsStore';
import { useCompositionStore } from '../state/compositionStore';
import { StorageManager } from '../storage/StorageManager';
import { useNotificationStore } from '../state/notificationStore';
import { openImportFilePicker } from '../utils/unifiedImport';
import { assetManager } from '../storage/AssetManager';
import { createLayerInstance } from '../utils/createLayerInstance';
import { useSelectionStore } from '../state/selectionStore';

// ── Icons ──────────────────────────────────────────────────────

const FilmIcon: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 8h32c2.2 0 4 1.8 4 4v40c0 2.2-1.8 4-4 4H16c-2.2 0-4-1.8-4-4V12c0-2.2 1.8-4 4-4z" />
    <line x1="20" y1="12" x2="20" y2="52" />
    <line x1="44" y1="12" x2="44" y2="52" />
    <line x1="12" y1="20" x2="20" y2="20" />
    <line x1="12" y1="30" x2="20" y2="30" />
    <line x1="12" y1="40" x2="20" y2="40" />
    <line x1="12" y1="50" x2="20" y2="50" />
    <line x1="44" y1="20" x2="52" y2="20" />
    <line x1="44" y1="30" x2="52" y2="30" />
    <line x1="44" y1="40" x2="52" y2="40" />
    <line x1="44" y1="50" x2="52" y2="50" />
  </svg>
);

const FilmFromFootageIcon: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg
    width={size + 12}
    height={size}
    viewBox="0 0 76 64"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Left "footage" film reel silhouette */}
    <path d="M4 12h20c1.5 0 3 1.3 3 3v34c0 1.7-1.5 3-3 3H4c-1.5 0-3-1.3-3-3V15c0-1.7 1.5-3 3-3z"
      opacity={0.5} />
    <line x1="6" y1="18" x2="10" y2="18" opacity={0.5} />
    <line x1="6" y1="26" x2="10" y2="26" opacity={0.5} />
    <line x1="6" y1="34" x2="10" y2="34" opacity={0.5} />
    <line x1="6" y1="42" x2="10" y2="42" opacity={0.5} />

    {/* Main composition on top-right */}
    <path d="M28 8h32c2.2 0 4 1.8 4 4v40c0 2.2-1.8 4-4 4H28c-2.2 0-4-1.8-4-4V12c0-2.2 1.8-4 4-4z" />
    <line x1="32" y1="12" x2="32" y2="52" />
    <line x1="56" y1="12" x2="56" y2="52" />
    <line x1="24" y1="20" x2="32" y2="20" />
    <line x1="24" y1="30" x2="32" y2="30" />
    <line x1="24" y1="40" x2="32" y2="40" />
    <line x1="24" y1="50" x2="32" y2="50" />
    <line x1="56" y1="20" x2="64" y2="20" />
    <line x1="56" y1="30" x2="64" y2="30" />
    <line x1="56" y1="40" x2="64" y2="40" />
    <line x1="56" y1="50" x2="64" y2="50" />
  </svg>
);

// ── AE-style hero card ─────────────────────────────────────────

const HeroCard: React.FC<{
  icon: React.ReactNode;
  label: React.ReactNode;
  onClick: () => void;
}> = ({ icon, label, onClick }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 260,
        height: 200,
        background: hover
          ? 'rgba(70,80,110,0.22)'
          : 'rgba(50,55,72,0.35)',
        border: `1px solid ${hover ? 'rgba(120,140,200,0.5)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        cursor: 'pointer',
        transition: 'background 150ms ease, border-color 150ms ease, transform 100ms ease',
        color: hover ? 'rgba(200,215,255,0.95)' : 'rgba(170,180,200,0.85)',
        fontFamily: 'system-ui, sans-serif',
        transform: hover ? 'translateY(-1px)' : 'translateY(0)',
        boxShadow: hover ? '0 6px 20px rgba(0,0,0,0.35)' : '0 2px 6px rgba(0,0,0,0.15)',
      }}
    >
      <div style={{
        color: 'inherit',
        opacity: 0.85,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div style={{
        fontSize: 13,
        fontWeight: 400,
        letterSpacing: '0.02em',
        textAlign: 'center',
        lineHeight: 1.4,
      }}>
        {label}
      </div>
    </button>
  );
};

// ── Main WelcomeScreen ─────────────────────────────────────────

export const WelcomeScreen: React.FC = () => {
  const recentProjects = useRecentProjectsStore((s) => s.projects);
  const loadPersisted = useRecentProjectsStore((s) => s.loadPersisted);
  const clearAll = useRecentProjectsStore((s) => s.clearAll);
  const addNotif = useNotificationStore((s) => s.addNotification);
  const addComposition = useCompositionStore((s) => s.addComposition);
  const compositions = useCompositionStore((s) => s.compositions);

  const [hasWorkspace, setHasWorkspace] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);

  useEffect(() => {
    loadPersisted();
    checkWorkspace();
  }, []);

  const checkWorkspace = async () => {
    setHasWorkspace(await StorageManager.getInstance().hasWorkspace());
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasWorkspace) checkWorkspace();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = () => {
      setHasWorkspace(true);
      checkWorkspace();
    };
    document.addEventListener('workspace:picked', handler);
    document.addEventListener('workspace:restored', handler);
    return () => {
      document.removeEventListener('workspace:picked', handler);
      document.removeEventListener('workspace:restored', handler);
    };
  }, []);

  const handleOpenProject = async (entry: RecentProjectEntry) => {
    try {
      await StorageManager.getInstance().load(entry.handle);
      addNotif({
        type: 'success',
        message: `Opened "${entry.name}"`,
        autoDismiss: 3000,
      });
    } catch {
      addNotif({
        type: 'error',
        message: `Failed to open "${entry.name}" — project may have been moved.`,
      });
    }
  };

  const handleOpenFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.onion,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const handle = {
          id: `file_${Date.now()}`,
          name: file.name.replace(/\.(onion|json)$/, ''),
          adapterType: 'download' as const,
          internal: { file },
        };
        await StorageManager.getInstance().load(handle as any);
        addNotif({
          type: 'success',
          message: `Opened "${file.name}"`,
          autoDismiss: 3000,
        });
      } catch {
        addNotif({
          type: 'error',
          message: 'Failed to open project file.',
        });
      }
    };
    input.click();
  };

  // ── "New Composition" → open custom composition dialog ─────
  const handleNewComposition = () => {
    openNewCompositionDialog();
  };

  // ── "New Composition From Footage" → import → create comp → add layer ──
  const handleNewFromFootage = useCallback(async () => {
    // Restrict picker to video + image only for "from footage"
    const result = await openImportFilePicker({
      accept: 'image/*,video/*,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.mp4,.webm,.mov,.avi,.mkv,.m4v',
      multiple: false,
      addToTimeline: false,
    });

    if (result.imported === 0) return;

    // Find the newly imported asset (image or video)
    const importedAsset = result.results.find(
      (r) => r.asset && (r.asset.type === 'image' || r.asset.type === 'video'),
    )?.asset;

    if (!importedAsset) {
      addNotif({
        type: 'warning',
        message: 'Please select a video or image file.',
        autoDismiss: 3000,
      });
      return;
    }

    // Create a composition sized to the footage
    const width = importedAsset.naturalWidth || 1920;
    const height = importedAsset.naturalHeight || 1080;
    const duration = importedAsset.type === 'video'
      ? Math.max(1, Math.ceil(importedAsset.duration ?? 10))
      : 5; // 5-second default for stills
    const fps = 30;

    const newComp = addComposition({
      name: importedAsset.name.replace(/\.[^.]+$/, ''),
      width,
      height,
      fps,
      duration,
      backgroundColor: '#000000',
    });

    // Create matching layer + place it in the new comp
    const layerType = importedAsset.type === 'video' ? 'video' : 'image';
    const layer = createLayerInstance(layerType, newComp, {
      name: importedAsset.name,
      startFrame: 0,
      endFrame: Math.floor(duration * fps),
      data: layerType === 'video'
        ? {
            assetId: importedAsset.id,
            naturalWidth: width,
            naturalHeight: height,
            duration: importedAsset.duration ?? 10,
            muted: false,
            volume: 1,
            playbackRate: 1,
          }
        : {
            assetId: importedAsset.id,
            naturalWidth: width,
            naturalHeight: height,
          },
    });

    useCompositionStore.getState().addLayer(newComp.id, layer);
    useSelectionStore.getState().select({
      type: 'layer',
      id: layer.id,
      compositionId: newComp.id,
    });

    addNotif({
      type: 'success',
      message: `Created "${newComp.name}" (${width}×${height}) from footage`,
      autoDismiss: 3000,
    });
  }, [addComposition, addNotif]);

  const displayProjects = showAllRecent
    ? recentProjects.slice(0, 12)
    : recentProjects.slice(0, 4);

  // ── Common styles ──────────────────────────────────────────

  const outerContainerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: 'var(--color-app-bg, #1a1c22)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    overflow: 'auto',
  };

  const primaryBtn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 22px',
    fontSize: 13,
    fontWeight: 500,
    background: 'var(--color-accent, #5865ff)',
    color: '#fff',
    borderRadius: 6,
    border: 0,
    cursor: 'pointer',
    transition: 'background 150ms ease',
    fontFamily: 'system-ui, sans-serif',
  };

  const secondaryBtn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    fontSize: 13,
    fontWeight: 500,
    background: 'rgba(60,65,80,0.5)',
    color: 'rgba(220,225,240,0.9)',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.08)',
    cursor: 'pointer',
    transition: 'background 150ms ease',
    fontFamily: 'system-ui, sans-serif',
  };

  // ── State 1: No workspace picked yet ───────────────────────

  if (!hasWorkspace) {
    return (
      <div style={outerContainerStyle}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            maxWidth: 480,
            textAlign: 'center',
            padding: 24,
          }}
        >
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(88,101,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Film size={28} strokeWidth={1.75} style={{ color: '#8b95ff' }} />
          </div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 600,
            color: 'rgba(240,245,255,0.95)',
            letterSpacing: '-0.02em',
            margin: 0,
            fontFamily: 'system-ui, sans-serif',
          }}>
            Welcome to Onion
          </h1>
          <p style={{
            fontSize: 13,
            color: 'rgba(170,180,200,0.85)',
            lineHeight: 1.6,
            maxWidth: 380,
            margin: 0,
            fontFamily: 'system-ui, sans-serif',
          }}>
            Before you can start creating, Onion needs a workspace folder to
            store your projects and assets.
          </p>
          <button
            onClick={openWorkspacePicker}
            style={primaryBtn}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--color-accent-hover, #6b78ff)'}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--color-accent, #5865ff)'}
          >
            <FolderOpen size={16} strokeWidth={2} /> Pick Workspace Folder
          </button>
          <button
            onClick={handleOpenFile}
            style={secondaryBtn}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(70,75,95,0.6)'}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(60,65,80,0.5)'}
          >
            <FolderOpen size={14} strokeWidth={1.75} /> Open existing project file
          </button>
          <p style={{
            fontSize: 11,
            color: 'rgba(130,140,160,0.7)',
            margin: 0,
            fontFamily: 'system-ui, sans-serif',
          }}>
            Your workspace folder can be changed later in Preferences.
          </p>
        </div>
      </div>
    );
  }

  // ── State 2: Workspace ready, no compositions → AE hero cards ──

  if (compositions.length === 0) {
    return (
      <div style={outerContainerStyle}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 40,
            padding: '40px 24px',
            maxWidth: 700,
          }}
        >
          {/* Hero cards row */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>
            <HeroCard
              icon={<FilmIcon size={56} />}
              label="New Composition"
              onClick={handleNewComposition}
            />
            <HeroCard
              icon={<FilmFromFootageIcon size={56} />}
              label={<>New Composition<br />From Footage</>}
              onClick={handleNewFromFootage}
            />
          </div>

          {/* Open project link */}
          <button
            onClick={handleOpenFile}
            style={{
              ...secondaryBtn,
              padding: '8px 16px',
              fontSize: 12,
            }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(70,75,95,0.6)'}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(60,65,80,0.5)'}
          >
            <FolderOpen size={13} strokeWidth={1.75} /> Open Project
          </button>

          {/* Recent projects */}
          {recentProjects.length > 0 && (
            <div style={{
              width: '100%',
              maxWidth: 540,
              marginTop: 8,
              paddingTop: 24,
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              <h3 style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(150,160,180,0.7)',
                margin: '0 0 12px 0',
                textAlign: 'center',
                fontFamily: 'system-ui, sans-serif',
              }}>
                Recent Projects
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 8,
              }}>
                {displayProjects.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => handleOpenProject(entry)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: 10,
                      background: 'rgba(50,55,72,0.4)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 4,
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background 150ms ease',
                      fontFamily: 'system-ui, sans-serif',
                    }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(70,75,95,0.5)'}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(50,55,72,0.4)'}
                  >
                    {entry.thumbnail ? (
                      <img
                        src={entry.thumbnail}
                        alt=""
                        style={{
                          width: 36,
                          height: 24,
                          borderRadius: 3,
                          objectFit: 'cover',
                          flexShrink: 0,
                          marginTop: 2,
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      />
                    ) : (
                      <Film
                        size={14}
                        strokeWidth={1.75}
                        style={{ color: '#8b95ff', flexShrink: 0, marginTop: 3 }}
                      />
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: 12,
                        color: 'rgba(220,225,240,0.9)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {entry.name}
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: 'rgba(130,140,160,0.7)',
                        marginTop: 2,
                      }}>
                        {entry.lastOpened
                          ? new Date(entry.lastOpened).toLocaleDateString()
                          : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 10,
              }}>
                {recentProjects.length > 4 ? (
                  <button
                    onClick={() => setShowAllRecent(!showAllRecent)}
                    style={{
                      border: 0,
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: 11,
                      color: '#8b95ff',
                      fontFamily: 'system-ui, sans-serif',
                    }}
                  >
                    {showAllRecent
                      ? 'Show less'
                      : `Show all (${recentProjects.length})`}
                  </button>
                ) : <span />}
                <button
                  onClick={clearAll}
                  style={{
                    border: 0,
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 10,
                    color: 'rgba(130,140,160,0.6)',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  Clear recent
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default WelcomeScreen;