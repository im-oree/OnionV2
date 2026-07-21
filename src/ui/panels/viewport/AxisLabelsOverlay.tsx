import React from 'react';

/**
 * AxisLabelsOverlay — shows 3D axis direction labels (X→, Y↑, Z→) 
 * in the bottom-left corner of the viewport when 3D perspective is active.
 * Only visible in 3D mode.
 */
export const AxisLabelsOverlay: React.FC = () => {
  return (
    <div
      className="absolute bottom-8 left-8 z-20 pointer-events-none"
      style={{ opacity: 0.55 }}
    >
      <svg width={100} height={100} viewBox="-60 -60 120 120">
        {/* X axis — Red */}
        <line x1={0} y1={0} x2={45} y2={0} stroke="#ff3355" strokeWidth={1.5} strokeLinecap="round" />
        <text x={50} y={4} fill="#ff3355" fontSize={10} fontWeight="bold" fontFamily="monospace">X</text>
        
        {/* Y axis — Green */}
        <line x1={0} y1={0} x2={0} y2={-45} stroke="#55dd33" strokeWidth={1.5} strokeLinecap="round" />
        <text x={-4} y={-52} fill="#55dd33" fontSize={10} fontWeight="bold" fontFamily="monospace" textAnchor="middle">Y</text>
        
        {/* Z axis — Blue */}
        <line x1={0} y1={0} x2={32} y2={32} stroke="#3388ff" strokeWidth={1.5} strokeLinecap="round" />
        <text x={36} y={44} fill="#3388ff" fontSize={10} fontWeight="bold" fontFamily="monospace">Z</text>
        
        {/* Origin dot */}
        <circle cx={0} cy={0} r={2.5} fill="rgba(255,255,255,0.6)" />
      </svg>
    </div>
  );
};
