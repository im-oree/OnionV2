/**
 * NewCompositionDialog — modal dialog for creating a new composition.
 * Fields: Name, Width, Height, Frame Rate, Duration, Background Color.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useCompositionStore } from '../../state/compositionStore';
import { COMPOSITION, FRAME_RATES } from '../../config/constants';

const DEF_W = COMPOSITION.DEFAULT_WIDTH;
const DEF_H = COMPOSITION.DEFAULT_HEIGHT;
const DEF_FPS = COMPOSITION.DEFAULT_FPS;
const DEF_DUR = COMPOSITION.DEFAULT_DURATION;

interface NewCompositionDialogProps {
  open: boolean;
  onClose: () => void;
}

export const NewCompositionDialog: React.FC<NewCompositionDialogProps> = ({
  open,
  onClose,
}) => {
  const addComposition = useCompositionStore((s) => s.addComposition);

  const [name, setName] = useState('New Composition');
  const [width, setWidth] = useState<number>(DEF_W);
  const [height, setHeight] = useState<number>(DEF_H);
  const [fps, setFps] = useState<number>(DEF_FPS);
  const [duration, setDuration] = useState<number>(DEF_DUR);
  const [bgColor, setBgColor] = useState('#000000');

  const nameRef = useRef<HTMLInputElement>(null);

  // Focus name input when dialog opens
  useEffect(() => {
    if (open) {
      setName('New Composition');
      setWidth(COMPOSITION.DEFAULT_WIDTH);
      setHeight(COMPOSITION.DEFAULT_HEIGHT);
      setFps(COMPOSITION.DEFAULT_FPS);
      setDuration(COMPOSITION.DEFAULT_DURATION);
      setBgColor('#000000');
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      addComposition({
        name: name || 'New Composition',
        width: Math.max(COMPOSITION.MIN_SIZE, Math.min(COMPOSITION.MAX_SIZE, width)),
        height: Math.max(COMPOSITION.MIN_SIZE, Math.min(COMPOSITION.MAX_SIZE, height)),
        fps,
        duration: Math.max(1, duration),
        backgroundColor: bgColor,
      });
      onClose();
    },
    [name, width, height, fps, duration, bgColor, addComposition, onClose],
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-[var(--color-bg-overlay)]"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-panel rounded-md shadow-modal border border-border min-w-[320px] max-w-[400px]"
        role="dialog"
        aria-modal="true"
        aria-label="New Composition"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <h2 className="text-ui-sm font-medium text-text-primary">New Composition</h2>
          <button
            className="border-0 bg-transparent text-text-disabled cursor-pointer hover:text-text-primary text-ui-sm"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-3 space-y-3">
          {/* Name */}
          <div className="flex items-center gap-2">
            <label className="text-ui-xs text-text-secondary w-16 shrink-0">Name</label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 h-6 text-ui-xs px-2"
              placeholder="My Composition"
            />
          </div>

          {/* Width / Height */}
          <div className="flex items-center gap-2">
            <label className="text-ui-xs text-text-secondary w-16 shrink-0">Size</label>
            <div className="flex items-center gap-1 flex-1">
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-16 h-6 text-ui-xs px-1 text-center"
                min={COMPOSITION.MIN_SIZE}
                max={COMPOSITION.MAX_SIZE}
              />
              <span className="text-text-disabled text-ui-xs">×</span>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-16 h-6 text-ui-xs px-1 text-center"
                min={COMPOSITION.MIN_SIZE}
                max={COMPOSITION.MAX_SIZE}
              />
              <span className="text-text-muted text-ui-xs">px</span>
            </div>
          </div>

          {/* Preset sizes */}
          <div className="flex gap-1 ml-18">
            {[
              { label: 'HD', w: 1280, h: 720 },
              { label: 'FHD', w: 1920, h: 1080 },
              { label: '2K', w: 2560, h: 1440 },
              { label: '4K', w: 3840, h: 2160 },
              { label: 'Square', w: 1080, h: 1080 },
              { label: 'Vertical', w: 1080, h: 1920 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={[
                  'px-1.5 py-0.5 text-ui-xs rounded-sm border cursor-pointer transition-colors',
                  width === preset.w && height === preset.h
                    ? 'bg-accent text-white border-accent'
                    : 'bg-transparent text-text-secondary border-border hover:bg-panel-hover',
                ].join(' ')}
                onClick={() => {
                  setWidth(preset.w);
                  setHeight(preset.h);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Frame Rate */}
          <div className="flex items-center gap-2">
            <label className="text-ui-xs text-text-secondary w-16 shrink-0">Frame Rate</label>
            <select
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              className="flex-1 h-6 text-ui-xs px-1 bg-panel-input border border-border rounded-sm text-text-primary"
            >
              {FRAME_RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate} fps
                </option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2">
            <label className="text-ui-xs text-text-secondary w-16 shrink-0">Duration</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-16 h-6 text-ui-xs px-1 text-center"
                min={1}
                max={9999}
              />
              <span className="text-text-disabled text-ui-xs">seconds</span>
            </div>
          </div>

          {/* Background Color */}
          <div className="flex items-center gap-2">
            <label className="text-ui-xs text-text-secondary w-16 shrink-0">Bg Color</label>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-8 h-6 p-0 border border-border rounded-sm cursor-pointer bg-transparent"
            />
            <span className="text-ui-xs text-text-disabled font-mono">{bgColor}</span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              className="px-3 py-1 text-ui-xs border border-border rounded-sm bg-transparent text-text-secondary cursor-pointer hover:bg-panel-hover"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-ui-xs border border-accent rounded-sm bg-accent text-white cursor-pointer hover:bg-accent-hover"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
