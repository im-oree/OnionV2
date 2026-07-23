/**
 * LayoutNode — recursive renderer for the layout tree.
 * SplitNode → two children with a Splitter between
 * TabsNode  → TabbedContainer
 */
import React, { useEffect, useRef, useState } from 'react';
import type { LayoutNode as LN } from '../../state/layoutStore';
import { TabbedContainer } from './TabbedContainer';
import { Splitter } from './Splitter';

interface Props {
  node: LN;
}

export const LayoutNodeView: React.FC<Props> = ({ node }) => {
  if (node.type === 'tabs') {
    return <TabbedContainer node={node} />;
  }

  return <SplitView node={node} />;
};

// ── Split view with measured container size for splitter math ───

const SplitView: React.FC<{ node: Extract<LN, { type: 'split' }> }> = ({ node }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setSize(node.direction === 'h' ? rect.width : rect.height);
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    setSize(node.direction === 'h' ? rect.width : rect.height);
    return () => ro.disconnect();
  }, [node.direction]);

  const isH = node.direction === 'h';
  const ratio = Math.max(0.05, Math.min(0.95, node.ratio));
  const firstSize = `${(ratio * 100).toFixed(3)}%`;
  const secondSize = `${((1 - ratio) * 100).toFixed(3)}%`;

  return (
    <div
      ref={containerRef}
      data-layout-node
      style={{
        display: 'flex',
        flexDirection: isH ? 'row' : 'column',
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          [isH ? 'width' : 'height']: firstSize,
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        <div style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0 }}>
          <LayoutNodeView node={node.a} />
        </div>
      </div>

      <Splitter
        splitId={node.id}
        direction={node.direction}
        containerSize={size}
        ratio={ratio}
      />

      <div
        style={{
          [isH ? 'width' : 'height']: secondSize,
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        <div style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0 }}>
          <LayoutNodeView node={node.b} />
        </div>
      </div>
    </div>
  );
};