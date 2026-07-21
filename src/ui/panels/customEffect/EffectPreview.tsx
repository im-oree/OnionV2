/**
 * EffectPreview — small live preview that renders the custom effect
 * against a sample gradient image. Updates on shader/param changes.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import type { CustomEffectDefinition } from '../../../types/customEffect';
import { DEFAULT_VERTEX_SHADER } from '../../../renderer/effects/library/types';
import { compileShader, type CompileResult } from '../../../renderer/effects/customEffectAdapter';

const PREVIEW_SIZE = 128;

interface Props {
  def: CustomEffectDefinition;
  onCompileResult: (result: CompileResult) => void;
}

export const EffectPreview: React.FC<Props> = ({ def, onCompileResult }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create the Three.js renderer once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
    r.setSize(PREVIEW_SIZE, PREVIEW_SIZE);
    rendererRef.current = r;
    return () => { r.dispose(); rendererRef.current = null; };
  }, []);

  // Render preview whenever def changes (debounced)
  const renderPreview = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    // Validate first
    const compResult = compileShader(def.fragmentShader, def.vertexShader, def.parameters);
    onCompileResult(compResult);

    if (!compResult.ok) {
      setLastError(compResult.error ?? 'Compile failed');
      return;
    }
    setLastError(null);

    try {
      // Build sample texture (gradient)
      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = PREVIEW_SIZE;
      sampleCanvas.height = PREVIEW_SIZE;
      const ctx = sampleCanvas.getContext('2d')!;
      const g = ctx.createLinearGradient(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
      g.addColorStop(0, '#3a6df0');
      g.addColorStop(0.5, '#f04e88');
      g.addColorStop(1, '#f5c542');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(PREVIEW_SIZE * 0.35, PREVIEW_SIZE * 0.35, PREVIEW_SIZE * 0.15, 0, Math.PI * 2);
      ctx.fill();

      const sampleTex = new THREE.CanvasTexture(sampleCanvas);
      sampleTex.colorSpace = THREE.SRGBColorSpace;
      sampleTex.needsUpdate = true;

      // Build uniforms
      const uniforms: Record<string, THREE.IUniform> = {
        uTexture: { value: sampleTex },
        uResolution: { value: new THREE.Vector2(PREVIEW_SIZE, PREVIEW_SIZE) },
        uTime: { value: 0 },
      };
      for (const p of def.parameters) {
        if (p.type === 'color') uniforms[p.uniform] = { value: new THREE.Color(p.value as string) };
        else if (p.type === 'vector2' && Array.isArray(p.value)) uniforms[p.uniform] = { value: new THREE.Vector2(p.value[0], p.value[1]) };
        else uniforms[p.uniform] = { value: p.value };
      }

      const mat = new THREE.ShaderMaterial({
        vertexShader: def.vertexShader ?? DEFAULT_VERTEX_SHADER,
        fragmentShader: def.fragmentShader,
        uniforms,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      });

      const scene = new THREE.Scene();
      const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const geo = new THREE.PlaneGeometry(2, 2);
      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);

      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(scene, cam);

      geo.dispose();
      mat.dispose();
      sampleTex.dispose();
    } catch (err) {
      setLastError((err as Error).message ?? 'Render failed');
    }
  }, [def, onCompileResult]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(renderPreview, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [renderPreview]);

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Preview
      </div>
      <div style={{
        width: PREVIEW_SIZE, height: PREVIEW_SIZE,
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <canvas ref={canvasRef} width={PREVIEW_SIZE} height={PREVIEW_SIZE}
          style={{ display: 'block', width: '100%', height: '100%' }} />
        {lastError && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 8,
          }}>
            <span style={{ fontSize: 10, color: '#ff5555', textAlign: 'center', wordBreak: 'break-all' }}>
              ⚠ Shader Error
            </span>
          </div>
        )}
      </div>
    </div>
  );
};