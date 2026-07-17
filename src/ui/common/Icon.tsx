/**
 * Icon wrapper — abstracts the icon library so we can swap it later.
 * Currently wraps lucide-react icons.
 */
import React from 'react';
import {
  MousePointer, Move, Hand, ZoomIn, RotateCw, Maximize2,
  Square, Circle, Hexagon, Pen, Type, Minus,
  Play, Pause, Square as StopSquare,
  SkipBack, SkipForward,
  ChevronDown, ChevronRight, Lock, Unlock,
  Eye, EyeOff, Trash2, Plus, X, Menu, Grid3X3,
  GripVertical, Diamond, FolderOpen, Image, Film, Music,
  Sparkles, Link2, Unlink2, MoreHorizontal, Search, AlignStartVertical,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Canonical icon names used across the app — swap icons here to change across the app */
export type IconName =
  | 'select'|'move'|'hand'|'zoom'|'rotate'|'scale'
  | 'rectangle'|'ellipse'|'polygon'|'pen'|'text'|'null'
  | 'play'|'pause'|'stop'|'frameBack'|'frameForward'|'goToStart'|'goToEnd'
  | 'chevronDown'|'chevronRight'|'lock'|'unlock'|'eye'|'eyeOff'|'trash'
  | 'plus'|'minus'|'grip'|'close'|'menu'|'grid'|'snap'
  | 'keyframe'|'keyframeAdd'|'folder'|'image'|'video'|'audio'
  | 'effect'|'mask'|'parent'|'link'|'unlink'|'more'|'search'
  | 'diamond'|'collection';

const ICON_MAP: Record<IconName, LucideIcon> = {
  select: MousePointer, move: Move, hand: Hand, zoom: ZoomIn,
  rotate: RotateCw, scale: Maximize2,
  rectangle: Square, ellipse: Circle, polygon: Hexagon,
  pen: Pen, text: Type, null: Minus,
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
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const Icon: React.FC<IconProps> = React.memo(
  ({ name, size = 16, className = '', onClick }) => {
    const LucideIcon = ICON_MAP[name];
    if (!LucideIcon) return null;

    return (
      <LucideIcon
        size={size}
        className={`shrink-0 ${className}`}
        onClick={onClick}
      />
    );
  }
);
Icon.displayName = 'Icon';
