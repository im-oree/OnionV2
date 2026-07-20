import type { ContextMenuItem } from '../../common/ContextMenu';
import { buildSharedKeyframeContextMenu } from './sharedKeyframeContextMenu';

/** Timeline context menu — delegates to shared builder */
export function buildKeyframeContextMenu(): ContextMenuItem[] {
  return buildSharedKeyframeContextMenu();
}