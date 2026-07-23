/**
 * audioEffects — Web Audio effect factories.
 *
 * Each factory returns an EffectNode with:
 *   input, output — GainNodes to chain
 *   setParam(name, value) — update a param at runtime
 *   dispose() — disconnect + release
 */
import type { AudioEffectType } from '../../types/layer';

export interface EffectNode {
  input: AudioNode;
  output: AudioNode;
  setParam(name: string, value: number): void;
  setMix(mix: number): void;
  dispose(): void;
}

// ── Reverb (convolver with generated impulse) ───────────────
export function createReverb(ctx: AudioContext, params: {
  roomSize?: number; // 0..1
  decay?: number;    // seconds
} = {}): EffectNode {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const conv = ctx.createConvolver();

  input.connect(dry);
  input.connect(conv);
  conv.connect(wet);
  dry.connect(output);
  wet.connect(output);

  let currentDecay = params.decay ?? 2;
  let currentRoom = params.roomSize ?? 0.5;

  const buildImpulse = () => {
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * currentDecay));
    const impulse = ctx.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const decayCurve = Math.pow(1 - i / length, 2 + currentRoom * 4);
        data[i] = (Math.random() * 2 - 1) * decayCurve;
      }
    }
    conv.buffer = impulse;
  };
  buildImpulse();

  return {
    input, output,
    setParam(name, value) {
      if (name === 'roomSize') { currentRoom = value; buildImpulse(); }
      else if (name === 'decay') { currentDecay = value; buildImpulse(); }
    },
    setMix(mix) {
      wet.gain.value = mix;
      dry.gain.value = 1 - mix;
    },
    dispose() {
      try { input.disconnect(); dry.disconnect(); wet.disconnect(); conv.disconnect(); output.disconnect(); } catch {}
    },
  };
}

// ── Delay (with feedback) ──────────────────────────────────
export function createDelay(ctx: AudioContext, params: {
  time?: number;      // seconds
  feedback?: number;  // 0..0.95
} = {}): EffectNode {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const delay = ctx.createDelay(5);
  const feedback = ctx.createGain();

  delay.delayTime.value = params.time ?? 0.3;
  feedback.gain.value = params.feedback ?? 0.4;

  input.connect(dry);
  input.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  dry.connect(output);
  wet.connect(output);

  return {
    input, output,
    setParam(name, value) {
      if (name === 'time') delay.delayTime.value = Math.max(0, Math.min(5, value));
      else if (name === 'feedback') feedback.gain.value = Math.max(0, Math.min(0.95, value));
    },
    setMix(mix) {
      wet.gain.value = mix;
      dry.gain.value = 1 - mix * 0.3;
    },
    dispose() {
      try { input.disconnect(); dry.disconnect(); wet.disconnect(); delay.disconnect(); feedback.disconnect(); output.disconnect(); } catch {}
    },
  };
}

// ── Distortion (WaveShaper) ────────────────────────────────
export function createDistortion(ctx: AudioContext, params: {
  amount?: number;  // 0..100
  tone?: number;    // 0..1 (low-pass cutoff)
} = {}): EffectNode {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2000 + (params.tone ?? 0.5) * 8000;

  const makeCurve = (amount: number) => {
    const n = 44100;
    const curve = new Float32Array(n);
    const k = amount * 3 + 1;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  };
  shaper.curve = makeCurve((params.amount ?? 30) / 100);
  shaper.oversample = '4x';

  input.connect(dry);
  input.connect(shaper);
  shaper.connect(tone);
  tone.connect(wet);
  dry.connect(output);
  wet.connect(output);

  return {
    input, output,
    setParam(name, value) {
      if (name === 'amount') shaper.curve = makeCurve(Math.max(0, Math.min(1, value / 100)));
      else if (name === 'tone') tone.frequency.value = 200 + Math.max(0, Math.min(1, value)) * 10000;
    },
    setMix(mix) {
      wet.gain.value = mix;
      dry.gain.value = 1 - mix;
    },
    dispose() {
      try { input.disconnect(); dry.disconnect(); wet.disconnect(); shaper.disconnect(); tone.disconnect(); output.disconnect(); } catch {}
    },
  };
}

// ── Filters ─────────────────────────────────────────────────
function createFilter(ctx: AudioContext, type: BiquadFilterType, params: {
  frequency?: number;
  q?: number;
}): EffectNode {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = params.frequency ?? 1000;
  filter.Q.value = params.q ?? 1;
  input.connect(filter);
  filter.connect(output);

  return {
    input, output,
    setParam(name, value) {
      if (name === 'frequency') filter.frequency.value = Math.max(20, Math.min(20000, value));
      else if (name === 'q') filter.Q.value = Math.max(0.1, Math.min(20, value));
    },
    setMix() { /* filters are always 100% wet */ },
    dispose() {
      try { input.disconnect(); filter.disconnect(); output.disconnect(); } catch {}
    },
  };
}

