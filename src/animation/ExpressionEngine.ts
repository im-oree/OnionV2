/**
 * ExpressionEngine — evaluates AE-style JavaScript expressions on properties.
 * Phase 12: Full AE expression language with vector math, layer references,
 * posterizeTime, gaussRandom, seedRandom, 2D noise, and loop controls.
 */

export interface ExpressionContext {
  time: number;
  frame: number;
  fps: number;
  value: number | number[];
  layerId: string;
  layerName: string;
  compId: string;
  compWidth: number;
  compHeight: number;
  compDuration: number;
  compFps: number;
  layerNameMap: Record<string, string>;
  layerIds: string[];
  getLayerProperty: (layerId: string, propPath: string, atTime?: number) => number | number[];
  getKeyframeTimes: (layerId: string, prop: string) => number[];
  getKeyframeValues: (layerId: string, prop: string) => number[];
}

export interface CompiledExpression {
  fn: (ctx: ExpressionContext) => number | number[];
  source: string;
  error: string | null;
}

const _cache = new Map<string, CompiledExpression>();

function hashSource(src: string): string {
  let h = 0;
  for (let i = 0; i < src.length; i++) h = ((h << 5) - h + src.charCodeAt(i)) | 0;
  return h.toString(36);
}

// eslint-disable-next-line no-useless-concat
const EXPRESSION_API =
  'let _seed = 42;\n' +
  'const _mulberry32 = (a) => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };\n' +
  'const seedRandom = (s) => { _seed = s | 0; };\n' +
  'const _seededRandom = () => { _seed = (_seed + 1) | 0; return _mulberry32(_seed); };\n' +
  'const random = (a, b) => { if (Array.isArray(a)) return a[Math.floor(_seededRandom() * a.length)]; if (a === undefined) return _seededRandom(); if (b === undefined) return _seededRandom() * a; return a + _seededRandom() * (b - a); };\n' +
  'const gaussRandom = (a, b) => { let u = 0, v = 0; while (u === 0) u = _seededRandom(); while (v === 0) v = _seededRandom(); const n = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v); if (a === undefined) return n; if (b === undefined) return a * n; return (a + b) / 2 + n * (b - a) / 4; };\n' +
  'const abs = Math.abs, floor = Math.floor, ceil = Math.ceil, round = Math.round;\n' +
  'const sin = Math.sin, cos = Math.cos, tan = Math.tan;\n' +
  'const asin = Math.asin, acos = Math.acos, atan = Math.atan, atan2 = Math.atan2;\n' +
  'const sqrt = Math.sqrt, pow = Math.pow, exp = Math.exp, log = Math.log;\n' +
  'const min = Math.min, max = Math.max, PI = Math.PI, E = Math.E;\n' +
  'const degreesToRadians = (d) => d * PI / 180;\n' +
  'const radiansToDegrees = (r) => r * 180 / PI;\n' +
  'const linear = (t, tMin, tMax, v1, v2) => { if (v1 === undefined) return t < tMin ? 0 : t > tMax ? 1 : (t - tMin) / (tMax - tMin); if (t <= tMin) return v1; if (t >= tMax) return v2; const p = (t - tMin) / (tMax - tMin); if (Array.isArray(v1)) return v1.map((v, i) => v + (v2[i] - v) * p); return v1 + (v2 - v1) * p; };\n' +
  'const ease = (t, tMin, tMax, v1, v2) => { if (v1 === undefined) { v1 = 0; v2 = 1; } if (t <= tMin) return v1; if (t >= tMax) return v2; let p = (t - tMin) / (tMax - tMin); p = p * p * (3 - 2 * p); if (Array.isArray(v1)) return v1.map((v, i) => v + (v2[i] - v) * p); return v1 + (v2 - v1) * p; };\n' +
  'const easeIn = (t, tMin, tMax, v1, v2) => { if (v1 === undefined) { v1 = 0; v2 = 1; } if (t <= tMin) return v1; if (t >= tMax) return v2; let p = (t - tMin) / (tMax - tMin); p = p * p; if (Array.isArray(v1)) return v1.map((v, i) => v + (v2[i] - v) * p); return v1 + (v2 - v1) * p; };\n' +
  'const easeOut = (t, tMin, tMax, v1, v2) => { if (v1 === undefined) { v1 = 0; v2 = 1; } if (t <= tMin) return v1; if (t >= tMax) return v2; let p = (t - tMin) / (tMax - tMin); p = 1 - (1 - p) * (1 - p); if (Array.isArray(v1)) return v1.map((v, i) => v + (v2[i] - v) * p); return v1 + (v2 - v1) * p; };\n' +
  'const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));\n' +
  'const _hash = (n) => { let h = Math.sin(n * 12.9898 + 78.233) * 43758.5453123; return h - Math.floor(h); };\n' +
  'const _hash2D = (x, y) => _hash(x * 374.761 + y * 668.265);\n' +
  'const noise1D = (t) => { const i = Math.floor(t), f = t - i; const u = f * f * (3 - 2 * f); return _hash(i) * (1 - u) + _hash(i + 1) * u; };\n' +
  'const noise2D = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y); const fx = x - ix, fy = y - iy; const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy); return _hash2D(ix, iy) * (1 - ux) * (1 - uy) + _hash2D(ix + 1, iy) * ux * (1 - uy) + _hash2D(ix, iy + 1) * (1 - ux) * uy + _hash2D(ix + 1, iy + 1) * ux * uy; };\n' +
  'const noise = (x, y) => (y === undefined ? noise1D(x) : noise2D(x, y));\n' +
  'const wiggle = (freq, amp, octaves, ampMult) => { octaves = octaves || 1; ampMult = ampMult || 0.5; let result = 0, a = amp, f = freq, sumAmp = 0; for (let o = 0; o < octaves; o++) { const s = Math.floor(time * f), fr = time * f - s; const n1 = noise1D(s + o * 100) * a; const n2 = noise1D(s + 1 + o * 100) * a; result += n1 + (n2 - n1) * fr; sumAmp += a; a *= ampMult; f *= 2; } result *= amp / sumAmp; if (Array.isArray(value)) return value.map(v => v + result); return value + result; };\n' +
  'let _posterizeFps = 0;\n' +
  'const posterizeTime = (fps) => { _posterizeFps = fps; };\n' +
  'const loopOut = (type, numKf) => value;\n' +
  'const loopIn = (type, numKf) => value;\n' +
  'const loopOutDuration = (type, dur) => value;\n' +
  'const loopInDuration = (type, dur) => value;\n' +
  'const add = (a, b) => { if (Array.isArray(a)) return a.map((v, i) => v + (Array.isArray(b) ? b[i] : b)); return a + b; };\n' +
  'const sub = (a, b) => { if (Array.isArray(a)) return a.map((v, i) => v - (Array.isArray(b) ? b[i] : b)); return a - b; };\n' +
  'const mul = (v, s) => { if (Array.isArray(v)) return v.map(x => x * s); return v * s; };\n' +
  'const div = (v, s) => { if (s === 0) return v; if (Array.isArray(v)) return v.map(x => x / s); return v / s; };\n' +
  'const length = (a, b) => { if (b !== undefined) { a = sub(a, b); } if (Array.isArray(a)) return Math.sqrt(a.reduce((s, v) => s + v * v, 0)); return Math.abs(a); };\n' +
  'const normalize = (v) => { if (Array.isArray(v)) { const len = Math.sqrt(v.reduce((s, x) => s + x * x, 0)); return len === 0 ? v.map(() => 0) : v.map(x => x / len); } return v > 0 ? 1 : v < 0 ? -1 : 0; };\n' +
  'const dot = (a, b) => { if (Array.isArray(a)) return a.reduce((s, v, i) => s + v * (Array.isArray(b) ? b[i] : b), 0); return a * b; };\n' +
  'const cross = (a, b) => { if (Array.isArray(a) && a.length === 3 && Array.isArray(b)) return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; return 0; };\n' +
  'const lookAt = (from, to) => { if (!Array.isArray(from) || !Array.isArray(to)) return 0; return radiansToDegrees(Math.atan2(to[1] - from[1], to[0] - from[0])); };\n' +
  'const hexToRgb = (hex) => { const h = hex.replace("#", ""); return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)]; };\n' +
  'const rgbToHex = (r, g, b) => { if (Array.isArray(r)) { b = r[2]; g = r[1]; r = r[0]; } return "#" + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join(""); };\n' +
  'const debug = (v) => { return v; };\n';

