/**
 * CameraFrustumOverlay — renders a 3D camera frustum wireframe in Free View.
 * Shows what the composition camera sees with near/far plane, connecting edges,
 * and a draggable camera icon at the apex.
 */
import React, { useCallback, useRef, useState, useMemo } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useCameraSubscribe } from './hooks/useCameraSubscribe';
import type { CameraManager } from '../../../renderer/CameraManager';

interface Props {
  cameraManager: CameraManager | null;
  viewportSize: { width: number; height: number };
  isFreeView?: boolean;
}

// ── Constants ────────────────────────────────────────────────

const THEME = {
  primary: '#4A90E2',
  primaryDim: 'rgba(74,144,226,0.5)',
  primaryGlow: 'rgba(74,144,226,0.15)',
  nearFill: 'rgba(74,144,226,0.08)',
  farFill: 'rgba(74,144,226,0.03)',
  white: 'rgba(255,255,255,0.3)',
  labelColor: 'rgba(74,144,226,0.85)',
} as const;

const DRAG_SENSITIVITY = 0.003;
const PITCH_CLAMP = 1.2;

// ── Types ────────────────────────────────────────────────────

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface ScreenPt {
  x: number;
  y: number;
}

// ── Math helpers ─────────────────────────────────────────────

function normalize(x: number, y: number, z: number): Vec3 {
  const len = Math.hypot(x, y, z) || 1;
  return { x: x / len, y: y / len, z: z / len };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function frustumCorner(
  origin: Vec3,
  forward: Vec3,
  right: Vec3,
  up: Vec3,
  dist: number,
  halfW: number,
  halfH: number,
  sx: number,
  sy: number,
): Vec3 {
  return {
    x: origin.x + forward.x * dist + right.x * halfW * sx + up.x * halfH * sy,
    y: origin.y + forward.y * dist + right.y * halfW * sx + up.y * halfH * sy,
    z: origin.z + forward.z * dist + right.z * halfW * sx + up.z * halfH * sy,
  };
}

// ── Sub-components ───────────────────────────────────────────

const FrustumWireframe: React.FC<{
  near: ScreenPt[];
  far: ScreenPt[];
  apex: ScreenPt;
}> = React.memo(({ near, far, apex }) => {
  if (near.length < 4 || far.length < 4) return null;

  const [nTL, nTR, nBR, nBL] = near;
  const [fTL, fTR, fBR, fBL] = far;

  // Build line data: [from, to, opacity, dashArray]
  const edges: Array<[ScreenPt, ScreenPt, number, string]> = [
    // Near plane
    [nTL, nTR, 0.6, ''],
    [nTR, nBR, 0.6, ''],
    [nBR, nBL, 0.6, ''],
    [nBL, nTL, 0.6, ''],
    // Far plane
    [fTL, fTR, 0.35, '6 3'],
    [fTR, fBR, 0.35, '6 3'],
    [fBR, fBL, 0.35, '6 3'],
    [fBL, fTL, 0.35, '6 3'],
    // Connecting
    [nTL, fTL, 0.25, '4 4'],
    [nTR, fTR, 0.25, '4 4'],
    [nBR, fBR, 0.25, '4 4'],
    [nBL, fBL, 0.25, '4 4'],
    // Apex to near
    [apex, nTL, 0.2, '3 3'],
    [apex, nTR, 0.2, '3 3'],
    [apex, nBR, 0.2, '3 3'],
    [apex, nBL, 0.2, '3 3'],
  ];

  const nearPoly = near.map((p) => `${p.x},${p.y}`).join(' ');
  const farPoly = far.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <>
      {/* Plane fills */}
      <polygon points={nearPoly} fill={THEME.nearFill} stroke="none" />
      <polygon points={farPoly} fill={THEME.farFill} stroke="none" />

      {/* Edges */}
      {edges.map(([a, b, opacity, dash], i) => {
        if (!isFinite(a.x) || !isFinite(a.y) || !isFinite(b.x) || !isFinite(b.y)) {
          return null;
        }

        return (
          <line
            key={i}
            x1={a.x} y1={a.y}
            x2={b.x} y2={b.y}
            stroke={THEME.primary}
            strokeWidth={i < 4 ? 1.5 : 1}
            opacity={opacity}
            strokeDasharray={dash || undefined}
            strokeLinecap="round"
          />
        );
      })}
    </>
  );
});

