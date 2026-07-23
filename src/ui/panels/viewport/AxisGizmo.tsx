import React, { useState, useEffect, useCallback } from 'react';
import { cameraController } from '../../../renderer/CameraController';
import { onCameraChange } from '../../../renderer/utils/CameraEvents';

interface Props {
  onAxisClick?: (axis: '+x' | '-x' | '+y' | '-y' | '+z' | '-z') => void;
}

/**
 * AxisGizmo — Blender-style 3D orientation sphere at the top-right.
 * Rotates with the Free View camera orbit. Clicking axis endpoints
 * snaps the Free View to that axis-aligned direction.
 */
export const AxisGizmo: React.FC<Props> = ({ onAxisClick }) => {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    // Update whenever camera changes (RAF-throttled via bus)
    const unsub = onCameraChange(() => forceUpdate((n) => n + 1));
    return unsub;
  }, []);

  const snapView = useCallback((dir: '+x' | '-x' | '+y' | '-y' | '+z' | '-z' | 'reset') => {
    // Ensure Free View is active before snapping
    if (!cameraController.isFreeView) {
      cameraController.setMode('freeView');
      document.dispatchEvent(new CustomEvent('viewport:viewmode', { detail: { free: true } }));
    }
    cameraController.snapToAxisView(dir);
    if (dir !== 'reset') onAxisClick?.(dir);
  }, [onAxisClick]);

  const size = 72;
  const cx = size / 2;
  const cy = size / 2;
  const armLen = 24;

  const st = cameraController.freeState;
  const pitch = -st.pitch;
  const yaw = -st.yaw;

  const cosX = Math.cos(pitch), sinX = Math.sin(pitch);
  const cosY = Math.cos(yaw), sinY = Math.sin(yaw);

  const project3D = (x: number, y: number, z: number) => {
    const rx = x * cosY + z * sinY;
    const ry = y;
    const rz = -x * sinY + z * cosY;
    const ry2 = ry * cosX - rz * sinX;
    const rz2 = ry * sinX + rz * cosX;
    return { sx: rx, sy: -ry2, depth: rz2 };
  };

  const endpoints = [
    { dir: '+x' as const, color: '#ff3355', label: 'X', x3d:  1, y3d:  0, z3d:  0, filled: true  },
    { dir: '-x' as const, color: '#ff3355', label: '',  x3d: -1, y3d:  0, z3d:  0, filled: false },
    { dir: '+y' as const, color: '#55dd33', label: 'Y', x3d:  0, y3d:  1, z3d:  0, filled: true  },
    { dir: '-y' as const, color: '#55dd33', label: '',  x3d:  0, y3d: -1, z3d:  0, filled: false },
    { dir: '+z' as const, color: '#3388ff', label: 'Z', x3d:  0, y3d:  0, z3d:  1, filled: true  },
    { dir: '-z' as const, color: '#3388ff', label: '',  x3d:  0, y3d:  0, z3d: -1, filled: false },
  ];

  const projected = endpoints.map(a => {
    const p = project3D(a.x3d, a.y3d, a.z3d);
    return { ...a, sx: p.sx, sy: p.sy, depth: p.depth };
  }).sort((a, b) => a.depth - b.depth);

  return (
    <div
      className="absolute z-30 pointer-events-auto"
      style={{ top: 6, right: 6, userSelect: 'none' }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ cursor: 'default', display: 'block' }}
      >
        <circle
          cx={cx} cy={cy} r={size / 2 - 1}
          fill="rgba(0,0,0,0.55)"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="0.5"
          style={{ cursor: 'pointer' }}
          onClick={(e) => { e.stopPropagation(); snapView('reset'); }}
        >
          <title>Reset to default view</title>
        </circle>

        {/* Axis lines through center */}
        {['x', 'y', 'z'].map(axisKey => {
          const posEnd = projected.find(p => p.dir === ('+' + axisKey));
          const negEnd = projected.find(p => p.dir === ('-' + axisKey));
          if (!posEnd || !negEnd) return null;
          return (
            <line
              key={'line-' + axisKey}
              x1={cx + negEnd.sx * armLen}
              y1={cy + negEnd.sy * armLen}
              x2={cx + posEnd.sx * armLen}
              y2={cy + posEnd.sy * armLen}
              stroke={posEnd.color}
              strokeWidth={1.8}
              opacity={0.35}
              strokeLinecap="round"
            />
          );
        })}

        {/* Endpoint bubbles */}
        {projected.map(({ dir, color, label, sx, sy, depth, filled }) => {
          const ex = cx + sx * armLen;
          const ey = cy + sy * armLen;
          const opacity = depth > 0 ? 1.0 : 0.55;
          const r = filled ? 7 : 5.5;
          return (
            <g
              key={dir}
              onClick={(e) => { e.stopPropagation(); snapView(dir); }}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ cursor: 'pointer' }}
            >
              <title>View along {dir.toUpperCase()}</title>
              <circle
                cx={ex} cy={ey} r={r}
                fill={filled ? color : 'rgba(0,0,0,0.6)'}
                stroke={color}
                strokeWidth={1.5}
                opacity={opacity}
              />
              {label && (
                <text
                  x={ex}
                  y={ey}
                  fill={filled ? '#000' : color}
                  fontSize={8}
                  fontWeight="bold"
                  fontFamily="system-ui, sans-serif"
                  opacity={opacity}
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ pointerEvents: 'none' }}
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}

        <circle
          cx={cx} cy={cy} r={2.5}
          fill="rgba(255,255,255,0.7)"
          style={{ pointerEvents: 'none' }}
        />
      </svg>
    </div>
  );
};