/**
 * spatialAudio — helpers for 3D audio positioning using Web Audio's
 * PannerNode + AudioListener. The listener sits at the composition center
 * and does not move. Audio sources are placed in world/comp space and
 * fall off with distance according to the configured distance model.
 */
import { getAudioContext } from './audioContext';

export interface SpatialConfig {
  x: number;
  y: number;
  z: number;
  distanceModel: 'linear' | 'inverse' | 'exponential';
  refDistance: number;
  maxDistance: number;
  rolloff: number;
  coneInnerAngle: number;
  coneOuterAngle: number;
  coneOuterGain: number;
  orientX: number;
  orientY: number;
  orientZ: number;
  doppler: boolean;
}

export const DEFAULT_SPATIAL: SpatialConfig = {
  x: 0, y: 0, z: 0,
  distanceModel: 'inverse',
  refDistance: 200,
  maxDistance: 2000,
  rolloff: 1,
  coneInnerAngle: 360,
  coneOuterAngle: 360,
  coneOuterGain: 0,
  orientX: 0, orientY: 0, orientZ: 1,
  doppler: false,
};

/** Initialize the AudioListener at composition center (0,0,0) facing +Z. */
export function initListener(): void {
  const ctx = getAudioContext();
  const listener = ctx.listener;

  // Modern API (positionX/positionY/positionZ as AudioParams)
  if (listener.positionX) {
    listener.positionX.value = 0;
    listener.positionY.value = 0;
    listener.positionZ.value = 0;
    if (listener.forwardX) {
      listener.forwardX.value = 0;
      listener.forwardY.value = 0;
      listener.forwardZ.value = 1;
      listener.upX.value = 0;
      listener.upY.value = 1;
      listener.upZ.value = 0;
    }
  } else {
    // Legacy fallback
    (listener as any).setPosition?.(0, 0, 0);
    (listener as any).setOrientation?.(0, 0, 1, 0, 1, 0);
  }
}

/** Create + configure a PannerNode for a spatial source. */
export function createSpatialNode(config: SpatialConfig): PannerNode {
  const ctx = getAudioContext();
  const panner = ctx.createPanner();
  panner.panningModel = 'HRTF';
  applySpatialConfig(panner, config);
  return panner;
}

/** Apply a config to an existing PannerNode. */
export function applySpatialConfig(panner: PannerNode, config: SpatialConfig): void {
  panner.distanceModel = config.distanceModel;
  panner.refDistance   = Math.max(0.01, config.refDistance);
  panner.maxDistance   = Math.max(config.refDistance + 1, config.maxDistance);
  panner.rolloffFactor = Math.max(0, config.rolloff);
  panner.coneInnerAngle = config.coneInnerAngle;
  panner.coneOuterAngle = config.coneOuterAngle;
  panner.coneOuterGain  = Math.max(0, Math.min(1, config.coneOuterGain));

  // Position
  if (panner.positionX) {
    panner.positionX.value = config.x;
    panner.positionY.value = config.y;
    panner.positionZ.value = config.z;
  } else {
    (panner as any).setPosition?.(config.x, config.y, config.z);
  }

  // Orientation
  if (panner.orientationX) {
    panner.orientationX.value = config.orientX;
    panner.orientationY.value = config.orientY;
    panner.orientationZ.value = config.orientZ;
  } else {
    (panner as any).setOrientation?.(config.orientX, config.orientY, config.orientZ);
  }
}

/**
 * Read spatial config from a layer's data. Returns null if spatial disabled.
 */
export function readSpatialFromData(data: any): SpatialConfig | null {
  if (!data?.spatialEnabled) return null;
  return {
    x: data.spatialX ?? 0,
    y: data.spatialY ?? 0,
    z: data.spatialZ ?? 0,
    distanceModel: data.spatialDistanceModel ?? DEFAULT_SPATIAL.distanceModel,
    refDistance:   data.spatialRefDistance ?? DEFAULT_SPATIAL.refDistance,
    maxDistance:   data.spatialMaxDistance ?? DEFAULT_SPATIAL.maxDistance,
    rolloff:       data.spatialRolloff ?? DEFAULT_SPATIAL.rolloff,
    coneInnerAngle: data.spatialConeInnerAngle ?? DEFAULT_SPATIAL.coneInnerAngle,
    coneOuterAngle: data.spatialConeOuterAngle ?? DEFAULT_SPATIAL.coneOuterAngle,
    coneOuterGain:  data.spatialConeOuterGain ?? DEFAULT_SPATIAL.coneOuterGain,
    orientX: data.spatialOrientX ?? DEFAULT_SPATIAL.orientX,
    orientY: data.spatialOrientY ?? DEFAULT_SPATIAL.orientY,
    orientZ: data.spatialOrientZ ?? DEFAULT_SPATIAL.orientZ,
    doppler: !!data.spatialDoppler,
  };
}

/**
 * If the source is linked to a layer, override x/y/z with that layer's
 * transform position (unless the layer is missing).
 */
export function applyLinkedLayerPosition(
  config: SpatialConfig,
  linkedLayerId: string | null | undefined,
): SpatialConfig {
  if (!linkedLayerId) return config;
  const compStore = (window as any).__compositionStore;
  if (!compStore) return config;
  const cs = compStore.getState();
  const comp = cs.activeCompositionId
    ? cs.compositions.find((c: any) => c.id === cs.activeCompositionId)
    : null;
  if (!comp) return config;
  const layer = comp.layers.find((l: any) => l.id === linkedLayerId);
  if (!layer) return config;
  const t3d = layer.transform3D;
  return {
    ...config,
    x: t3d ? t3d.position.x : layer.transform.position.x,
    y: t3d ? t3d.position.y : layer.transform.position.y,
    z: t3d ? t3d.position.z : 0,
  };
}