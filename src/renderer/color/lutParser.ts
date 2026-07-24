/**
 * lutParser — parses Adobe/Resolve .cube LUT files into GPU-ready data.
 *
 * Format spec (simplified):
 *   TITLE "My LUT"                    (optional)
 *   LUT_3D_SIZE 33                    (required for 3D LUT)
 *   DOMAIN_MIN 0.0 0.0 0.0            (optional)
 *   DOMAIN_MAX 1.0 1.0 1.0            (optional)
 *   0.0 0.0 0.0                       (r g b triplets, size^3 lines)
 *   0.03125 0.0 0.0
 *   ...
 *
 * Returns a flat RGBA Uint8Array indexed by (r + g*size + b*size*size) * 4
 * suitable for uploading to a THREE.Data3DTexture.
 */

export interface ParsedLUT {
  size: number;
  data: Uint8Array;    // size * size * size * 4 bytes (RGBA)
  title?: string;
  domainMin: [number, number, number];
  domainMax: [number, number, number];
}

export class LUTParseError extends Error {
  constructor(msg: string) { super(msg); this.name = 'LUTParseError'; }
}

/** Parse .cube file text into a 3D LUT. Throws on error. */
export function parseCubeLUT(text: string): ParsedLUT {
  const lines = text.split(/\r?\n/);
  let size = 0;
  let title: string | undefined;
  let domainMin: [number, number, number] = [0, 0, 0];
  let domainMax: [number, number, number] = [1, 1, 1];
  const samples: number[] = [];   // flat R,G,B,R,G,B...

  for (let raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // Header keywords
    const upper = line.toUpperCase();
    if (upper.startsWith('TITLE')) {
      const m = line.match(/TITLE\s+"([^"]*)"/i);
      if (m) title = m[1];
      continue;
    }
    if (upper.startsWith('LUT_3D_SIZE')) {
      const parts = line.split(/\s+/);
      size = parseInt(parts[1], 10);
      continue;
    }
    if (upper.startsWith('LUT_1D_SIZE')) {
      throw new LUTParseError('1D LUTs are not supported for color grading — please provide a 3D LUT (.cube with LUT_3D_SIZE).');
    }
    if (upper.startsWith('DOMAIN_MIN')) {
      const parts = line.split(/\s+/).slice(1).map(Number);
      if (parts.length >= 3) domainMin = [parts[0], parts[1], parts[2]];
      continue;
    }
    if (upper.startsWith('DOMAIN_MAX')) {
      const parts = line.split(/\s+/).slice(1).map(Number);
      if (parts.length >= 3) domainMax = [parts[0], parts[1], parts[2]];
      continue;
    }

    // Numeric triplet
    const nums = line.split(/\s+/).map(Number);
    if (nums.length >= 3 && nums.every(n => Number.isFinite(n))) {
      samples.push(nums[0], nums[1], nums[2]);
    }
  }

  if (size < 2) {
    throw new LUTParseError('Invalid LUT: missing or invalid LUT_3D_SIZE.');
  }

  const expectedSamples = size * size * size;
  const actualSamples = samples.length / 3;
  if (actualSamples < expectedSamples) {
    throw new LUTParseError(
      `LUT is truncated: expected ${expectedSamples} samples, got ${actualSamples}.`,
    );
  }
  if (actualSamples > expectedSamples) {
    // Just truncate silently — some LUTs have trailing whitespace
    samples.length = expectedSamples * 3;
  }

  // Normalize by domain if not [0,1]
  const rangeR = domainMax[0] - domainMin[0];
  const rangeG = domainMax[1] - domainMin[1];
  const rangeB = domainMax[2] - domainMin[2];
  const needsNormalize =
    domainMin[0] !== 0 || domainMin[1] !== 0 || domainMin[2] !== 0 ||
    domainMax[0] !== 1 || domainMax[1] !== 1 || domainMax[2] !== 1;

  // Cube files store samples with red changing fastest, then green, then blue.
  // For a Data3DTexture layout of (width=size, height=size, depth=size)
  // where texel (r,g,b) is at index r + g*size + b*size*size, this maps 1:1.
  const data = new Uint8Array(size * size * size * 4);
  for (let i = 0; i < expectedSamples; i++) {
    let r = samples[i * 3 + 0];
    let g = samples[i * 3 + 1];
    let b = samples[i * 3 + 2];
    if (needsNormalize) {
      r = rangeR ? (r - domainMin[0]) / rangeR : r;
      g = rangeG ? (g - domainMin[1]) / rangeG : g;
      b = rangeB ? (b - domainMin[2]) / rangeB : b;
    }
    r = Math.max(0, Math.min(1, r));
    g = Math.max(0, Math.min(1, g));
    b = Math.max(0, Math.min(1, b));
    data[i * 4 + 0] = Math.round(r * 255);
    data[i * 4 + 1] = Math.round(g * 255);
    data[i * 4 + 2] = Math.round(b * 255);
    data[i * 4 + 3] = 255;
  }

  return { size, data, title, domainMin, domainMax };
}

/** Parse from a File/Blob (async). */
export async function parseCubeLUTFromFile(file: File | Blob): Promise<ParsedLUT> {
  const text = await file.text();
  return parseCubeLUT(text);
}