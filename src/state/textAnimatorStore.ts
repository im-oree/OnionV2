import { create } from 'zustand';
import type { TextAnimator, TextAnimatorProperty, AnimatorSelector, AnimatorRangeShape } from '../types/layer';
import { useCompositionStore } from './compositionStore';
import type { TextData } from '../types/layer';

function genId() { return `anim_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }

function makeDefault(idx: number): TextAnimator {
  return {
    id: genId(), name: `Animator ${idx}`, enabled: true,
    selector: 'characters', rangeStart: 0, rangeEnd: 100,
    rangeShape: 'square', randomize: false, randomSeed: 0,
    properties: { opacity: 0, positionY: -30 },
  };
}

interface TAS {
  addAnimator: (compId: string, layerId: string) => void;
  removeAnimator: (compId: string, layerId: string, animId: string) => void;
  updateAnimator: (compId: string, layerId: string, animId: string, patch: Partial<TextAnimator>) => void;
  updateAnimatorProps: (compId: string, layerId: string, animId: string, props: Partial<TextAnimatorProperty>) => void;
  duplicateAnimator: (compId: string, layerId: string, animId: string) => void;
}

function getTextData(compId: string, layerId: string): TextData | null {
  const cs = useCompositionStore.getState();
  const layer = cs.compositions.find(c=>c.id===compId)?.layers.find(l=>l.id===layerId);
  if (!layer || layer.type !== 'text') return null;
  return layer.data as TextData;
}

function patchTextData(compId: string, layerId: string, data: TextData): void {
  useCompositionStore.getState().updateLayer(compId, layerId, { data });
}

export const useTextAnimatorStore = create<TAS>(() => ({
  addAnimator: (compId, layerId) => {
    const data = getTextData(compId, layerId); if (!data) return;
    const anim = makeDefault((data.animators?.length??0)+1);
    patchTextData(compId, layerId, { ...data, animators: [...(data.animators??[]), anim] });
  },
  removeAnimator: (compId, layerId, animId) => {
    const data = getTextData(compId, layerId); if (!data) return;
    patchTextData(compId, layerId, { ...data, animators: (data.animators??[]).filter(a=>a.id!==animId) });
  },
  updateAnimator: (compId, layerId, animId, patch) => {
    const data = getTextData(compId, layerId); if (!data) return;
    patchTextData(compId, layerId, { ...data, animators: (data.animators??[]).map(a=>a.id===animId?{...a,...patch}:a) });
  },
  updateAnimatorProps: (compId, layerId, animId, props) => {
    const data = getTextData(compId, layerId); if (!data) return;
    patchTextData(compId, layerId, { ...data, animators: (data.animators??[]).map(a=>a.id===animId?{...a,properties:{...a.properties,...props}}:a) });
  },
  duplicateAnimator: (compId, layerId, animId) => {
    const data = getTextData(compId, layerId); if (!data) return;
    const src = (data.animators??[]).find(a=>a.id===animId); if (!src) return;
    const clone = { ...src, id: genId(), name: src.name+' Copy' };
    patchTextData(compId, layerId, { ...data, animators: [...(data.animators??[]), clone] });
  },
}));