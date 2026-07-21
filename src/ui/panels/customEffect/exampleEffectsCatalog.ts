/**
 * A catalogue of ready-to-install example custom effects.
 * Each entry contains a full CustomEffectDefinition (minus id/created/modified,
 * which are generated on install).
 */
import type { CustomEffectDefinition } from '../../../types/customEffect';

type ExampleTemplate = Omit<CustomEffectDefinition, 'id' | 'created' | 'modified'>;

export interface ExampleEntry {
  templateId: string;
  category: string;
  template: ExampleTemplate;
}

export const EXAMPLE_EFFECTS: ExampleEntry[] = [
  {
    templateId: 'ex_pulse',
    category: 'Animated',
    template: {
      displayName: 'Pulse',
      category: 'stylize',
      description: 'Rhythmic brightness pulse. Uses uTime.',
      version: 1,
      usesTime: true,
      space: 'local',
      vertexShader: null,
      parameters: [
        { id: 'p_speed',     name: 'Speed',     type: 'number',  value: 2,   defaultValue: 2,   min: 0, max: 10, step: 0.1, uniform: 'uSpeed' },
        { id: 'p_intensity', name: 'Intensity', type: 'number',  value: 0.5, defaultValue: 0.5, min: 0, max: 1,  step: 0.01, uniform: 'uIntensity' },
      ],
      fragmentShader: `uniform sampler2D uTexture;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
varying vec2 vUv;

void main() {
  vec4 src = texture2D(uTexture, vUv);
  float pulse = 0.5 + 0.5 * sin(uTime * uSpeed);
  gl_FragColor = vec4(src.rgb * (1.0 + pulse * uIntensity), src.a);
}
`,
    },
  },
  {
    templateId: 'ex_rgb_shift',
    category: 'Stylize',
    template: {
      displayName: 'Simple RGB Shift',
      category: 'stylize',
      description: 'Split RGB channels horizontally.',
      version: 1,
      usesTime: false,
      space: 'local',
      vertexShader: null,
      parameters: [
        { id: 'p_amount', name: 'Amount', type: 'number', value: 5, defaultValue: 5, min: 0, max: 50, step: 1, uniform: 'uAmount' },
      ],
      fragmentShader: `uniform sampler2D uTexture;
uniform vec2  uResolution;
uniform float uAmount;
varying vec2 vUv;

void main() {
  vec2 off = vec2(uAmount / uResolution.x, 0.0);
  float r = texture2D(uTexture, vUv + off).r;
  float g = texture2D(uTexture, vUv).g;
  float b = texture2D(uTexture, vUv - off).b;
  float a = texture2D(uTexture, vUv).a;
  gl_FragColor = vec4(r, g, b, a);
}
`,
    },
  },
  {
    templateId: 'ex_scanlines',
    category: 'Retro',
    template: {
      displayName: 'Retro Scanlines',
      category: 'stylize',
      description: 'Horizontal CRT-style scanlines. Animated roll optional.',
      version: 1,
      usesTime: true,
      space: 'local',
      vertexShader: null,
      parameters: [
        { id: 'p_density', name: 'Density',   type: 'number', value: 200, defaultValue: 200, min: 10, max: 800, step: 10, uniform: 'uDensity' },
        { id: 'p_strength',name: 'Strength',  type: 'number', value: 0.4, defaultValue: 0.4, min: 0,  max: 1,   step: 0.01, uniform: 'uStrength' },
        { id: 'p_roll',    name: 'Roll',      type: 'number', value: 0,   defaultValue: 0,   min: -5, max: 5,   step: 0.1, uniform: 'uRoll' },
      ],
      fragmentShader: `uniform sampler2D uTexture;
uniform float uDensity;
uniform float uStrength;
uniform float uRoll;
uniform float uTime;
varying vec2 vUv;

void main() {
  vec4 src = texture2D(uTexture, vUv);
  float roll = uTime * uRoll * 0.01;
  float lines = 0.5 + 0.5 * sin((vUv.y + roll) * uDensity * 3.14159);
  gl_FragColor = vec4(src.rgb * mix(1.0, lines, uStrength), src.a);
}
`,
    },
  },
  {
    templateId: 'ex_edge_glow',
    category: 'Stylize',
    template: {
      displayName: 'Edge Glow',
      category: 'stylize',
      description: 'Detect edges and paint them with a glow colour.',
      version: 1,
      usesTime: false,
      space: 'local',
      vertexShader: null,
      parameters: [
        { id: 'p_thickness', name: 'Thickness', type: 'number', value: 1,       defaultValue: 1,       min: 0.5, max: 5,  step: 0.1, uniform: 'uThickness' },
        { id: 'p_intensity', name: 'Intensity', type: 'number', value: 2,       defaultValue: 2,       min: 0,   max: 10, step: 0.1, uniform: 'uIntensity' },
        { id: 'p_color',     name: 'Color',     type: 'color',  value: '#00ffff', defaultValue: '#00ffff', uniform: 'uColor' },
      ],
      fragmentShader: `uniform sampler2D uTexture;
uniform float uThickness;
uniform float uIntensity;
uniform vec3  uColor;
uniform vec2  uResolution;
varying vec2 vUv;

float lum(vec2 uv) {
  return dot(texture2D(uTexture, uv).rgb, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec4 src = texture2D(uTexture, vUv);
  vec2 px  = uThickness / uResolution;
  float gx = lum(vUv + vec2(px.x, 0.0)) - lum(vUv - vec2(px.x, 0.0));
  float gy = lum(vUv + vec2(0.0, px.y)) - lum(vUv - vec2(0.0, px.y));
  float edge = clamp(sqrt(gx*gx + gy*gy) * uIntensity, 0.0, 1.0);
  vec3 col = src.rgb + uColor * edge;
  gl_FragColor = vec4(col, src.a);
}
`,
    },
  },
  {
    templateId: 'ex_ripple',
    category: 'Animated',
    template: {
      displayName: 'Water Ripple',
      category: 'distort',
      description: 'Radial ripple animation from a center point.',
      version: 1,
      usesTime: true,
      space: 'local',
      vertexShader: null,
      parameters: [
        { id: 'p_center',    name: 'Center',    type: 'vector2', value: [0.5, 0.5], defaultValue: [0.5, 0.5], step: 0.01, uniform: 'uCenter' },
        { id: 'p_amplitude', name: 'Amplitude', type: 'number',  value: 20,         defaultValue: 20,         min: 0, max: 100, step: 1, uniform: 'uAmplitude' },
        { id: 'p_frequency', name: 'Frequency', type: 'number',  value: 10,         defaultValue: 10,         min: 0, max: 50,  step: 0.5, uniform: 'uFrequency' },
      ],
      fragmentShader: `uniform sampler2D uTexture;
uniform vec2  uCenter;
uniform float uAmplitude;
uniform float uFrequency;
uniform float uTime;
uniform vec2  uResolution;
varying vec2 vUv;

void main() {
  vec2 dir = vUv - uCenter;
  float dist = length(dir);
  float wave = sin(dist * uFrequency - uTime * 2.0) * (uAmplitude / uResolution.x);
  vec2 uv = vUv + normalize(dir + vec2(0.0001)) * wave;
  gl_FragColor = texture2D(uTexture, clamp(uv, 0.0, 1.0));
}
`,
    },
  },
  {
    templateId: 'ex_vignette',
    category: 'Color',
    template: {
      displayName: 'Simple Vignette',
      category: 'stylize',
      description: 'Soft dark corners.',
      version: 1,
      usesTime: false,
      space: 'local',
      vertexShader: null,
      parameters: [
        { id: 'p_amount',     name: 'Amount',     type: 'number', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uAmount' },
        { id: 'p_smoothness', name: 'Smoothness', type: 'number', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uSmoothness' },
      ],
      fragmentShader: `uniform sampler2D uTexture;
uniform float uAmount;
uniform float uSmoothness;
varying vec2 vUv;

void main() {
  vec4 src = texture2D(uTexture, vUv);
  vec2 uv = vUv * 2.0 - 1.0;
  float d = length(uv);
  float v = smoothstep(1.0 - uSmoothness, 1.0, d * (1.0 + uAmount));
  gl_FragColor = vec4(src.rgb * (1.0 - v), src.a);
}
`,
    },
  },
  {
    templateId: 'ex_grayscale',
    category: 'Color',
    template: {
      displayName: 'Grayscale',
      category: 'color',
      description: 'Convert to greyscale with adjustable mix.',
      version: 1,
      usesTime: false,
      space: 'local',
      vertexShader: null,
      parameters: [
        { id: 'p_amount', name: 'Amount', type: 'number', value: 1, defaultValue: 1, min: 0, max: 1, step: 0.01, uniform: 'uAmount' },
      ],
      fragmentShader: `uniform sampler2D uTexture;
uniform float uAmount;
varying vec2 vUv;

void main() {
  vec4 src = texture2D(uTexture, vUv);
  float lum = dot(src.rgb, vec3(0.299, 0.587, 0.114));
  gl_FragColor = vec4(mix(src.rgb, vec3(lum), uAmount), src.a);
}
`,
    },
  },
  {
    templateId: 'ex_kaleido_lite',
    category: 'Distort',
    template: {
      displayName: 'Mini Kaleidoscope',
      category: 'distort',
      description: 'Simple 4-way radial mirror.',
      version: 1,
      usesTime: false,
      space: 'local',
      vertexShader: null,
      parameters: [
        { id: 'p_center',   name: 'Center',   type: 'vector2', value: [0.5, 0.5], defaultValue: [0.5, 0.5], step: 0.01, uniform: 'uCenter' },
        { id: 'p_rotation', name: 'Rotation', type: 'angle',   value: 0,          defaultValue: 0,          min: 0, max: 360, step: 1, uniform: 'uRotation' },
      ],
      fragmentShader: `uniform sampler2D uTexture;
uniform vec2  uCenter;
uniform float uRotation;
varying vec2 vUv;
#define PI 3.14159265

void main() {
  vec2 uv = vUv - uCenter;
  float angle = atan(uv.y, uv.x) + radians(uRotation);
  float r = length(uv);
  float slice = PI / 2.0;   // 4 segments
  angle = mod(angle, 2.0 * slice);
  if (angle > slice) angle = 2.0 * slice - angle;
  vec2 uv2 = uCenter + vec2(cos(angle), sin(angle)) * r;
  gl_FragColor = texture2D(uTexture, clamp(uv2, 0.0, 1.0));
}
`,
    },
  },
  {
    templateId: 'ex_pixel_sort_lite',
    category: 'Stylize',
    template: {
      displayName: 'Blocky Downsample',
      category: 'distort',
      description: 'Pixelate the image into blocks.',
      version: 1,
      usesTime: false,
      space: 'local',
      vertexShader: null,
      parameters: [
        { id: 'p_size', name: 'Block Size', type: 'number', value: 12, defaultValue: 12, min: 1, max: 128, step: 1, uniform: 'uSize' },
      ],
      fragmentShader: `uniform sampler2D uTexture;
uniform float uSize;
uniform vec2  uResolution;
varying vec2 vUv;

void main() {
  vec2 blocks = uResolution / uSize;
  vec2 uv = floor(vUv * blocks) / blocks + 0.5 / blocks;
  gl_FragColor = texture2D(uTexture, uv);
}
`,
    },
  },
  {
    templateId: 'ex_two_tone',
    category: 'Color',
    template: {
      displayName: 'Two Tone',
      category: 'color',
      description: 'Map luminance to a gradient between two colours.',
      version: 1,
      usesTime: false,
      space: 'local',
      vertexShader: null,
      parameters: [
        { id: 'p_dark',  name: 'Dark',  type: 'color', value: '#2a1a5c', defaultValue: '#2a1a5c', uniform: 'uDark' },
        { id: 'p_light', name: 'Light', type: 'color', value: '#ffcc33', defaultValue: '#ffcc33', uniform: 'uLight' },
      ],
      fragmentShader: `uniform sampler2D uTexture;
uniform vec3 uDark;
uniform vec3 uLight;
varying vec2 vUv;

void main() {
  vec4 src = texture2D(uTexture, vUv);
  float lum = dot(src.rgb, vec3(0.299, 0.587, 0.114));
  gl_FragColor = vec4(mix(uDark, uLight, lum), src.a);
}
`,
    },
  },
];