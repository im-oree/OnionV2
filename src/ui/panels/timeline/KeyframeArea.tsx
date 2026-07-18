import React from 'react';
import type { Layer } from '../../../types/layer';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { animationClock } from './PlaybackControls';

interface KeyframeAreaProps {
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

export const KeyframeArea: React.FC<KeyframeAreaProps> = ({
  layers, expandedLayers, propertyPaths, currentFrame: _cf, zoom, totalFrames, compId,
}) => {
  const engine = useKeyframeStore((s) => s.engine);

  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="relative" style={{ paddingTop: 0 }}>
      {sortedLayers.map((layer) => {
        const isExpanded = expandedLayers.has(layer.id);
        const keyframes = engine.getAllKeyframesForLayer(layer.id);

        return (
          <div key={layer.id}>
            {/* Layer track bar */}
            <LayerTrackBar
              layer={layer}
              zoom={zoom}
              compId={compId}
              onSeek={(f) => animationClock.seekToFrame(f)}
            />

            {/* Property keyframe tracks (when expanded) */}
            {isExpanded && propertyPaths.map((prop) => {
              const propKfs = keyframes.filter((k) => k.property === prop.path);
              return (
                <PropertyKeyframeTrack
                  key={prop.path}
                  keyframes={propKfs}
                  zoom={zoom}
                  totalFrames={totalFrames}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

/** Layer bar showing in-point/out-point, draggable */
const LayerTrackBar: React.FC<{
  layer: Layer; zoom: number; compId: string; onSeek: (f: number) => void;
}> = ({ layer, zoom, onSeek }) => (
  <div
    className="relative cursor-pointer border-b border-border/20 hover:bg-panel-hover"
    style={{ height: TRACK_HEIGHT }}
    onClick={() => onSeek(layer.startFrame)}
  >
    {/* In-point → out-point bar */}
    <div
      className="absolute top-1/2 -translate-y-1/2 h-[14px] rounded-sm bg-accent/40 border border-accent/60 cursor-grab"
      style={{
        left: layer.startFrame * zoom,
        width: Math.max(4, (layer.endFrame - layer.startFrame) * zoom),
      }}
    >
      {/* In-point handle */}
      <div className="absolute left-0 top-0 bottom-0 w-[4px] cursor-ew-resize bg-accent rounded-l-sm" />
      {/* Out-point handle */}
      <div className="absolute right-0 top-0 bottom-0 w-[4px] cursor-ew-resize bg-accent rounded-r-sm" />
    </div>
  </div>
);

/** Property track showing keyframe diamonds */
const PropertyKeyframeTrack: React.FC<{
  keyframes: any[]; zoom: number; totalFrames: number;
}> = ({ keyframes, zoom, totalFrames }) => (
  <div
    className="relative border-b border-border/10"
    style={{ height: PROP_TRACK_HEIGHT }}
  >
    {/* Grid lines (every 10 frames) */}
    {Array.from({ length: Math.floor(totalFrames / 10) + 1 }, (_, i) => (
      <div key={i} className="absolute top-0 bottom-0 w-px bg-border/20"
        style={{ left: i * 10 * zoom }}
      />
    ))}

    {/* Keyframe diamonds */}
    {keyframes.map((kf) => (
      <KeyframeDiamond key={kf.id} time={kf.time} zoom={zoom} interpolation={kf.interpolation} />
    ))}


  </div>
);

/** Single keyframe diamond with interpolation-appropriate shape */
const KeyframeDiamond: React.FC<{
  time: number; zoom: number; interpolation: string;
}> = ({ time, zoom, interpolation }) => {
  let shape: React.ReactNode;
  const size = 8;
  const x = time * zoom;

  switch (interpolation) {
    case 'hold':
      shape = <rect x={x - size / 2} y={-size / 2} width={size} height={size} fill="#ff4444" rx={1} />;
      break;
    case 'bezier':
      shape = <circle cx={x} cy={0} r={size / 2} fill="#ffaa00" />;
      break;
    default: // linear
      shape = <polygon points={`${x},${-size/2} ${x+size/2},0 ${x},${size/2} ${x-size/2},0`} fill="#88ccff" />;
  }

  return (
    <svg width={size + 2} height={size + 2} className="absolute top-1/2 -translate-y-1/2 z-10 cursor-pointer hover:scale-125 transition-transform"
      style={{ left: x - size / 2 - 1 }}
    >
      {shape}
    </svg>
  );
};


