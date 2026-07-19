export interface PathBuildContext {
  width: number; height: number;
  params: Record<string, number>;
}

export type PathBuilder = (ctx: PathBuildContext) => string;

const TAU = Math.PI * 2;

function roundedRect(w: number, h: number, r: number): string {
  const hw = w/2, hh = h/2;
  const rc = Math.min(r, hw, hh);
  if (rc <= 0) return `M${-hw} ${-hh} L${hw} ${-hh} L${hw} ${hh} L${-hw} ${hh} Z`;
  return `M${-hw+rc} ${-hh}
    L${hw-rc} ${-hh} Q${hw} ${-hh} ${hw} ${-hh+rc}
    L${hw} ${hh-rc} Q${hw} ${hh} ${hw-rc} ${hh}
    L${-hw+rc} ${hh} Q${-hw} ${hh} ${-hw} ${hh-rc}
    L${-hw} ${-hh+rc} Q${-hw} ${-hh} ${-hw+rc} ${-hh} Z`;
}

function regularPolygon(radius: number, sides: number, roundness: number, rotationDeg: number): string {
  const n = Math.max(3, Math.round(sides));
  const rot = (rotationDeg * Math.PI) / 180 - Math.PI / 2;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU;
    pts.push([Math.cos(a) * radius, Math.sin(a) * radius]);
  }
  return polyPath(pts, roundness);
}

function starPath(outer: number, inner: number, points: number, roundness: number, rotationDeg: number): string {
  const n = Math.max(3, Math.round(points));
  const rot = (rotationDeg * Math.PI) / 180 - Math.PI / 2;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i / (n * 2)) * TAU;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return polyPath(pts, roundness);
}

