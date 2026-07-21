import React, { useState, useEffect } from 'react';

interface Props {
  onAxisClick?: (axis: 'x' | 'y' | 'z') => void;
}

/**
 * AxisGizmo — Blender-style 3D orientation sphere.
 * Rotates with the free-view camera orbit.
 * Shows X=red, Y=green, Z=blue with proper 3D projection and depth sorting.
 */
export const AxisGizmo: React.FC<Props> = ({ onAxisClick }) => {
  const [, forceUpdate] = useState(0);

  // Re-render when camera orbit changes
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

  const size = 68;
  const cx = size / 2;
  const cy = size / 2;
  const armLen = 24;

  // Get current free-view orbit angles
  const orbitX = (window as any).__freeOrbitX ?? 0.3;
  const orbitY = (window as any).__freeOrbitY ?? 0.5;

  // 3D rotation matrices — negate both axes so the gizmo matches
  // the viewport orientation (gizmo is a view-space indicator)
  const cosX = Math.cos(-orbitX), sinX = Math.sin(-orbitX);
  const cosY = Math.cos(-orbitY), sinY = Math.sin(-orbitY);

  const project3D = (x: number, y: number, z: number) => {
    // Rotate around Y axis (yaw)
    let rx = x * cosY + z * sinY;
    let ry = y;
    let rz = -x * sinY + z * cosY;
    // Rotate around X axis (pitch)
    let ry2 = ry * cosX - rz * sinX;
    let rz2 = ry * sinX + rz * cosX;
    return { sx: rx, sy: -ry2, depth: rz2 };
  };

  const axes = [
    { dir: 'x' as const, color: '#ff3355', label: 'X', x3d: 1, y3d: 0, z3d: 0 },
    { dir: 'y' as const, color: '#55dd33', label: 'Y', x3d: 0, y3d: 1, z3d: 0 },
    { dir: 'z' as const, color: '#3388ff', label: 'Z', x3d: 0, y3d: 0, z3d: 1 },
  ];

  const projected = axes.map(a => {
    const p = project3D(a.x3d, a.y3d, a.z3d);
    return { ...a, sx: p.sx, sy: p.sy, depth: p.depth };
  }).sort((a, b) => a.depth - b.depth); // Back to front rendering

  return (
    <div className="absolute z-30 pointer-events-auto" style={{ top: 4, right: 4 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ cursor: 'pointer' }}>
        {/* Background sphere */}
        <circle cx={cx} cy={cy} r={size / 2 - 1} fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />

        {projected.map(({ dir, color, label, sx, sy, depth }) => {
          const ex = cx + sx * armLen;
          const ey = cy + sy * armLen;
          // Depth-based opacity: back axes are dimmer, front axes are brighter
          const opacity = depth > 0 ? 0.9 : 0.45;

          return (
            <g key={dir} onClick={() => onAxisClick?.(dir)} style={{ cursor: 'pointer' }}>
              <line x1={cx} y1={cy} x2={ex} y2={ey}
                stroke={color} strokeWidth={2.5} opacity={opacity} strokeLinecap="round" />
              <circle cx={ex} cy={ey} r={3.5} fill={color} opacity={opacity} />
              <text x={ex + (sx > 0.2 ? 7 : sx < -0.2 ? -7 : 0)}
                y={ey + (sy > 0.2 ? 8 : sy < -0.2 ? -4 : 0)}
                fill={color} fontSize={9} fontWeight="bold" fontFamily="monospace" opacity={opacity}
                textAnchor={sx > 0.2 ? 'start' : sx < -0.2 ? 'end' : 'middle'}
                dominantBaseline="middle">
                {label}
              </text>
            </g>
          );
        })}

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={2.5} fill="rgba(255,255,255,0.6)" />
      </svg>
    </div>
  );
};
