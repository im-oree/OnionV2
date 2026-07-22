/**
 * NewCompositionDialog — modal dialog for creating a new composition.
 * Compact layout with preset dropdown and validated inputs.
 */
import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useLayoutEffect,
} from 'react';
import { X, ChevronDown, Check } from 'lucide-react';
import { useCompositionStore } from '../../state/compositionStore';
import { COMPOSITION, FRAME_RATES } from '../../config/constants';
import {
  COMPOSITION_PRESETS,
  type CompPreset,
} from '../../config/compositionPresets';

const DEF_W = COMPOSITION.DEFAULT_WIDTH;
const DEF_H = COMPOSITION.DEFAULT_HEIGHT;
const DEF_FPS = COMPOSITION.DEFAULT_FPS;
const DEF_DUR = COMPOSITION.DEFAULT_DURATION;

// Extended fps options — user can also type custom
const EXTENDED_FPS = Array.from(
  new Set([...FRAME_RATES, 24, 25, 30, 48, 50, 60, 90, 120, 144, 240]),
).sort((a, b) => a - b);

interface NewCompositionDialogProps {
  open: boolean;
  onClose: () => void;
}

// ── Preset Dropdown ──────────────────────────────────────────

const PresetDropdown: React.FC<{
  selectedPreset: string;
  onSelect: (preset: CompPreset) => void;
}> = ({ selectedPreset, onSelect }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const current = COMPOSITION_PRESETS.find((p) => p.id === selectedPreset);
  const label = current ? current.label : 'Custom';

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !menuRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Group presets by category for cleaner display
  const grouped = useMemo(() => {
    const groups: Record<string, CompPreset[]> = {};
    for (const p of COMPOSITION_PRESETS) {
      if (p.id === 'custom') continue;
      const cat = (p as any).category ?? 'Standard';
      (groups[cat] = groups[cat] || []).push(p);
    }
    return groups;
  }, []);

  return (
    <div className="relative flex-1">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-6 text-ui-xs px-2 flex items-center justify-between bg-[var(--color-bg-input)] border border-border rounded-sm text-text-primary cursor-pointer hover:bg-panel-hover transition-colors"
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          size={11}
          strokeWidth={1.75}
          style={{
            color: 'var(--color-text-tertiary)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="absolute left-0 right-0 top-full mt-1 z-modal max-h-64 overflow-y-auto rounded-sm shadow-modal"
          style={{
            background: 'var(--color-panel)',
            border: '1px solid var(--color-border)',
          }}
        >
          {Object.entries(grouped).map(([category, presets]) => (
            <div key={category}>
              <div
                style={{
                  padding: '4px 8px 2px',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                  color: 'var(--color-text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: 'var(--color-panel-raised)',
                }}
              >
                {category}
              </div>
              {presets.map((preset) => {
                const isActive = preset.id === selectedPreset;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onSelect(preset);
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1 text-ui-xs cursor-pointer text-left transition-colors"
                    style={{
                      color: isActive
                        ? 'var(--color-accent)'
                        : 'var(--color-text-primary)',
                      background: isActive
                        ? 'var(--color-accent-muted)'
                        : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background =
                          'var(--color-panel-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background =
                          'transparent';
                      }
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isActive && <Check size={10} strokeWidth={2.5} />}
                    </span>
                    <span className="flex-1 truncate">{preset.label}</span>
                    <span
                      style={{
                        fontFamily: 'var(--font-family-mono)',
                        color: 'var(--color-text-tertiary)',
                        fontSize: 10,
                      }}
                    >
                      {preset.width}×{preset.height} · {preset.fps}fps
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── FPS Dropdown (with custom value support) ────────────────

const FpsDropdown: React.FC<{
  fps: number;
  onChange: (fps: number) => void;
}> = ({ fps, onChange }) => {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState(String(fps));
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !menuRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
        setCustomMode(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    setCustomValue(String(fps));
  }, [fps]);

  const commitCustom = () => {
    const n = Number(customValue);
    if (Number.isFinite(n) && n > 0 && n <= 1000) {
      onChange(Math.round(n * 100) / 100);
    }
    setCustomMode(false);
    setOpen(false);
  };

  return (
    <div className="relative flex-1">
      {customMode ? (
        <input
          type="number"
          value={customValue}
          autoFocus
          min={1}
          max={1000}
          step={0.001}
          onChange={(e) => setCustomValue(e.target.value)}
          onBlur={commitCustom}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitCustom();
            } else if (e.key === 'Escape') {
              setCustomMode(false);
              setCustomValue(String(fps));
            }
          }}
          className="w-full h-6 text-ui-xs px-2 bg-[var(--color-bg-input)] border rounded-sm text-text-primary outline-none"
          style={{ borderColor: 'var(--color-border-focus)' }}
        />
      ) : (
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full h-6 text-ui-xs px-2 flex items-center justify-between bg-[var(--color-bg-input)] border border-border rounded-sm text-text-primary cursor-pointer hover:bg-panel-hover transition-colors"
        >
          <span>{fps} fps</span>
          <ChevronDown
            size={11}
            strokeWidth={1.75}
            style={{
              color: 'var(--color-text-tertiary)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
            }}
          />
        </button>
      )}

      {open && !customMode && (
        <div
          ref={menuRef}
          className="absolute left-0 right-0 top-full mt-1 z-modal max-h-56 overflow-y-auto rounded-sm shadow-modal"
          style={{
            background: 'var(--color-panel)',
            border: '1px solid var(--color-border)',
          }}
        >
          {EXTENDED_FPS.map((rate) => {
            const isActive = rate === fps;
            return (
              <button
                key={rate}
                type="button"
                onClick={() => {
                  onChange(rate);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1 text-ui-xs cursor-pointer text-left transition-colors"
                style={{
                  color: isActive
                    ? 'var(--color-accent)'
                    : 'var(--color-text-primary)',
                  background: isActive
                    ? 'var(--color-accent-muted)'
                    : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background =
                      'var(--color-panel-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background =
                      'transparent';
                  }
                }}
              >
                <span
                  style={{
                    width: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isActive && <Check size={10} strokeWidth={2.5} />}
                </span>
                <span className="flex-1">{rate} fps</span>
              </button>
            );
          })}
          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              padding: 0,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setCustomMode(true);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-2 py-1 text-ui-xs cursor-pointer text-left transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  'var(--color-panel-hover)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  'transparent';
              }}
            >
              <span style={{ width: 12 }} />
              <span className="flex-1">Custom...</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main dialog ──────────────────────────────────────────────

export const NewCompositionDialog: React.FC<NewCompositionDialogProps> = ({
  open,
  onClose,
}) => {
  const addComposition = useCompositionStore((s) => s.addComposition);

  const [name, setName] = useState('New Composition');
  const [width, setWidth] = useState<number>(DEF_W);
  const [height, setHeight] = useState<number>(DEF_H);
  const [widthStr, setWidthStr] = useState(String(DEF_W));
  const [heightStr, setHeightStr] = useState(String(DEF_H));
  const [fps, setFps] = useState<number>(DEF_FPS);
  const [duration, setDuration] = useState<number>(DEF_DUR);
  const [durationStr, setDurationStr] = useState(String(DEF_DUR));
  const [bgColor, setBgColor] = useState('#000000');
  const [selectedPreset, setSelectedPreset] = useState<string>('fhd');

  const nameRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  // Focus on open + reset state
  useLayoutEffect(() => {
    if (!open) return;

    setName('New Composition');
    setWidth(DEF_W);
    setHeight(DEF_H);
    setWidthStr(String(DEF_W));
    setHeightStr(String(DEF_H));
    setFps(DEF_FPS);
    setDuration(DEF_DUR);
    setDurationStr(String(DEF_DUR));
    setBgColor('#000000');
    setSelectedPreset('fhd');

    // Use requestAnimationFrame instead of setTimeout for reliability
    const raf = requestAnimationFrame(() => {
      nameRef.current?.focus();
      nameRef.current?.select();
    });

    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Escape key globally
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus trap
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Apply preset — batches state updates in a single render
  const applyPreset = useCallback((preset: CompPreset) => {
    setWidth(preset.width);
    setHeight(preset.height);
    setWidthStr(String(preset.width));
    setHeightStr(String(preset.height));
    setFps(preset.fps);
    setSelectedPreset(preset.id);
  }, []);

  // Detect preset match — includes fps
  const detectPreset = useCallback(
    (w: number, h: number, f: number): string => {
      const match = COMPOSITION_PRESETS.find(
        (p) => p.width === w && p.height === h && p.fps === f,
      );
      return match ? match.id : 'custom';
    },
    [],
  );

  const handleWidthBlur = useCallback(() => {
    const n = Number(widthStr);
    const clamped = Number.isFinite(n)
      ? Math.max(COMPOSITION.MIN_SIZE, Math.min(COMPOSITION.MAX_SIZE, Math.floor(n)))
      : DEF_W;
    setWidth(clamped);
    setWidthStr(String(clamped));
    setSelectedPreset(detectPreset(clamped, height, fps));
  }, [widthStr, height, fps, detectPreset]);

  const handleHeightBlur = useCallback(() => {
    const n = Number(heightStr);
    const clamped = Number.isFinite(n)
      ? Math.max(COMPOSITION.MIN_SIZE, Math.min(COMPOSITION.MAX_SIZE, Math.floor(n)))
      : DEF_H;
    setHeight(clamped);
    setHeightStr(String(clamped));
    setSelectedPreset(detectPreset(width, clamped, fps));
  }, [heightStr, width, fps, detectPreset]);

  const handleDurationBlur = useCallback(() => {
    const n = Number(durationStr);
    const clamped = Number.isFinite(n) && n > 0
      ? Math.max(1, Math.min(9999, n))
      : DEF_DUR;
    setDuration(clamped);
    setDurationStr(String(clamped));
  }, [durationStr]);

  const handleFpsChange = useCallback(
    (newFps: number) => {
      setFps(newFps);
      setSelectedPreset(detectPreset(width, height, newFps));
    },
    [width, height, detectPreset],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      // Ensure all inputs are committed
      const w = Number(widthStr);
      const h = Number(heightStr);
      const d = Number(durationStr);

      const finalW = Number.isFinite(w)
        ? Math.max(COMPOSITION.MIN_SIZE, Math.min(COMPOSITION.MAX_SIZE, Math.floor(w)))
        : DEF_W;
      const finalH = Number.isFinite(h)
        ? Math.max(COMPOSITION.MIN_SIZE, Math.min(COMPOSITION.MAX_SIZE, Math.floor(h)))
        : DEF_H;
      const finalD = Number.isFinite(d) && d > 0
        ? Math.max(1, Math.min(9999, d))
        : DEF_DUR;
      const finalFps = Number.isFinite(fps) && fps > 0
        ? fps
        : DEF_FPS;

      const trimmedName = name.trim() || 'New Composition';

      addComposition({
        name: trimmedName,
        width: finalW,
        height: finalH,
        fps: finalFps,
        duration: finalD,
        backgroundColor: bgColor,
      });

      onClose();
    },
    [
      name, widthStr, heightStr, durationStr, fps, bgColor,
      addComposition, onClose,
    ],
  );

  // Backdrop click — only close if mousedown started on backdrop too
  const handleBackdropMouseDown = useCallback(
    (e: React.MouseEvent) => {
      mouseDownTargetRef.current = e.target;
    },
    [],
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (
        e.target === e.currentTarget &&
        mouseDownTargetRef.current === e.currentTarget
      ) {
        onClose();
      }
      mouseDownTargetRef.current = null;
    },
    [onClose],
  );

  if (!open) return null;

  const aspectLabel = useMemo(() => {
    if (width <= 0 || height <= 0) return '';
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const g = gcd(width, height);
    return `${width / g}:${height / g}`;
  }, [width, height]);

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-[var(--color-bg-overlay)]"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="bg-panel rounded-md shadow-modal border border-border"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-comp-title"
        style={{ width: 380, maxHeight: '90vh', overflow: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <h2
            id="new-comp-title"
            className="text-ui-sm font-medium text-text-primary"
          >
            New Composition
          </h2>
          <button
            type="button"
            className="border-0 bg-transparent cursor-pointer p-1 rounded-sm transition-colors"
            style={{ color: 'var(--color-text-tertiary)' }}
            onClick={onClose}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                'var(--color-text-primary)';
              (e.currentTarget as HTMLElement).style.background =
                'var(--color-panel-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                'var(--color-text-tertiary)';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
            aria-label="Close"
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-3 space-y-2.5" noValidate>
          {/* Preset */}
          <div className="flex items-center gap-2">
            <label className="text-ui-xs text-text-secondary w-16 shrink-0">
              Preset
            </label>
            <PresetDropdown
              selectedPreset={selectedPreset}
              onSelect={applyPreset}
            />
          </div>

          {/* Name */}
          <div className="flex items-center gap-2">
            <label className="text-ui-xs text-text-secondary w-16 shrink-0">
              Name
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 h-6 text-ui-xs px-2 bg-[var(--color-bg-input)] border border-border rounded-sm text-text-primary outline-none"
              onFocus={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  'var(--color-border-focus)';
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  'var(--color-border)';
              }}
              placeholder="My Composition"
            />
          </div>

          {/* Size */}
          <div className="flex items-center gap-2">
            <label className="text-ui-xs text-text-secondary w-16 shrink-0">
              Size
            </label>
            <div className="flex items-center gap-1 flex-1">
              <input
                type="number"
                value={widthStr}
                onChange={(e) => setWidthStr(e.target.value)}
                onBlur={handleWidthBlur}
                className="w-16 h-6 text-ui-xs px-1 text-center bg-[var(--color-bg-input)] border border-border rounded-sm text-text-primary outline-none"
                min={COMPOSITION.MIN_SIZE}
                max={COMPOSITION.MAX_SIZE}
              />
              <span className="text-text-disabled text-ui-xs">×</span>
              <input
                type="number"
                value={heightStr}
                onChange={(e) => setHeightStr(e.target.value)}
                onBlur={handleHeightBlur}
                className="w-16 h-6 text-ui-xs px-1 text-center bg-[var(--color-bg-input)] border border-border rounded-sm text-text-primary outline-none"
                min={COMPOSITION.MIN_SIZE}
                max={COMPOSITION.MAX_SIZE}
              />
              <span className="text-text-muted text-ui-xs">px</span>
              {aspectLabel && (
                <span
                  className="ml-auto text-ui-xs"
                  style={{
                    color: 'var(--color-text-tertiary)',
                    fontFamily: 'var(--font-family-mono)',
                  }}
                >
                  {aspectLabel}
                </span>
              )}
            </div>
          </div>

          {/* Frame Rate */}
          <div className="flex items-center gap-2">
            <label className="text-ui-xs text-text-secondary w-16 shrink-0">
              Frame Rate
            </label>
            <FpsDropdown fps={fps} onChange={handleFpsChange} />
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2">
            <label className="text-ui-xs text-text-secondary w-16 shrink-0">
              Duration
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={durationStr}
                onChange={(e) => setDurationStr(e.target.value)}
                onBlur={handleDurationBlur}
                className="w-16 h-6 text-ui-xs px-1 text-center bg-[var(--color-bg-input)] border border-border rounded-sm text-text-primary outline-none"
                min={1}
                max={9999}
              />
              <span className="text-text-disabled text-ui-xs">seconds</span>
              <span
                className="ml-auto text-ui-xs"
                style={{
                  color: 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-family-mono)',
                }}
              >
                {Math.floor(duration * fps)} frames
              </span>
            </div>
          </div>

          {/* Background Color */}
          <div className="flex items-center gap-2">
            <label className="text-ui-xs text-text-secondary w-16 shrink-0">
              Bg Color
            </label>
            <div className="flex items-center gap-2 flex-1">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-8 h-6 p-0 border border-border rounded-sm cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                    setBgColor(v);
                  }
                }}
                onBlur={(e) => {
                  if (!/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                    setBgColor('#000000');
                  }
                }}
                className="w-20 h-6 text-ui-xs px-2 bg-[var(--color-bg-input)] border border-border rounded-sm text-text-primary outline-none"
                style={{ fontFamily: 'var(--font-family-mono)' }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              className="px-3 py-1 text-ui-xs border border-border rounded-sm bg-transparent text-text-secondary cursor-pointer hover:bg-panel-hover transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-ui-xs border border-accent rounded-sm bg-accent text-white cursor-pointer hover:bg-accent-hover transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};