export const createLowpass = (ctx: AudioContext, p?: any) => createFilter(ctx, 'lowpass', p ?? {});
export const createHighpass = (ctx: AudioContext, p?: any) => createFilter(ctx, 'highpass', p ?? {});
export const createBandpass = (ctx: AudioContext, p?: any) => createFilter(ctx, 'bandpass', p ?? {});

// ── Compressor ──────────────────────────────────────────────
export function createCompressor(ctx: AudioContext, params: {
  threshold?: number; ratio?: number; attack?: number; release?: number; makeup?: number;
} = {}): EffectNode {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  const makeup = ctx.createGain();

  comp.threshold.value = params.threshold ?? -24;
  comp.ratio.value = params.ratio ?? 4;
  comp.attack.value = params.attack ?? 0.003;
  comp.release.value = params.release ?? 0.25;
  makeup.gain.value = Math.pow(10, (params.makeup ?? 0) / 20);

  input.connect(comp);
  comp.connect(makeup);
  makeup.connect(output);

  return {
    input, output,
    setParam(name, value) {
      if (name === 'threshold') comp.threshold.value = Math.max(-100, Math.min(0, value));
      else if (name === 'ratio') comp.ratio.value = Math.max(1, Math.min(20, value));
      else if (name === 'attack') comp.attack.value = Math.max(0, Math.min(1, value));
      else if (name === 'release') comp.release.value = Math.max(0, Math.min(1, value));
      else if (name === 'makeup') makeup.gain.value = Math.pow(10, value / 20);
    },
    setMix() {},
    dispose() {
      try { input.disconnect(); comp.disconnect(); makeup.disconnect(); output.disconnect(); } catch {}
    },
  };
}

// ── Limiter (compressor with heavy settings) ────────────────
export function createLimiter(ctx: AudioContext, params: {
  ceiling?: number; release?: number;
} = {}): EffectNode {
  return createCompressor(ctx, {
    threshold: params.ceiling ?? -1,
    ratio: 20,
    attack: 0.001,
    release: params.release ?? 0.05,
    makeup: 0,
  });
}

// ── Pitch shift (via delay modulation — cheap approximation) ─
export function createPitchShift(ctx: AudioContext, params: {
  semitones?: number;
} = {}): EffectNode {
  // True pitch shifting needs granular processing — this is a simple
  // approximation using two modulated delay lines
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const delay1 = ctx.createDelay(0.5);
  const delay2 = ctx.createDelay(0.5);
  const lfo1 = ctx.createOscillator();
  const lfo2 = ctx.createOscillator();
  const lfoGain1 = ctx.createGain();
  const lfoGain2 = ctx.createGain();

  const semitones = params.semitones ?? 0;
  const rate = Math.abs(semitones) * 2;
  lfo1.frequency.value = rate;
  lfo2.frequency.value = rate;
  lfo2.phase = Math.PI as any;
  lfoGain1.gain.value = 0.01;
  lfoGain2.gain.value = 0.01;

  lfo1.connect(lfoGain1);
  lfo2.connect(lfoGain2);
  lfoGain1.connect(delay1.delayTime);
  lfoGain2.connect(delay2.delayTime);
  delay1.delayTime.value = 0.05;
  delay2.delayTime.value = 0.05;

  input.connect(dry);
  input.connect(delay1);
  input.connect(delay2);
  delay1.connect(wet);
  delay2.connect(wet);
  dry.connect(output);
  wet.connect(output);
  try { lfo1.start(); lfo2.start(); } catch {}

  return {
    input, output,
    setParam(name, value) {
      if (name === 'semitones') {
        lfo1.frequency.value = Math.abs(value) * 2;
        lfo2.frequency.value = Math.abs(value) * 2;
      }
    },
    setMix(mix) {
      wet.gain.value = mix;
      dry.gain.value = 1 - mix;
    },
    dispose() {
      try {
        lfo1.stop(); lfo2.stop();
        input.disconnect(); dry.disconnect(); wet.disconnect();
        delay1.disconnect(); delay2.disconnect();
        lfo1.disconnect(); lfo2.disconnect();
        lfoGain1.disconnect(); lfoGain2.disconnect();
        output.disconnect();
      } catch {}
    },
  };
}

