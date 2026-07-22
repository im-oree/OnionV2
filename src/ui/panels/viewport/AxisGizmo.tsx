import React, { useState, useEffect, useCallback } from 'react';

interface Props {
  onAxisClick?: (axis: 'x' | 'y' | 'z' | '-x' | '-y' | '-z') => void;
}

/**
 * AxisGizmo â€” Blender-style 3D orientation sphere.
 * Rotates with the free-view camera orbit.
 * Shows X=red, Y=green, Z=blue with proper 3D projection and depth sorting.
 *
 * CLICK BEHAVIOR:
 *  - Click positive axis end (+X, +Y, +Z) â†’ snap view to look down that axis
 *  - Click negative axis end (-X, -Y, -Z) â†’ snap view from opposite side
 *  - Click center dot â†’ reset to default 3/4 perspective view
 *
 * Snapping updates window.__freeOrbitX / __freeOrbitY (pitch/yaw of the
 * free-view camera), then dispatches 'viewport:viewmode' so the renderer
 * re-applies the camera and re-renders.
 */
export const AxisGizmo: React.FC<Props> = ({ onAxisClick }) => {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    let rafId = 0;
    let lastOrbitX = (window as any).__freeOrbitX ?? 0.3;
    let lastOrbitY = (window as any).__freeOrbitY ?? 0.5;

    const tick = () => {
      const curX = (window as any).__freeOrbitX ?? 0.3;
      const curY = (window as any).__freeOrbitY ?? 0.5;
      if (curX !== lastOrbitX || curY !== lastOrbitY) {
        lastOrbitX = curX;
        lastOrbitY = curY;
        forceUpdate(n => n + 1);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  /**
   * Snap the free-view camera to a specific direction.
   * Angles chosen so the camera looks *down* the given axis toward origin.
   */
  const snapView = useCallback((dir: 'x' | 'y' | 'z' | '-x' | '-y' | '-z' | 'reset') => {
    let pitch = 0.3;
    let yaw = 0.5;

    switch (dir) {
      case 'x':   pitch = 0;              yaw = Math.PI / 2;  break; // look down +X
      case '-x':  pitch = 0;              yaw = -Math.PI / 2; break;
      case 'y':   pitch = Math.PI / 2 - 0.001; yaw = 0;       break; // top view
      case '-y':  pitch = -Math.PI / 2 + 0.001; yaw = 0;      break; // bottom view
      case 'z':   pitch = 0;              yaw = 0;            break; // front view (look down +Z)
      case '-z':  pitch = 0;              yaw = Math.PI;      break; // back view
      case 'reset':
      default:
        pitch = 0.3; yaw = 0.5;
        break;
    }

    (window as any).__freeOrbitX = pitch;
    (window as any).__freeOrbitY = yaw;

    // Ensure we're in free view so the snap is visible
    (window as any).__freeViewMode = true;
    document.dispatchEvent(new CustomEvent('viewport:viewmode', {
      detail: { free: true },
    }));

    if (dir !== 'reset') onAxisClick?.(dir);
  }, [onAxisClick]);

  const size = 72;
  const cx = size / 2;
  const cy = size / 2;
  const armLen = 24;

  const orbitX = (window as any).__freeOrbitX ?? 0.3;
  const orbitY = (window as any).__freeOrbitY ?? 0.5;

  const cosX = Math.cos(-orbitX), sinX = Math.sin(-orbitX);
  const cosY = Math.cos(-orbitY), sinY = Math.sin(-orbitY);

  const project3D = (x: number, y: number, z: number) => {
    let rx = x * cosY + z * sinY;
    let ry = y;
    let rz = -x * sinY + z * cosY;
    let ry2 = ry * cosX - rz * sinX;
    let rz2 = ry * sinX + rz * cosX;
    return { sx: rx, sy: -ry2, depth: rz2 };
  };

  // Positive AND negative endpoints for each axis
  const endpoints = [
    { dir: 'x'  as const, color: '#ff3355', label: 'X', x3d:  1, y3d:  0, z3d:  0, filled: true  },
    { dir: '-x' as const, color: '#ff3355', label: '',  x3d: -1, y3d:  0, z3d:  0, filled: false },
    { dir: 'y'  as const, color: '#55dd33', label: 'Y', x3d:  0, y3d:  1, z3d:  0, filled: true  },
    { dir: '-y' as const, color: '#55dd33', label: '',  x3d:  0, y3d: -1, z3d:  0, filled: false },
    { dir: 'z'  as const, color: '#3388ff', label: 'Z', x3d:  0, y3d:  0, z3d:  1, filled: true  },
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
        {/* Background sphere â€” clickable to reset view */}
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

        {/* Faint axis lines through center (both directions) */}
        {['x', 'y', 'z'].map(axisKey => {
          const posEnd = projected.find(p => p.dir === axisKey);
          const negEnd = projected.find(p => p.dir === '-' + axisKey);
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

        {/* Center dot */}
        <circle
          cx={cx} cy={cy} r={2.5}
          fill="rgba(255,255,255,0.7)"
          style={{ pointerEvents: 'none' }}
        />
      </svg>
    </div>
  );
};