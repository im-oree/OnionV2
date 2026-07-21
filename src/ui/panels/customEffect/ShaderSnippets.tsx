/**
 * ShaderSnippets — a click-to-copy library of common GLSL helper functions
 * users can paste into their shaders.
 */
import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface Snippet {
  id: string;
  title: string;
  description: string;
  code: string;
}

const SNIPPETS: Snippet[] = [
  {
    id: 'luminance',
    title: 'luminance()',
    description: 'Perceptual brightness of an RGB colour.',
    code: `float luminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}`,
  },
  {
    id: 'rgb2hsv',
    title: 'rgb2hsv() / hsv2rgb()',
    description: 'Convert between RGB and HSV colour spaces.',
    code: `vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}`,
  },
  {
    id: 'hash',
    title: 'hash() (fast pseudo-random)',
    description: 'Deterministic per-pixel randomness. Same input → same output.',
    code: `float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}`,
  },
  {
    id: 'noise',
    title: 'noise() (value noise)',
    description: 'Smooth 2D noise from hash. Range 0..1.',
    code: `float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i),               hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y);
}`,
  },
  {
    id: 'fbm',
    title: 'fbm() (fractal brownian motion)',
    description: 'Multi-octave noise for clouds, terrain, textures.',
    code: `// Requires: float noise(vec2 p) above.
float fbm(vec2 p) {
  float v = 0.0, amp = 0.5;
  for (int i = 0; i < 5; i++) {
    v   += amp * noise(p);
    p   *= 2.0;
    amp *= 0.5;
  }
  return v;
}`,
  },
  {
    id: 'palette',
    title: 'palette() (cosine palette)',
    description: 'Smooth colour ramp from four vec3 controls. Great for gradients.',
    code: `// Inigo Quilez cosine palettes.
// Try a=vec3(0.5), b=vec3(0.5), c=vec3(1.0), d=vec3(0.0, 0.33, 0.67)
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}`,
  },
  {
    id: 'rotate2d',
    title: 'rotate2D()',
    description: 'Rotate a 2D point/UV around origin.',
    code: `vec2 rotate2D(vec2 p, float angleRad) {
  float c = cos(angleRad), s = sin(angleRad);
  return mat2(c, -s, s, c) * p;
}`,
  },
  {
    id: 'smoothMask',
    title: 'smoothMask()',
    description: 'Soft edge mask between two thresholds.',
    code: `float smoothMask(float value, float edge0, float edge1) {
  return smoothstep(edge0, edge1, value);
}`,
  },
  {
    id: 'sampleOffset',
    title: 'sampleOffset() (pixel-aware neighbour)',
    description: 'Sample the source at a pixel offset from the current pixel.',
    code: `// Usage: vec4 c = sampleOffset(vec2(3.0, 0.0));  // 3px right
vec4 sampleOffset(vec2 pixelOff) {
  return texture2D(uTexture, vUv + pixelOff / uResolution);
}`,
  },
  {
    id: 'sobel',
    title: 'sobel() edge detection',
    description: 'Detect edges using Sobel operator. Returns magnitude 0..1.',
    code: `float sobelEdge() {
  vec2 px = 1.0 / uResolution;
  float l00 = luminance(texture2D(uTexture, vUv + vec2(-px.x, -px.y)).rgb);
  float l10 = luminance(texture2D(uTexture, vUv + vec2(   0., -px.y)).rgb);
  float l20 = luminance(texture2D(uTexture, vUv + vec2( px.x, -px.y)).rgb);
  float l01 = luminance(texture2D(uTexture, vUv + vec2(-px.x,   0.)).rgb);
  float l21 = luminance(texture2D(uTexture, vUv + vec2( px.x,   0.)).rgb);
  float l02 = luminance(texture2D(uTexture, vUv + vec2(-px.x, px.y)).rgb);
  float l12 = luminance(texture2D(uTexture, vUv + vec2(   0., px.y)).rgb);
  float l22 = luminance(texture2D(uTexture, vUv + vec2( px.x, px.y)).rgb);
  float gx = -l00 + l20 - 2.0*l01 + 2.0*l21 - l02 + l22;
  float gy = -l00 - 2.0*l10 - l20 + l02 + 2.0*l12 + l22;
  return clamp(sqrt(gx*gx + gy*gy), 0.0, 1.0);
}`,
  },
];

export const ShaderSnippets: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = async (snippet: Snippet) => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopiedId(snippet.id);
      setTimeout(() => setCopiedId((cur) => (cur === snippet.id ? null : cur)), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-2">
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        Snippet Library
      </div>
      <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
        Click any snippet to copy. Paste into your shader (usually above main()).
      </div>
      {SNIPPETS.map(s => (
        <div key={s.id} style={{
          border: '1px solid var(--color-border)',
          borderRadius: 4,
          background: 'var(--color-panel)',
        }}>
          <div className="flex items-center gap-2" style={{ padding: '4px 6px', borderBottom: '1px solid var(--color-divider)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)', flex: 1, fontFamily: 'var(--font-family-mono)' }}>
              {s.title}
            </span>
            <button
              onClick={() => copy(s)}
              className="flex items-center gap-1 border-0 bg-transparent cursor-pointer"
              style={{
                fontSize: 10, color: copiedId === s.id ? '#22c55e' : 'var(--color-text-secondary)',
                padding: '2px 6px', borderRadius: 3,
              }}
            >
              {copiedId === s.id ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
            </button>
          </div>
          <div style={{ padding: '4px 6px', fontSize: 10, color: 'var(--color-text-tertiary)', borderBottom: '1px solid var(--color-divider)' }}>
            {s.description}
          </div>
          <pre style={{
            margin: 0,
            padding: '6px 8px',
            fontSize: 10,
            lineHeight: '14px',
            color: '#c8ccd4',
            background: '#0d0f14',
            fontFamily: 'var(--font-family-mono)',
            overflowX: 'auto',
            whiteSpace: 'pre',
          }}>
            {s.code}
          </pre>
        </div>
      ))}
    </div>
  );
};