// ── Chorus (short modulated delay) ──────────────────────────
export function createChorus(ctx: AudioContext, params: {
  rate?: number;   // Hz
  depth?: number;  // 0..1
} = {}): EffectNode {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const delay = ctx.createDelay(0.05);
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  delay.delayTime.value = 0.02;
  lfo.frequency.value = params.rate ?? 1.5;
  lfoGain.gain.value = (params.depth ?? 0.5) * 0.01;
  lfo.connect(lfoGain);
  lfoGain.connect(delay.delayTime);

  input.connect(dry);
  input.connect(delay);
  delay.connect(wet);
  dry.connect(output);
  wet.connect(output);
  try { lfo.start(); } catch {}

  return {
    input, output,
    setParam(name, value) {
      if (name === 'rate') lfo.frequency.value = Math.max(0.1, Math.min(10, value));
      else if (name === 'depth') lfoGain.gain.value = Math.max(0, Math.min(1, value)) * 0.01;
    },
    setMix(mix) {
      wet.gain.value = mix;
      dry.gain.value = 1 - mix * 0.3;
    },
    dispose() {
      try {
        lfo.stop();
        input.disconnect(); dry.disconnect(); wet.disconnect();
        delay.disconnect(); lfo.disconnect(); lfoGain.disconnect();
        output.disconnect();
      } catch {}
    },
  };
}

// ── Phaser ──────────────────────────────────────────────────
export function createPhaser(ctx: AudioContext, params: {
  rate?: number;
  depth?: number;
} = {}): EffectNode {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const stages: BiquadFilterNode[] = [];
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  for (let i = 0; i < 4; i++) {
    const f = ctx.createBiquadFilter();
    f.type = 'allpass';
    f.frequency.value = 500 + i * 200;
    stages.push(f);
  }

  lfo.frequency.value = params.rate ?? 0.5;
  lfoGain.gain.value = (params.depth ?? 0.5) * 500;
  lfo.connect(lfoGain);
  for (const s of stages) lfoGain.connect(s.frequency);

  input.connect(dry);
  input.connect(stages[0]);
  for (let i = 0; i < stages.length - 1; i++) stages[i].connect(stages[i + 1]);
  stages[stages.length - 1].connect(wet);
  dry.connect(output);
  wet.connect(output);
  try { lfo.start(); } catch {}

  return {
    input, output,
    setParam(name, value) {
      if (name === 'rate') lfo.frequency.value = Math.max(0.1, Math.min(10, value));
      else if (name === 'depth') lfoGain.gain.value = Math.max(0, Math.min(1, value)) * 500;
    },
    setMix(mix) {
      wet.gain.value = mix;
      dry.gain.value = 1 - mix * 0.3;
    },
    dispose() {
      try {
        lfo.stop();
        input.disconnect(); dry.disconnect(); wet.disconnect();
        for (const s of stages) s.disconnect();
        lfo.disconnect(); lfoGain.disconnect();
        output.disconnect();
      } catch {}
    },
  };
}

// ── Tremolo (amplitude modulation) ──────────────────────────
export function createTremolo(ctx: AudioContext, params: {
  rate?: number;   // Hz
  depth?: number;  // 0..1
} = {}): EffectNode {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const modGain = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  modGain.gain.value = 1 - (params.depth ?? 0.5) / 2;
  lfo.frequency.value = params.rate ?? 5;
  lfoGain.gain.value = (params.depth ?? 0.5) / 2;
  lfo.connect(lfoGain);
  lfoGain.connect(modGain.gain);

  input.connect(modGain);
  modGain.connect(output);
  try { lfo.start(); } catch {}

  return {
    input, output,
    setParam(name, value) {
      if (name === 'rate') lfo.frequency.value = Math.max(0.1, Math.min(20, value));
      else if (name === 'depth') {
        modGain.gain.value = 1 - Math.max(0, Math.min(1, value)) / 2;
        lfoGain.gain.value = Math.max(0, Math.min(1, value)) / 2;
      }
    },
    setMix() {},
    dispose() {
      try {
        lfo.stop();
        input.disconnect(); modGain.disconnect();
        lfo.disconnect(); lfoGain.disconnect();
        output.disconnect();
      } catch {}
    },
  };
}

