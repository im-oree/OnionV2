import React, { useCallback, useState } from 'react';
import { useLayoutStore } from '../../state/layoutStore';

interface Props {
  splitId: string;
  direction: 'h' | 'v';
  containerSize: number;
  ratio: number;
}

export const Splitter: React.FC<Props> = ({
  splitId, direction, containerSize, ratio,
}) => {
  const resizeSplit = useLayoutStore((s) => s.resizeSplit);
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setActive(true);
      const startPos = direction === 'h' ? e.clientX : e.clientY;
      const startRatio = ratio;

      const onMove = (ev: MouseEvent) => {
        const currentPos = direction === 'h' ? ev.clientX : ev.clientY;
        const delta = currentPos - startPos;
        const newRatio = startRatio + delta / containerSize;
        resizeSplit(splitId, newRatio);
      };
      const onUp = () => {
        setActive(false);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
      };
      document.body.style.cursor = direction === 'h' ? 'col-resize' : 'row-resize';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [direction, ratio, containerSize, splitId, resizeSplit],
  );

  const isH = direction === 'h';
  const showColor = active
    ? 'var(--color-accent, #5865ff)'
    : hover
    ? 'rgba(120,140,220,0.6)'
    : 'transparent';

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flexShrink: 0,
        cursor: isH ? 'col-resize' : 'row-resize',
        width: isH ? 4 : '100%',
        height: isH ? '100%' : 4,
        position: 'relative',
        zIndex: 5,
      }}
    >
      {/* Visible splitter line — thinner than hit area for cleaner look */}
      <div style={{
        position: 'absolute',
        inset: 0,
        margin: isH ? '0 1px' : '1px 0',
        background: showColor,
        borderRadius: 1,
        transition:
          'background 180ms cubic-bezier(0.4, 0, 0.2, 1), ' +
          'transform 180ms cubic-bezier(0.4, 0, 0.2, 1)',
        transform: active ? (isH ? 'scaleX(1.5)' : 'scaleY(1.5)') : 'scale(1)',
        transformOrigin: 'center',
        boxShadow: active
          ? '0 0 8px rgba(88,101,255,0.4)'
          : 'none',
      }} />
    </div>
  );
};