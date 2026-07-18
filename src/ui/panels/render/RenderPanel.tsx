import React from 'react';
import { useCompositionStore } from '../../../state/compositionStore';

export const RenderPanel: React.FC = () => {
  const comp = useCompositionStore((s) =>
    s.activeCompositionId
      ? s.compositions.find((c) => c.id === s.activeCompositionId) ?? null
      : null,
  );

  return (
    <div className="p-3 space-y-3 text-ui-xs">
      <div className="text-text-secondary font-medium uppercase tracking-wider">
        Render Output
      </div>
      {comp ? (
        <>
          <div>
            <label className="block text-text-disabled mb-1">Format</label>
            <select
              className="w-full h-6 bg-surface border border-border rounded-sm px-1 text-text-primary outline-none"
            >
              <option>PNG Sequence</option>
              <option>MP4 (H.264)</option>
              <option>WebM (VP9)</option>
            </select>
          </div>
          <div>
            <label className="block text-text-disabled mb-1">Resolution</label>
            <select className="w-full h-6 bg-surface border border-border rounded-sm px-1 text-text-primary outline-none">
              <option>Full ({comp.width}×{comp.height})</option>
              <option>Half</option>
              <option>Quarter</option>
            </select>
          </div>
          <button className="w-full h-8 bg-accent text-white border-0 rounded-sm cursor-pointer hover:bg-accent-hover">
            Export (coming soon)
          </button>
        </>
      ) : (
        <div className="text-text-disabled">No composition active</div>
      )}
    </div>
  );
};

export default RenderPanel;