// ── Bitcrusher (via WaveShaper) ─────────────────────────────
export function createBitcrusher(ctx: AudioContext, params: {
  bits?: number;    // 1..16
  normfreq?: number; // 0..1
} = {}): EffectNode {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';

  const makeCurve = (bits: number) => {
    const steps = Math.pow(2, bits);
    const n = 4096;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = Math.round(x * steps) / steps;
    }
    return curve;
  };
  shaper.curve = makeCurve(params.bits ?? 8);
  filter.frequency.value = 300 + (params.normfreq ?? 0.5) * 15000;

  input.connect(shaper);
  shaper.connect(filter);
  filter.connect(output);

  return {
    input, output,
    setParam(name, value) {
      if (name === 'bits') shaper.curve = makeCurve(Math.max(1, Math.min(16, Math.round(value))));
      else if (name === 'normfreq') filter.frequency.value = 300 + Math.max(0, Math.min(1, value)) * 15000;
    },
    setMix() {},
    dispose() {
      try { input.disconnect(); shaper.disconnect(); filter.disconnect(); output.disconnect(); } catch {}
    },
  };
}

// ── Stereo widener ──────────────────────────────────────────
export function createStereoWiden(ctx: AudioContext, params: {
  width?: number;  // 0..2 (1 = normal, 0 = mono, 2 = extra wide)
} = {}): EffectNode {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const splitter = ctx.createChannelSplitter(2);
  const merger = ctx.createChannelMerger(2);
  const leftGain = ctx.createGain();
  const rightGain = ctx.createGain();

  input.connect(splitter);
  splitter.connect(leftGain, 0);
  splitter.connect(rightGain, 1);
  leftGain.connect(merger, 0, 0);
  rightGain.connect(merger, 0, 1);
  merger.connect(output);

  const setWidth = (w: number) => {
    // Mid-side style. w=1 → normal. w=0 → mono. w=2 → invert side.
    leftGain.gain.value = w;
    rightGain.gain.value = w;
  };
  setWidth(params.width ?? 1);

  return {
    input, output,
    setParam(name, value) {
      if (name === 'width') setWidth(Math.max(0, Math.min(2, value)));
    },
    setMix() {},
    dispose() {
      try {
        input.disconnect(); splitter.disconnect();
        leftGain.disconnect(); rightGain.disconnect();
        merger.disconnect(); output.disconnect();
      } catch {}
    },
  };
}

// ── Factory dispatcher ──────────────────────────────────────
export function createAudioEffect(
  ctx: AudioContext,
  type: AudioEffectType,
  params: Record<string, number> = {},
): EffectNode {
  switch (type) {
    case 'reverb':      return createReverb(ctx, params);
    case 'delay':       return createDelay(ctx, params);
    case 'distortion':  return createDistortion(ctx, params);
    case 'lowpass':     return createLowpass(ctx, params);
    case 'highpass':    return createHighpass(ctx, params);
    case 'bandpass':    return createBandpass(ctx, params);
    case 'compressor':  return createCompressor(ctx, params);
    case 'limiter':     return createLimiter(ctx, params);
    case 'pitchShift':  return createPitchShift(ctx, params);
    case 'chorus':      return createChorus(ctx, params);
    case 'phaser':      return createPhaser(ctx, params);
    case 'tremolo':     return createTremolo(ctx, params);
    case 'bitcrusher':  return createBitcrusher(ctx, params);
    case 'stereoWiden': return createStereoWiden(ctx, params);
    default:            return createReverb(ctx, {});
  }
}

// ── Effect metadata (for UI param labels + ranges) ───────────
export interface EffectParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  format?: (v: number) => string;
}

export interface EffectMeta {
  type: AudioEffectType;
  displayName: string;
  hasMix: boolean;
  params: EffectParamDef[];
}

