import React from 'react';
import { Section, PropRow } from './Section';
import { NumberInput } from './inputs/NumberInput';
import { ColorInput } from './inputs/ColorInput';
import { useCompositionStore } from '../../../state/compositionStore';

export const CompSection: React.FC = () => {
  const comp = useCompositionStore((s) => {
    const id = s.activeCompositionId;
    return id ? s.compositions.find((c) => c.id === id) ?? null : null;
  });

  if (!comp) return null;

  return (
    <Section label="Composition">
      <PropRow label="Name">
        <input
          type="text" value={comp.name}
          onChange={(e) => useCompositionStore.getState().updateComposition(comp.id, { name: e.target.value })}
          className="w-full h-[18px] text-ui-xs px-1 bg-surface border border-border rounded-sm text-text-primary outline-none focus:border-accent"
        />
      </PropRow>
      <PropRow label="Width">
        <NumberInput value={comp.width} onChange={(v) => useCompositionStore.getState().updateComposition(comp.id, { width: v })} min={64} max={8192} step={1} precision={0} />
      </PropRow>
      <PropRow label="Height">
        <NumberInput value={comp.height} onChange={(v) => useCompositionStore.getState().updateComposition(comp.id, { height: v })} min={64} max={8192} step={1} precision={0} />
      </PropRow>
      <PropRow label="FPS">
        <NumberInput value={comp.fps} onChange={(v) => useCompositionStore.getState().updateComposition(comp.id, { fps: v })} min={1} max={120} step={1} precision={0} />
      </PropRow>
      <PropRow label="Duration">
        <NumberInput value={comp.duration} onChange={(v) => useCompositionStore.getState().updateComposition(comp.id, { duration: v })} min={1} step={1} precision={0} />
      </PropRow>
      <PropRow label="Bg Color">
        <ColorInput value={comp.backgroundColor} onChange={(v) => useCompositionStore.getState().updateComposition(comp.id, { backgroundColor: v })} />
      </PropRow>
    </Section>
  );
};