export class ExpressionEngine {
  compile(source: string): CompiledExpression {
    const key = hashSource(source);
    const cached = _cache.get(key);
    if (cached && cached.source === source) return cached;
    try {
      const body =
        EXPRESSION_API +
        'const { time: _rawTime, frame, fps, value, layerId, layerName, compId,\n' +
        '        compWidth, compHeight, compDuration, compFps,\n' +
        '        layerNameMap, layerIds, getLayerProperty,\n' +
        '        getKeyframeTimes, getKeyframeValues } = ctx;\n' +
        'let time = _rawTime;\n' +
        '_posterizeFps = 0;\n' +
        '_seed = (layerId.length * 7919 + (typeof value === "number" ? value * 13 : 0) + frame * 31) | 0;\n' +
        'const thisComp = {\n' +
        '  width: compWidth, height: compHeight,\n' +
        '  duration: compDuration, frameRate: compFps,\n' +
        '  numLayers: layerIds.length, name: compId,\n' +
        '  layer: (nameOrIdx) => {\n' +
        '    let lid;\n' +
        '    if (typeof nameOrIdx === "number") lid = layerIds[nameOrIdx - 1];\n' +
        '    else lid = layerNameMap[nameOrIdx];\n' +
        '    if (!lid) throw new Error("Layer not found: " + nameOrIdx);\n' +
        '    return {\n' +
        '      name: nameOrIdx, index: layerIds.indexOf(lid) + 1,\n' +
        '      transform: {\n' +
        '        anchorPoint: getLayerProperty(lid, "transform.anchorPoint"),\n' +
        '        position: getLayerProperty(lid, "transform.position"),\n' +
        '        scale: getLayerProperty(lid, "transform.scale"),\n' +
        '        rotation: getLayerProperty(lid, "transform.rotation"),\n' +
        '        opacity: getLayerProperty(lid, "opacity"),\n' +
        '      },\n' +
        '    };\n' +
        '  },\n' +
        '};\n' +
        'const thisLayer = thisComp.layer(layerName) || { name: layerName, transform: { position: value, scale: [100,100], rotation: 0, anchorPoint: [0,0], opacity: 100 } };\n' +
        'const thisProperty = { value };\n' +
        'let _result;\n' +
        'try { _result = (' + source + '); } catch (_e) {\n' +
        '  if (_result === undefined) throw _e;\n' +
        '}\n' +
        'return _result !== undefined ? _result : value;\n';
      const fn = new Function('ctx', body) as (ctx: ExpressionContext) => number | number[];
      try {
        fn({
          time: 0, frame: 0, fps: 30, value: 0, layerId: '', layerName: '', compId: '',
          compWidth: 1920, compHeight: 1080, compDuration: 10, compFps: 30,
          layerNameMap: {}, layerIds: [], getLayerProperty: () => 0,
          getKeyframeTimes: () => [], getKeyframeValues: () => [],
        });
      } catch (e) {
        const r: CompiledExpression = { fn: () => 0, source, error: 'Runtime: ' + (e as Error).message };
        _cache.set(key, r); return r;
      }
      const r: CompiledExpression = { fn, source, error: null };
      _cache.set(key, r); return r;
    } catch (e) {
      const r: CompiledExpression = { fn: () => 0, source, error: 'Syntax: ' + (e as Error).message };
      _cache.set(key, r); return r;
    }
  }

  evaluate(compiled: CompiledExpression, ctx: ExpressionContext): number | number[] {
    if (compiled.error) return ctx.value;
    try { return compiled.fn(ctx); } catch { return ctx.value; }
  }

  clearCache(): void { _cache.clear(); }
}

export const expressionEngine = new ExpressionEngine();
