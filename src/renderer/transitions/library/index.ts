import type { TransitionDefinition } from '../types';
import { dissolveTransition } from './dissolve';
import { wipeTransition, wipeLeftTransition, wipeRightTransition, wipeUpTransition, wipeDownTransition } from './wipe';
import { slideLeftTransition, slideRightTransition, slideUpTransition, slideDownTransition } from './slide';
import { irisTransition, crossDissolveTransition } from './iris';
import { fadeBlackTransition, fadeWhiteTransition, zoomInTransition, zoomOutTransition } from './fade';

export const ALL_TRANSITIONS: TransitionDefinition[] = [
  dissolveTransition,
  crossDissolveTransition,
  wipeTransition,
  wipeLeftTransition,
  wipeRightTransition,
  wipeUpTransition,
  wipeDownTransition,
  slideLeftTransition,
  slideRightTransition,
  slideUpTransition,
  slideDownTransition,
  irisTransition,
  zoomInTransition,
  zoomOutTransition,
  fadeBlackTransition,
  fadeWhiteTransition,
];

export function getTransitionById(id: string): TransitionDefinition | undefined {
  return ALL_TRANSITIONS.find(t => t.id === id);
}

export function getTransitionsByCategory(category: string): TransitionDefinition[] {
  return ALL_TRANSITIONS.filter(t => t.category === category);
}
