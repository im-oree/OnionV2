import type { ContextMenuItem } from '../../common/ContextMenu';
import { buildSharedKeyframeContextMenu } from '../timeline/sharedKeyframeContextMenu';

/** Graph editor context menu — delegates to shared builder */
export function buildGraphContextMenu(): ContextMenuItem[] {
  return buildSharedKeyframeContextMenu();
}
