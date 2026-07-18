import React from 'react';
import type { Layer } from '../../../types/layer';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { animationClock } from './PlaybackControls';
import { useLayerBarDrag } from './useLayerBarDrag';
import { useKeyframeDrag } from './useKeyframeDrag';
import type { Keyframe } from '../../../types/keyframe';

interface Props {
  layers: Layer[];
  expandedLayers: Set<string>;
  propertyPaths: { path: string; label: string }[];
  currentFrame: number;
  zoom: number;
  totalFrames: number;
  compId: string;
}

const TRACK_HEIGHT = 24;
const PROP_TRACK_HEIGHT = 20;

export const KeyframeArea: React.FC<Props> = ({
  layers, expandedLayers, propertyPaths, zoom, totalFrames, compId,
}) => {
  const engine = useKeyframeStore(s => { void s.revision; return s.engine; });
  const kfDrag = useKeyframeDrag(zoom, totalFrames);
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="relative">
      {sortedLayers.map(layer => {
        const isExpanded = expandedLayers.has(layer.id);
        const allKfs = engine.getAllKeyframesForLayer(layer.id);
        return (
          <div key={layer.id}>
            <LayerTrackBar
              layer={layer} zoom={zoom} compId={compId} totalFrames={totalFrames}
            />
            {isExpanded && propertyPaths.map(prop => {
              const propKfs = allKfs.filter(k => k.property === prop.path);
              return (
                <PropertyKeyframeTrack
                  key={prop.path} keyframes={propKfs} zoom={zoom}
                  totalFrames={totalFrames} onKfDown={kfDrag.onDown}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

const LayerTrackBar: React.FC<{
  layer: Layer; zoom: number; compId: string; totalFrames: number;
}> = ({ layer, zoom, compId, totalFrames }) => {
  const { onMouseDown } = useLayerBarDrag(layer, compId, zoom, totalFrames);
  const left = layer.startFrame * zoom;
  const width = Math.max(4, (layer.endFrame - layer.startFrame) * zoom);

  return (
    <div
      className="relative border-b border-border/20 hover:bg-panel-hover"
      style={{ height: TRACK_HEIGHT }}
      onDoubleClick={() => animationClock.seekToFrame(layer.startFrame)}
    >
      <div
        className="absolute top-1/2 -translate-y-1/2 h-[16px] rounded-sm bg-accent/50 border border-accent"
        style={{ left, width, cursor: 'grab' }}
        onMouseDown={onMouseDown('move')}
        title={`${layer.name}: ${layer.startFrame}–${layer.endFrame}`}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-[6px] bg-accent rounded-l-sm"
          style={{ cursor: 'ew-resize' }}
          onMouseDown={onMouseDown('trimStart')}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-[6px] bg-accent rounded-r-sm"
          style={{ cursor: 'ew-resize' }}
          onMouseDown={onMouseDown('trimEnd')}
        />
        <div className="absolute inset-0 flex items-center px-2 pointer-events-none">
          <span className="text-[9px] text-white/80 truncate select-none">{layer.name}</span>
        </div>
      </div>
    </div>
  );
};

const PropertyKeyframeTrack: React.FC<{
  keyframes: Keyframe[];
  zoom: number;
  totalFrames: number;
  onKfDown: (id: string, time: number) => (e: React.MouseEvent) => void;
}> = ({ keyframes, zoom, totalFrames: _tf, onKfDown }) => (
  <div className="relative border-b border-border/10 bg-black/10" style={{ height: PROP_TRACK_HEIGHT }}>
    {keyframes.map(kf => (
      <KeyframeDiamond
        key={kf.id} kf={kf} zoom={zoom} onMouseDown={onKfDown(kf.id, kf.time)}
      />
    ))}
  </div>
);

const KeyframeDiamond: React.FC<{
  kf: Keyframe; zoom: number; onMouseDown: (e: React.MouseEvent) => void;
}> = ({ kf, zoom, onMouseDown }) => {
  const size = 9;
  const x = kf.time * zoom;
  let fill = '#e8b84b';
  if (kf.interpolation === 'hold') fill = '#e04040';
  if (kf.interpolation === 'bezier') fill = '#4bd0e8';
  return (
    <svg
      width={size + 4} height={size + 4}
      className="absolute top-1/2 -translate-y-1/2 z-10 hover:scale-125 transition-transform"
      style={{ left: x - (size / 2) - 2, cursor: 'ew-resize' }}
      onMouseDown={onMouseDown}
    >
      {kf.interpolation === 'hold' ? (
        <rect x={2} y={2} width={size} height={size} fill={fill} rx={1} stroke="#000" strokeWidth="0.5" />
      ) : kf.interpolation === 'bezier' ? (
        <circle cx={size / 2 + 2} cy={size / 2 + 2} r={size / 2} fill={fill} stroke="#000" strokeWidth="0.5" />
      ) : (
        <polygon
          points={`${size/2+2},2 ${size+2},${size/2+2} ${size/2+2},${size+2} 2,${size/2+2}`}
          fill={fill} stroke="#000" strokeWidth="0.5"
        />
      )}
    </svg>
  );
};