FrustumWireframe.displayName = 'FrustumWireframe';

const CameraIcon: React.FC<{
  x: number;
  y: number;
  onDrag: (e: React.MouseEvent) => void;
}> = React.memo(({ x, y, onDrag }) => {
  if (!isFinite(x) || !isFinite(y)) return null;

  return (
    <g
      style={{
        pointerEvents: 'all',
        cursor: 'move',
      }}
      onMouseDown={onDrag}
    >
      {/* Hit area */}
      <circle
        cx={x} cy={y} r={16}
        fill="transparent"
      />

      {/* Glow ring */}
      <circle
        cx={x} cy={y} r={11}
        fill={THEME.primaryGlow}
        stroke={THEME.primary}
        strokeWidth={1.5}
      />

      {/* Camera body */}
      <rect
        x={x - 6} y={y - 4.5}
        width={12} height={9}
        rx={1.5}
        fill={THEME.primary}
        opacity={0.85}
      />

      {/* Lens barrel */}
      <circle
        cx={x} cy={y}
        r={3}
        fill="rgba(0,0,0,0.3)"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={0.8}
      />

      {/* Lens highlight */}
      <circle
        cx={x - 0.5} cy={y - 0.5}
        r={1.2}
        fill="rgba(255,255,255,0.35)"
      />

      {/* Viewfinder bump */}
      <rect
        x={x - 2} y={y - 6.5}
        width={4} height={2.5}
        rx={0.8}
        fill={THEME.primary}
        opacity={0.7}
      />
    </g>
  );
});

CameraIcon.displayName = 'CameraIcon';

// ── Main component ──────────────────────────────────────────

