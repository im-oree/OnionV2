/**
 * AxisGizmo — small orientation indicator at top-right of viewport.
 * Shows X (red, right), Y (green, up), Z (blue, dot) axis directions.
 * Matches Blender's axis colors: X = #ff3355, Y = #55dd33, Z = #3388ff.
 */
import React from 'react';

export const AxisGizmo: React.FC = () => {
  const size = 60;
  const cx = size / 2;
  const cy = size / 2;
  const armLen = 18;
  const dotR = 3;

  return (
    <div className="absolute top-2 right-2 z-30 pointer-events-none opacity-70">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle cx={cx} cy={cy} r={size / 2 - 2} fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        {/* X axis — red, right */}
        <line x1={cx} y1={cy} x2={cx + armLen} y2={cy} stroke="#ff3355" strokeWidth="1.5" />
        <text x={cx + armLen + 3} y={cy + 1} fill="#ff3355" fontSize="7" fontWeight="bold" fontFamily="monospace"
          textAnchor="start" dominantBaseline="middle">X</text>
        {/* Y axis — green, up */}
        <line x1={cx} y1={cy} x2={cx} y2={cy - armLen} stroke="#55dd33" strokeWidth="1.5" />
        <text x={cx} y={cy - armLen - 3} fill="#55dd33" fontSize="7" fontWeight="bold" fontFamily="monospace"
          textAnchor="middle" dominantBaseline="auto">Y</text>
        {/* Z axis — blue, dot at center (pointing toward viewer) */}
        <circle cx={cx} cy={cy} r={dotR} fill="#3388ff" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        <text x={cx + dotR + 3} y={cy + 3} fill="#3388ff" fontSize="7" fontWeight="bold" fontFamily="monospace"
          textAnchor="start" dominantBaseline="middle">Z</text>
      </svg>
    </div>
  );
};
