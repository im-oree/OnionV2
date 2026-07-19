import React from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';

export const InfoPanel: React.FC = () => {
  const comp = useCompositionStore((s) => s.activeCompositionId ? s.compositions.find((c) => c.id === s.activeCompositionId) ?? null : null);
  const selected = useSelectionStore((s) => s.selected.filter((x) => x.type === 'layer'));

  if (!comp) {
    return <div className="p-4" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-disabled)' }}>No composition active</div>;
  }

  return (
    <div className="p-4 space-y-3">
      <Row label="Composition" value={comp.name} />
      <Row label="Size" value={`${comp.width} × ${comp.height}`} />
      <Row label="FPS" value={String(comp.fps)} />
      <Row label="Duration" value={`${comp.duration}s`} />
      <Row label="Frame" value={`${Math.round(comp.currentTime * comp.fps)}/${Math.round(comp.duration * comp.fps)}`} />
      <div className="h-px my-3" style={{ background: 'var(--color-divider)' }} />
      <Row label="Layers" value={String(comp.layers.length)} />
      <Row label="Selected" value={String(selected.length)} />
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between gap-3" style={{ fontSize: 'var(--font-size-sm)' }}>
    <span style={{ color: 'var(--color-text-tertiary)' }}>{label}</span>
    <span className="font-mono" style={{ color: 'var(--color-text-primary)' }}>{value}</span>
  </div>
);

export default InfoPanel;