function polyPath(pts: Array<[number, number]>, roundness: number): string {
  if (pts.length === 0) return '';
  if (roundness <= 0) {
    return `M${pts[0][0]} ${pts[0][1]} ` + pts.slice(1).map(p => `L${p[0]} ${p[1]}`).join(' ') + ' Z';
  }
  const r = Math.max(0, Math.min(1, roundness));
  const parts: string[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];
    const [pIn, pOut] = cornerPoints(prev, curr, next, r);
    if (i === 0) parts.push(`M${pIn[0]} ${pIn[1]}`);
    else parts.push(`L${pIn[0]} ${pIn[1]}`);
    parts.push(`Q${curr[0]} ${curr[1]} ${pOut[0]} ${pOut[1]}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

function cornerPoints(prev: [number,number], curr: [number,number], next: [number,number], r: number): [[number,number],[number,number]] {
  const vin = [curr[0]-prev[0], curr[1]-prev[1]] as [number,number];
  const vout = [next[0]-curr[0], next[1]-curr[1]] as [number,number];
  const lin = Math.hypot(vin[0], vin[1]);
  const lout = Math.hypot(vout[0], vout[1]);
  const din = Math.min(lin, lout) * 0.5 * r;
  const nin: [number,number] = [-vin[0]/lin*din, -vin[1]/lin*din];
  const nout: [number,number] = [vout[0]/lout*din, vout[1]/lout*din];
  return [[curr[0]+nin[0], curr[1]+nin[1]], [curr[0]+nout[0], curr[1]+nout[1]]];
}

function ellipsePath(rx: number, ry: number): string {
  const k = 0.5522847498;
  return `M${-rx} 0 C${-rx} ${-ry*k} ${-rx*k} ${-ry} 0 ${-ry}
    C${rx*k} ${-ry} ${rx} ${-ry*k} ${rx} 0
    C${rx} ${ry*k} ${rx*k} ${ry} 0 ${ry}
    C${-rx*k} ${ry} ${-rx} ${ry*k} ${-rx} 0 Z`;
}

// Deterministic pseudo-random for blob seeds
function seededRand(seed: number): () => number {
  let s = seed | 0 || 1;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

export const PATH_BUILDERS: Record<string, PathBuilder> = {
  rectangle: ({ width, height, params }) => roundedRect(width, height, params.roundness ?? 0),

  roundedSquare: ({ width, height, params }) => roundedRect(width, height, params.roundness ?? 24),

  ellipse: ({ width, height }) => ellipsePath(width/2, height/2),

  circle: ({ width, height }) => {
    const r = Math.min(width, height) / 2;
    return ellipsePath(r, r);
  },

  capsule: ({ width, height }) => roundedRect(width, height, Math.min(width, height)/2),

  polygon: ({ width, params }) => regularPolygon(width/2, params.sides ?? 6, params.roundness ?? 0, params.rotation ?? 0),
  triangle: ({ width, params }) => regularPolygon(width/2, 3, params.roundness ?? 0, params.rotation ?? 0),
  pentagon: ({ width, params }) => regularPolygon(width/2, 5, params.roundness ?? 0, params.rotation ?? 0),
  hexagon: ({ width, params }) => regularPolygon(width/2, 6, params.roundness ?? 0, params.rotation ?? 0),
  heptagon: ({ width, params }) => regularPolygon(width/2, 7, params.roundness ?? 0, params.rotation ?? 0),
  octagon: ({ width, params }) => regularPolygon(width/2, 8, params.roundness ?? 0, params.rotation ?? 0),

  rightTriangle: ({ width, height, params }) => {
    const hw = width/2, hh = height/2;
    const rot = (params.rotation ?? 0);
    void rot;
    return `M${-hw} ${-hh} L${hw} ${hh} L${-hw} ${hh} Z`;
  },

  star: ({ width, params }) => {
    const outer = width/2, inner = outer * (params.innerRatio ?? 0.5);
    return starPath(outer, inner, params.points ?? 5, params.roundness ?? 0, params.rotation ?? 0);
  },
  starBurst: ({ width, params }) => {
    const outer = width/2, inner = outer * (params.innerRatio ?? 0.75);
    return starPath(outer, inner, params.points ?? 12, params.roundness ?? 0, params.rotation ?? 0);
  },
  sparkle: ({ width, params }) => {
    const outer = width/2, inner = outer * (params.innerRatio ?? 0.2);
    return starPath(outer, inner, params.points ?? 4, 0, params.rotation ?? 0);
  },

  ring: ({ width, height, params }) => {
    const rxO = width/2, ryO = height/2;
    const t = params.thickness ?? 0.25;
    const rxI = rxO * (1-t), ryI = ryO * (1-t);
    return ellipsePath(rxO, ryO) + ' ' + ellipsePath(rxI, ryI).replace('M', 'M').replace(/Z/g, 'Z');
  },

  semiCircle: ({ width, height }) => {
    const rx = width/2, ry = height;
    const k = 0.5522847498;
    return `M${-rx} 0 C${-rx} ${-ry*k} ${-rx*k} ${-ry} 0 ${-ry}
      C${rx*k} ${-ry} ${rx} ${-ry*k} ${rx} 0 Z`;
  },

  quarterCircle: ({ width, height }) => {
    const w = width, h = height;
    const k = 0.5522847498;
    return `M${-w/2} ${h/2} L${-w/2} ${-h/2 + h*(1-k)} C${-w/2} ${-h/2} ${-w/2 + w*(1-k)} ${-h/2} ${w/2} ${-h/2}
      L${w/2} ${h/2} Z`;
  },

  chatbox: ({ width, height, params }) => {
    const r = params.roundness ?? 12;
    const tailW = params.tailWidth ?? 20;
    const tailH = params.tailHeight ?? 18;
    const tailX = params.tailX ?? -0.3;
    const hw = width/2, hh = height/2;
    const bodyBottom = hh - tailH;
    const rc = Math.min(r, hw, bodyBottom);
    const tx = tailX * hw;
    return `M${-hw+rc} ${-hh}
      L${hw-rc} ${-hh} Q${hw} ${-hh} ${hw} ${-hh+rc}
      L${hw} ${bodyBottom-rc} Q${hw} ${bodyBottom} ${hw-rc} ${bodyBottom}
      L${tx+tailW/2} ${bodyBottom}
      L${tx} ${hh}
      L${tx-tailW/2} ${bodyBottom}
      L${-hw+rc} ${bodyBottom} Q${-hw} ${bodyBottom} ${-hw} ${bodyBottom-rc}
      L${-hw} ${-hh+rc} Q${-hw} ${-hh} ${-hw+rc} ${-hh} Z`;
  },

  heart: ({ width, height }) => {
    const w = width, h = height;
    return `M0 ${h*0.35}
      C${-w*0.15} ${h*0.05} ${-w*0.5} ${h*0.05} ${-w*0.5} ${-h*0.15}
      C${-w*0.5} ${-h*0.35} ${-w*0.25} ${-h*0.5} 0 ${-h*0.2}
      C${w*0.25} ${-h*0.5} ${w*0.5} ${-h*0.35} ${w*0.5} ${-h*0.15}
      C${w*0.5} ${h*0.05} ${w*0.15} ${h*0.05} 0 ${h*0.35} Z`;
  },

  arrow: ({ width, height, params }) => {
    const headW = (params.headWidth ?? 0.4) * width;
    const shaftH = (params.shaftHeight ?? 0.4) * height;
    const hw = width/2, hh = height/2, sh = shaftH/2;
    const shaftEnd = hw - headW;
    return `M${-hw} ${-sh} L${shaftEnd} ${-sh} L${shaftEnd} ${-hh}
      L${hw} 0 L${shaftEnd} ${hh} L${shaftEnd} ${sh} L${-hw} ${sh} Z`;
  },

  arrowDouble: ({ width, height, params }) => {
    const headW = (params.headWidth ?? 0.25) * width;
    const shaftH = (params.shaftHeight ?? 0.35) * height;
    const hw = width/2, hh = height/2, sh = shaftH/2;
    const shaftEndR = hw - headW;
    const shaftEndL = -hw + headW;
    return `M${-hw} 0 L${shaftEndL} ${-hh} L${shaftEndL} ${-sh}
      L${shaftEndR} ${-sh} L${shaftEndR} ${-hh} L${hw} 0
      L${shaftEndR} ${hh} L${shaftEndR} ${sh}
      L${shaftEndL} ${sh} L${shaftEndL} ${hh} Z`;
  },

  chevron: ({ width, height, params }) => {
    const t = (params.thickness ?? 0.3) * width;
    const hw = width/2, hh = height/2;
    return `M${-hw} ${-hh} L${-hw+t} ${-hh} L${hw} 0 L${-hw+t} ${hh} L${-hw} ${hh} L${hw-t} 0 Z`;
  },

  cross: ({ width, height, params }) => {
    const t = params.thickness ?? 0.3;
    const hw = width/2, hh = height/2;
    const tw = width*t/2, th = height*t/2;
    return `M${-tw} ${-hh} L${tw} ${-hh} L${tw} ${-th} L${hw} ${-th}
      L${hw} ${th} L${tw} ${th} L${tw} ${hh} L${-tw} ${hh}
      L${-tw} ${th} L${-hw} ${th} L${-hw} ${-th} L${-tw} ${-th} Z`;
  },

  checkmark: ({ width, height, params }) => {
    const t = (params.thickness ?? 0.15) * height;
    const hw = width/2, hh = height/2;
    return `M${-hw + t*0.5} 0
      L${-hw*0.15} ${hh - t*0.5}
      L${hw - t*0.5} ${-hh + t*0.5}
      L${hw - t*1.5} ${-hh + t*1.5}
      L${-hw*0.15} ${hh - t*1.8}
      L${-hw + t*1.8} 0 Z`;
  },

  gear: ({ width, params }) => {
    const r = width/2;
    const teeth = Math.max(6, Math.round(params.teeth ?? 12));
    const toothDepth = (params.toothDepth ?? 0.15) * r;
    const innerR = r - toothDepth;
    const pts: Array<[number,number]> = [];
    const per = TAU / (teeth * 2);
    for (let i = 0; i < teeth * 2; i++) {
      const a = i * per - Math.PI/2;
      const rr = i % 2 === 0 ? r : innerR;
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    return polyPath(pts, 0);
  },

  drop: ({ width, height }) => {
    const w = width, h = height;
    return `M0 ${-h/2}
      C${w*0.35} ${-h*0.1} ${w/2} ${h*0.15} ${w/2} ${h*0.25}
      C${w/2} ${h*0.5} 0 ${h*0.55} 0 ${h*0.55}
      C0 ${h*0.55} ${-w/2} ${h*0.5} ${-w/2} ${h*0.25}
      C${-w/2} ${h*0.15} ${-w*0.35} ${-h*0.1} 0 ${-h/2} Z`;
  },

  cloud: ({ width, height }) => {
    const w = width, h = height;
    const r1 = h*0.35, r2 = h*0.4, r3 = h*0.3;
    return `M${-w*0.4} ${h*0.15}
      A${r1} ${r1} 0 0 1 ${-w*0.15} ${-h*0.15}
      A${r2} ${r2} 0 0 1 ${w*0.2} ${-h*0.2}
      A${r3} ${r3} 0 0 1 ${w*0.4} ${h*0.15}
      A${r1*0.8} ${r1*0.8} 0 0 1 ${w*0.15} ${h*0.35}
      L${-w*0.2} ${h*0.35}
      A${r1*0.9} ${r1*0.9} 0 0 1 ${-w*0.4} ${h*0.15} Z`;
  },

  moon: ({ width, height, params }) => {
    const rx = width/2, ry = height/2;
    const phase = params.phase ?? 0.5;
    const offset = (1 - phase) * width;
    const k = 0.5522847498;
    return `M0 ${-ry}
      C${rx*k} ${-ry} ${rx} ${-ry*k} ${rx} 0
      C${rx} ${ry*k} ${rx*k} ${ry} 0 ${ry}
      C${(offset - rx)*k} ${ry} ${offset - rx} ${ry*k} ${offset - rx} 0
      C${offset - rx} ${-ry*k} ${(offset - rx)*k} ${-ry} 0 ${-ry} Z`;
  },

  sun: ({ width, params }) => {
    const r = width/2;
    const rays = Math.max(4, Math.round(params.rays ?? 8));
    const rayLen = (params.rayLength ?? 0.35) * r;
    const innerR = r - rayLen;
    const rayW = 0.5;
    const pts: Array<[number,number]> = [];
    const per = TAU / (rays * 2);
    for (let i = 0; i < rays * 2; i++) {
      const a = i * per - Math.PI/2;
      const rr = i % 2 === 0 ? r : innerR * (1 + rayW * 0.1);
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    return polyPath(pts, 0.3);
  },

  shield: ({ width, height }) => {
    const w = width, h = height;
    const hw = w/2, hh = h/2;
    return `M${-hw} ${-hh}
      L${hw} ${-hh}
      L${hw} ${hh*0.1}
      C${hw} ${hh*0.5} ${hw*0.6} ${hh*0.85} 0 ${hh}
      C${-hw*0.6} ${hh*0.85} ${-hw} ${hh*0.5} ${-hw} ${hh*0.1} Z`;
  },

  badge: ({ width, params }) => {
    const r = width/2;
    const bumps = Math.max(6, Math.round(params.bumps ?? 12));
    const depth = (params.depth ?? 0.08) * r;
    const pts: Array<[number,number]> = [];
    const per = TAU / (bumps * 2);
    for (let i = 0; i < bumps * 2; i++) {
      const a = i * per - Math.PI/2;
      const rr = i % 2 === 0 ? r : r - depth;
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    return polyPath(pts, 0.8);
  },

  lightning: ({ width, height }) => {
    const w = width, h = height;
    return `M${-w*0.15} ${-h/2}
      L${w*0.25} ${-h/2} L${w*0.05} ${-h*0.05}
      L${w*0.3} ${-h*0.05} L${-w*0.1} ${h/2}
      L${w*0.1} ${h*0.05} L${-w*0.25} ${h*0.05} Z`;
  },

  wave: ({ width, height, params }) => {
    const w = width, h = height;
    const amp = (params.amplitude ?? 0.5) * h/2;
    const freq = params.frequency ?? 2;
    const segments = 40;
    const parts: string[] = [`M${-w/2} ${h/2}`, `L${-w/2} 0`];
    for (let i = 0; i <= segments; i++) {
      const x = -w/2 + (i/segments) * w;
      const y = -Math.sin((i/segments) * Math.PI * 2 * freq) * amp;
      parts.push(`L${x} ${y}`);
    }
    parts.push(`L${w/2} ${h/2} Z`);
    return parts.join(' ');
  },

  zigzag: ({ width, height, params }) => {
    const w = width, h = height;
    const teeth = Math.max(3, Math.round(params.teeth ?? 8));
    const step = w / teeth;
    const parts: string[] = [`M${-w/2} ${h/2}`, `L${-w/2} ${-h/2}`];
    for (let i = 0; i < teeth; i++) {
      const x = -w/2 + step * (i + 0.5);
      parts.push(`L${x} ${h/2}`);
      parts.push(`L${-w/2 + step * (i + 1)} ${-h/2}`);
    }
    parts.push(`L${w/2} ${h/2} Z`);
    return parts.join(' ');
  },

  flower: ({ width, params }) => {
    const r = width/2;
    const petals = Math.max(3, Math.round(params.petals ?? 6));
    const depth = params.depth ?? 0.4;
    const inner = r * (1 - depth);
    const pts: Array<[number,number]> = [];
    const per = TAU / (petals * 2);
    for (let i = 0; i < petals * 2; i++) {
      const a = i * per - Math.PI/2;
      const rr = i % 2 === 0 ? r : inner;
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    return polyPath(pts, 0.85);
  },

  blob: ({ width, height, params }) => {
    const w = width/2, h = height/2;
    const points = Math.max(4, Math.round(params.points ?? 6));
    const irr = params.irregularity ?? 0.15;
    const rand = seededRand((params.seed ?? 1) | 0);
    const pts: Array<[number,number]> = [];
    for (let i = 0; i < points; i++) {
      const a = (i/points) * TAU - Math.PI/2;
      const jitter = 1 + (rand() - 0.5) * irr * 2;
      pts.push([Math.cos(a) * w * jitter, Math.sin(a) * h * jitter]);
    }
    return polyPath(pts, 1);
  },

  diamond: ({ width, height, params }) =>
    polyPath([[0,-height/2],[width/2,0],[0,height/2],[-width/2,0]], params.roundness ?? 0),

  parallelogram: ({ width, height, params }) => {
    const skew = (params.skew ?? 0.2) * width;
    const hw = width/2, hh = height/2;
    return `M${-hw+skew} ${-hh} L${hw} ${-hh} L${hw-skew} ${hh} L${-hw} ${hh} Z`;
  },

  trapezoid: ({ width, height, params }) => {
    const topRatio = params.topRatio ?? 0.5;
    const hw = width/2, hh = height/2;
    const topW = hw * topRatio;
    return `M${-topW} ${-hh} L${topW} ${-hh} L${hw} ${hh} L${-hw} ${hh} Z`;
  },

  tag: ({ width, height, params }) => {
    const notch = (params.notch ?? 0.15) * width;
    const r = params.roundness ?? 10;
    const hw = width/2, hh = height/2;
    const rc = Math.min(r, hh);
    return `M${-hw} 0 L${-hw + notch} ${-hh}
      L${hw - rc} ${-hh} Q${hw} ${-hh} ${hw} ${-hh + rc}
      L${hw} ${hh - rc} Q${hw} ${hh} ${hw - rc} ${hh}
      L${-hw + notch} ${hh} Z`;
  },

  ribbon: ({ width, height, params }) => {
    const notch = (params.notch ?? 0.1) * width;
    const hw = width/2, hh = height/2;
    return `M${-hw} ${-hh} L${hw} ${-hh} L${hw - notch} 0 L${hw} ${hh}
      L${-hw} ${hh} L${-hw + notch} 0 Z`;
  },
};