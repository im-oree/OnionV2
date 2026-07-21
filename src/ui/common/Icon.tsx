/**
 * Icon wrapper around lucide-react.
 * Consistent stroke weight + curved edges for premium feel.
 */
import React from 'react';
import {
  MousePointer2, Move, Hand, ZoomIn, RotateCw, Maximize2,
  Square, Circle, Hexagon, PenTool, Type, Minus,
  Play, Pause, Square as StopSquare,
  SkipBack, SkipForward,
  ChevronDown, ChevronRight, Lock, Unlock,
  Eye, EyeOff, Trash2, Plus, X, Menu, Grid3X3,
  GripVertical, Diamond, FolderOpen, Image, Film, Music,
  Sparkles, Link2, Unlink2, MoreHorizontal, Search, AlignStartVertical,
  Paintbrush, Eraser, Palette,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type IconName =
  | 'select'|'move'|'hand'|'zoom'|'rotate'|'scale'
  | 'rectangle'|'ellipse'|'polygon'|'pen'|'text'|'null'
  | 'play'|'pause'|'stop'|'frameBack'|'frameForward'|'goToStart'|'goToEnd'
  | 'chevronDown'|'chevronRight'|'lock'|'unlock'|'eye'|'eyeOff'|'trash'
  | 'plus'|'minus'|'grip'|'close'|'menu'|'grid'|'snap'
  | 'keyframe'|'keyframeAdd'|'folder'|'image'|'video'|'audio'
  | 'effect'|'mask'|'parent'|'link'|'unlink'|'more'|'search'
  | 'diamond'|'collection'|'brush'|'eraser'|'gradient'|'perspective';

const ICON_MAP: Record<IconName, LucideIcon> = {
  select: MousePointer2, move: Move, hand: Hand, zoom: ZoomIn,
  rotate: RotateCw, scale: Maximize2,
  rectangle: Square, ellipse: Circle, polygon: Hexagon,
  pen: PenTool, text: Type, null: Minus,
  play: Play, pause: Pause, stop: StopSquare,
  frameBack: SkipBack, frameForward: SkipForward,
  goToStart: SkipBack, goToEnd: SkipForward,
  chevronDown: ChevronDown, chevronRight: ChevronRight,
  lock: Lock, unlock: Unlock, eye: Eye, eyeOff: EyeOff,
  trash: Trash2, plus: Plus, minus: Minus,
  grip: GripVertical, close: X, menu: Menu, grid: Grid3X3,
  snap: AlignStartVertical, keyframe: Diamond, keyframeAdd: Diamond,
  folder: FolderOpen, image: Image, video: Film, audio: Music,
  effect: Sparkles, mask: Circle, parent: Link2,
  link: Link2, unlink: Unlink2, more: MoreHorizontal,
  search: Search, diamond: Diamond, collection: FolderOpen,
  brush: Paintbrush, eraser: Eraser, gradient: Palette,
  perspective: Maximize2,
};

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const Icon: React.FC<IconProps> = React.memo(
  ({ name, size = 16, strokeWidth = 1.75, className = '', onClick }) => {
    const LucideIcon = ICON_MAP[name];
    if (!LucideIcon) return null;
    return (
      <LucideIcon
        size={size}
        strokeWidth={strokeWidth}
        className={`shrink-0 ${className}`}
        onClick={onClick}
        absoluteStrokeWidth
      />
    );
  }
);
Icon.displayName = 'Icon';