export const CameraFrustumOverlay: React.FC<Props> = ({
  cameraManager,
  viewportSize,
  isFreeView = false,
}) => {
  const [, forceUpdate] = useState(0);

  useCameraSubscribe(cameraManager, () => {
    forceUpdate((n) => n + 1);
  });

  const comp = useCompositionStore((s) =>
    s.activeCompositionId
      ? (s.compositions.find(
          (c) => c.id === s.activeCompositionId,
        ) ?? null)
      : null,
  );

  const compId = useCompositionStore(
    (s) => s.activeCompositionId,
  );

  // Drag ref to avoid stale closures
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startRotY: number;
    startRotX: number;
  } | null>(null);

  const handleDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!compId) return;

      const liveComp = useCompositionStore
        .getState()
        .compositions.find((c) => c.id === compId);

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startRotY: liveComp?.cameraRotationY ?? 0,
        startRotX: liveComp?.cameraRotationX ?? 0,
      };

      const onMove = (ev: MouseEvent) => {
        const d = dragRef.current;
        if (!d || !compId) return;

        const dx = ev.clientX - d.startX;
        const dy = ev.clientY - d.startY;

        useCompositionStore.getState().updateComposition(compId, {
          cameraRotationY: d.startRotY + dx * DRAG_SENSITIVITY,
          cameraRotationX: Math.max(
            -PITCH_CLAMP,
            Math.min(PITCH_CLAMP, d.startRotX + dy * DRAG_SENSITIVITY),
          ),
        });
      };

      const onUp = () => {
        dragRef.current = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [compId],
  );

  // Compute frustum geometry
  const frustum = useMemo(() => {
    if (!comp || !cameraManager) return null;

    const camZ = comp.cameraPositionZ ?? 1000;
    const rotX = comp.cameraRotationX ?? 0;
    const rotY = comp.cameraRotationY ?? 0;
    const panX = comp.cameraPositionX ?? 0;
    const panY = comp.cameraPositionY ?? 0;
    const fov = comp.cameraFOV ?? 50;

    if (camZ <= 0 || fov <= 0 || fov >= 180) return null;

    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);

    const origin: Vec3 = {
      x: camZ * sinY * cosX + panX,
      y: -camZ * sinX + panY,
      z: camZ * cosY * cosX,
    };

    const target: Vec3 = { x: panX, y: panY, z: 0 };

    const forward = normalize(
      target.x - origin.x,
      target.y - origin.y,
      target.z - origin.z,
    );

    // Derive right from world up (0,1,0) × forward
    const worldUp: Vec3 = { x: 0, y: 1, z: 0 };
    const rightRaw = cross(worldUp, forward);
    const right = normalize(rightRaw.x, rightRaw.y, rightRaw.z);

    // True up = forward × right
    const upRaw = cross(forward, right);
    const up = normalize(upRaw.x, upRaw.y, upRaw.z);

    const halfFovRad = (fov / 2) * (Math.PI / 180);
    const tanHalf = Math.tan(halfFovRad);

    const nearDist = Math.max(1, camZ * 0.03);
    const farDist = Math.max(nearDist * 2, Math.min(camZ * 1.5, 5000));

    const aspect = (viewportSize.width || 1) / (viewportSize.height || 1);

    const nearHalfH = tanHalf * nearDist;
    const nearHalfW = nearHalfH * aspect;
    const farHalfH = tanHalf * farDist;
    const farHalfW = farHalfH * aspect;

    const c = (
      dist: number,
      hw: number,
      hh: number,
      sx: number,
      sy: number,
    ) => frustumCorner(origin, forward, right, up, dist, hw, hh, sx, sy);

    const nearCorners = [
      c(nearDist, nearHalfW, nearHalfH, -1, 1),  // TL
      c(nearDist, nearHalfW, nearHalfH, 1, 1),   // TR
      c(nearDist, nearHalfW, nearHalfH, 1, -1),  // BR
      c(nearDist, nearHalfW, nearHalfH, -1, -1), // BL
    ];

    const farCorners = [
      c(farDist, farHalfW, farHalfH, -1, 1),
      c(farDist, farHalfW, farHalfH, 1, 1),
      c(farDist, farHalfW, farHalfH, 1, -1),
      c(farDist, farHalfW, farHalfH, -1, -1),
    ];

    return { origin, nearCorners, farCorners };
  }, [
    comp?.cameraPositionZ,
    comp?.cameraRotationX,
    comp?.cameraRotationY,
    comp?.cameraPositionX,
    comp?.cameraPositionY,
    comp?.cameraFOV,
    viewportSize.width,
    viewportSize.height,
    cameraManager,
  ]);

  // ── Early returns (all hooks above) ───────────────────────

  if (!cameraManager || !comp?.perspective3D || !isFreeView) {
    return null;
  }

  if (!frustum) return null;

  // ── Project to screen ─────────────────────────────────────

  const toScreen = (p: Vec3): ScreenPt =>
    cameraManager.worldToScreen(p.x, p.y, p.z);

  const nearScreen = frustum.nearCorners.map(toScreen);
  const farScreen = frustum.farCorners.map(toScreen);
  const apexScreen = toScreen(frustum.origin);

  // Validate all points
  const allPoints = [...nearScreen, ...farScreen, apexScreen];
  const allValid = allPoints.every(
    (p) => isFinite(p.x) && isFinite(p.y),
  );

  if (!allValid) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 26,
        overflow: 'visible',
      }}
      width={viewportSize.width}
      height={viewportSize.height}
      xmlns="http://www.w3.org/2000/svg"
    >
      <FrustumWireframe
        near={nearScreen}
        far={farScreen}
        apex={apexScreen}
      />

      <CameraIcon
        x={apexScreen.x}
        y={apexScreen.y}
        onDrag={handleDrag}
      />

      {/* Label */}
      <text
        x={apexScreen.x}
        y={apexScreen.y - 18}
        textAnchor="middle"
        fill={THEME.labelColor}
        fontSize={9}
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        CAM
      </text>
    </svg>
  );
};