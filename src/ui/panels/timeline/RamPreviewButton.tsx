/**
 * RamPreviewButton — triggers Bake Preview / Clear Preview for the current composition.
 * Iterates the work area (or visible range) frame-by-frame, captures each into the
 * FrameCache via RamPreviewBuilder, and reports progress through ramPreviewStore.
 */
import React from 'react';

interface Props {
  compId: string;
}

export const RamPreviewButton: React.FC<Props> = ({ compId }) => {
  // TODO: wire to ramPreviewStore + RamPreviewBuilder
  return null;
};
