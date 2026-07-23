/**
 * MaskShapeLibrary — grid of mask shape icons users click to add or
 * change the current mask's shape.
 */
import React from 'react';
import type { MaskShapeType } from '../../../../types/mask';

interface Props {
  activeShape?: MaskShapeType;
  onPick: (shape: MaskShapeType) => void;
}

interface ShapeDef {
  id: MaskShapeType;
  label: string;
  icon: React.ReactNode;
}

const SHAPES: ShapeDef[] = [
  {
    id: 'split',
    label: 'Split',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="4" width="10" height="20" rx="1"
          fill="rgba(255,255,255,0.9)" stroke="currentColor" strokeWidth="1"/>
        <rect x="16" y="4" width="8" height="20" rx="1"
          fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2"/>
      </svg>
    ),
  },
  {
    id: 'filmstrip',
    label: 'Filmstrip',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        {[0, 6, 12, 18].map(x => (
          <rect key={x} x={4 + x * 0.28} y="6" width="3" height="16" rx="0.5"
            fill="rgba(255,255,255,0.9)" stroke="currentColor" strokeWidth="0.5"/>
        ))}
      </svg>
    ),
  },
  {
    id: 'circle',
    label: 'Circle',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="10"
          fill="rgba(255,255,255,0.9)" stroke="currentColor" strokeWidth="1"/>
      </svg>
    ),
  },
  {
    id: 'rectangle',
    label: 'Rectangle',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="6" width="20" height="16" rx="1.5"
          fill="rgba(255,255,255,0.9)" stroke="currentColor" strokeWidth="1"/>
      </svg>
    ),
  },
  {
    id: 'star',
    label: 'Stars',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <polygon points="14,4 17,11 24,11 18,15 20,22 14,18 8,22 10,15 4,11 11,11"
          fill="rgba(255,255,255,0.9)" stroke="currentColor" strokeWidth="1"/>
      </svg>
    ),
  },
  {
    id: 'heart',
    label: 'Heart',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 24 L5 15 A5 5 0 0 1 14 9 A5 5 0 0 1 23 15 Z"
          fill="rgba(255,255,255,0.9)" stroke="currentColor" strokeWidth="1"
          strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'text',
    label: 'Text',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M6 8 L14 8 L22 8" />
        <path d="M14 8 L14 22" />
        <path d="M10 22 L18 22" />
      </svg>
    ),
  },
  {
    id: 'brush',
    label: 'Brush',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 22 C8 20, 10 18, 14 14 L20 8" />
        <path d="M18 6 L22 10 L20 12 L16 8 Z" fill="rgba(255,255,255,0.9)"/>
        <path d="M6 22 L4 24" />
      </svg>
    ),
  },
  {
    id: 'pen',
    label: 'Pen',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 22 L10 18 L14 20 L20 6 L22 8 L16 22 L14 20" fill="rgba(255,255,255,0.9)"/>
        <circle cx="20" cy="6" r="1" fill="currentColor"/>
      </svg>
    ),
  },
];

export const MaskShapeLibrary: React.FC<Props> = ({ activeShape, onPick }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 6,
      padding: '4px 0',
    }}>
      {SHAPES.map(shape => {
        const active = activeShape === shape.id ||
          (shape.id === 'circle' && activeShape === 'ellipse');
        return (
          <button
            key={shape.id}
            onClick={() => onPick(shape.id)}
            title={shape.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '8px 4px',
              background: active ? 'var(--color-accent-muted)' : 'var(--color-input-bg)',
              border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: 6,
              color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 500,
              transition: 'all 120ms',
            }}
            onMouseEnter={(e) => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-input-bg)';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)';
              }
            }}
          >
            {shape.icon}
            <span>{shape.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default MaskShapeLibrary;