export const EFFECT_METADATA: Record<AudioEffectType, EffectMeta> = {
  reverb: {
    type: 'reverb', displayName: 'Reverb', hasMix: true,
    params: [
      { key: 'roomSize', label: 'Room Size', min: 0, max: 1, step: 0.01, default: 0.5 },
      { key: 'decay', label: 'Decay', min: 0.1, max: 10, step: 0.1, default: 2, format: v => `${v.toFixed(1)}s` },
    ],
  },
  delay: {
    type: 'delay', displayName: 'Delay', hasMix: true,
    params: [
      { key: 'time', label: 'Time', min: 0, max: 2, step: 0.01, default: 0.3, format: v => `${(v * 1000).toFixed(0)}ms` },
      { key: 'feedback', label: 'Feedback', min: 0, max: 0.95, step: 0.01, default: 0.4 },
    ],
  },
  distortion: {
    type: 'distortion', displayName: 'Distortion', hasMix: true,
    params: [
      { key: 'amount', label: 'Amount', min: 0, max: 100, step: 1, default: 30 },
      { key: 'tone', label: 'Tone', min: 0, max: 1, step: 0.01, default: 0.5 },
    ],
  },
  lowpass: {
    type: 'lowpass', displayName: 'Low-pass Filter', hasMix: false,
    params: [
      { key: 'frequency', label: 'Cutoff', min: 20, max: 20000, step: 10, default: 5000, format: v => `${v.toFixed(0)}Hz` },
      { key: 'q', label: 'Resonance', min: 0.1, max: 20, step: 0.1, default: 1 },
    ],
  },
  highpass: {
    type: 'highpass', displayName: 'High-pass Filter', hasMix: false,
    params: [
      { key: 'frequency', label: 'Cutoff', min: 20, max: 20000, step: 10, default: 500, format: v => `${v.toFixed(0)}Hz` },
      { key: 'q', label: 'Resonance', min: 0.1, max: 20, step: 0.1, default: 1 },
    ],
  },
  bandpass: {
    type: 'bandpass', displayName: 'Band-pass Filter', hasMix: false,
    params: [
      { key: 'frequency', label: 'Center', min: 20, max: 20000, step: 10, default: 1000, format: v => `${v.toFixed(0)}Hz` },
      { key: 'q', label: 'Width', min: 0.1, max: 20, step: 0.1, default: 1 },
    ],
  },
  compressor: {
    type: 'compressor', displayName: 'Compressor', hasMix: false,
    params: [
      { key: 'threshold', label: 'Threshold', min: -60, max: 0, step: 0.5, default: -24, format: v => `${v.toFixed(1)}dB` },
      { key: 'ratio', label: 'Ratio', min: 1, max: 20, step: 0.1, default: 4, format: v => `${v.toFixed(1)}:1` },
      { key: 'attack', label: 'Attack', min: 0, max: 1, step: 0.001, default: 0.003, format: v => `${(v * 1000).toFixed(1)}ms` },
      { key: 'release', label: 'Release', min: 0, max: 1, step: 0.01, default: 0.25, format: v => `${(v * 1000).toFixed(0)}ms` },
      { key: 'makeup', label: 'Makeup', min: -12, max: 24, step: 0.1, default: 0, format: v => `${v.toFixed(1)}dB` },
    ],
  },
  limiter: {
    type: 'limiter', displayName: 'Limiter', hasMix: false,
    params: [
      { key: 'ceiling', label: 'Ceiling', min: -12, max: 0, step: 0.1, default: -1, format: v => `${v.toFixed(1)}dB` },
      { key: 'release', label: 'Release', min: 0.001, max: 0.5, step: 0.001, default: 0.05, format: v => `${(v * 1000).toFixed(0)}ms` },
    ],
  },
  pitchShift: {
    type: 'pitchShift', displayName: 'Pitch Shift', hasMix: true,
    params: [
      { key: 'semitones', label: 'Semitones', min: -12, max: 12, step: 1, default: 0, format: v => (v > 0 ? `+${v}` : `${v}`) },
    ],
  },
  chorus: {
    type: 'chorus', displayName: 'Chorus', hasMix: true,
    params: [
      { key: 'rate', label: 'Rate', min: 0.1, max: 10, step: 0.1, default: 1.5, format: v => `${v.toFixed(1)}Hz` },
      { key: 'depth', label: 'Depth', min: 0, max: 1, step: 0.01, default: 0.5 },
    ],
  },
  phaser: {
    type: 'phaser', displayName: 'Phaser', hasMix: true,
    params: [
      { key: 'rate', label: 'Rate', min: 0.1, max: 10, step: 0.1, default: 0.5, format: v => `${v.toFixed(1)}Hz` },
      { key: 'depth', label: 'Depth', min: 0, max: 1, step: 0.01, default: 0.5 },
    ],
  },
  tremolo: {
    type: 'tremolo', displayName: 'Tremolo', hasMix: false,
    params: [
      { key: 'rate', label: 'Rate', min: 0.1, max: 20, step: 0.1, default: 5, format: v => `${v.toFixed(1)}Hz` },
      { key: 'depth', label: 'Depth', min: 0, max: 1, step: 0.01, default: 0.5 },
    ],
  },
  bitcrusher: {
    type: 'bitcrusher', displayName: 'Bitcrusher', hasMix: false,
    params: [
      { key: 'bits', label: 'Bits', min: 1, max: 16, step: 1, default: 8 },
      { key: 'normfreq', label: 'Sample Rate', min: 0, max: 1, step: 0.01, default: 0.5 },
    ],
  },
  stereoWiden: {
    type: 'stereoWiden', displayName: 'Stereo Widener', hasMix: false,
    params: [
      { key: 'width', label: 'Width', min: 0, max: 2, step: 0.01, default: 1, format: v => `${(v * 100).toFixed(0)}%` },
    ],
  },
};