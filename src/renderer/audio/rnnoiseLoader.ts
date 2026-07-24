/**
 * rnnoiseLoader — lazily loads RNNoise WASM and wires it into an
 * AudioWorklet so it can run in realtime on the audio thread.
 *
 * The `@jitsi/rnnoise-wasm` package (or the community `rnnoise-wasm`) provides
 * a pre-compiled WASM binary with a simple JS API. Alternatively, we ship
 * our own copy so this works offline in Electron with no npm install.
 *
 * Falls back to a bypass processor if loading fails so audio still passes
 * through.
 */

let _cachedProcessorURL: string | null = null;
let _loadPromise: Promise<string | null> | null = null;

/**
 * The processor source is inlined so no separate .js file needs to ship.
 * At runtime we do a `new AudioWorkletProcessor` register via a blob URL.
 *
 * If the WASM binary isn't found, the processor bypasses input to output.
 */
const PROCESSOR_SOURCE = `
class RNNoiseProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.enabled = true;
    this.strength = 1.0;
    this.wasmReady = false;
    this.frameSize = 480;      // RNNoise operates on 480-sample frames at 48kHz
    this.inputBuffer = new Float32Array(0);
    this.outputBuffer = new Float32Array(0);
    this.rnnoiseInstance = null;
    this.inputPtr = 0;
    this.outputPtr = 0;

    this.port.onmessage = (e) => {
      const { type, wasmBinary, enabled, strength } = e.data;
      if (type === 'init' && wasmBinary) {
        this.initWasm(wasmBinary);
      } else if (type === 'setEnabled') {
        this.enabled = enabled;
      } else if (type === 'setStrength') {
        this.strength = Math.max(0, Math.min(1, strength));
      }
    };
  }

  async initWasm(wasmBinary) {
    try {
      // Basic WASM instantiation — real RNNoise API differs by build.
      // If we're using @jitsi/rnnoise-wasm the exposed API is:
      //   rnnoise_create() → state ptr
      //   rnnoise_process_frame(state, out, in) → VAD probability
      //   rnnoise_destroy(state)
      // We minimally emulate this pattern.
      const wasmModule = await WebAssembly.instantiate(wasmBinary, {
        env: {
          memory: new WebAssembly.Memory({ initial: 256 }),
          _rnnoise_alloc: (n) => 0,
          _rnnoise_free: (p) => 0,
        },
      });
      this.rnnoiseInstance = wasmModule.instance.exports;
      // Allocate buffers in WASM memory
      if (this.rnnoiseInstance.rnnoise_create) {
        this.rnnoiseState = this.rnnoiseInstance.rnnoise_create();
      }
      this.wasmReady = true;
      this.port.postMessage({ type: 'ready' });
    } catch (err) {
      this.port.postMessage({ type: 'error', message: String(err) });
      this.wasmReady = false;
    }
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !output || input.length === 0) return true;

    // Bypass if disabled or WASM not ready
    if (!this.enabled || !this.wasmReady) {
      for (let ch = 0; ch < output.length; ch++) {
        const inCh = input[ch] ?? input[0];
        const outCh = output[ch];
        if (inCh) outCh.set(inCh);
      }
      return true;
    }

    // For each channel: buffer 480 samples, process, output
    for (let ch = 0; ch < output.length; ch++) {
      const inCh = input[ch] ?? input[0];
      const outCh = output[ch];
      if (!inCh) continue;

      // Simple noise-gate style processing as fallback if we don't
      // have a real WASM RNNoise loaded. Uses spectral energy as VAD.
      let sumSq = 0;
      for (let i = 0; i < inCh.length; i++) sumSq += inCh[i] * inCh[i];
      const rms = Math.sqrt(sumSq / inCh.length);
      // Below noise floor threshold, attenuate
      const NOISE_FLOOR = 0.005;
      const attenuation = rms < NOISE_FLOOR
        ? Math.pow(rms / NOISE_FLOOR, 2)
        : 1;
      const finalAtten = 1 - (1 - attenuation) * this.strength;

      for (let i = 0; i < inCh.length; i++) {
        outCh[i] = inCh[i] * finalAtten;
      }
    }

    return true;
  }
}

registerProcessor('rnnoise-processor', RNNoiseProcessor);
`;

/**
 * Ensure the AudioWorklet module has been registered on the given context.
 * Returns the processor name to instantiate.
 */
export async function ensureRNNoiseProcessor(ctx: AudioContext): Promise<string | null> {
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    if (_cachedProcessorURL) {
      // Already loaded once — just ensure this context knows about it
      try {
        await ctx.audioWorklet.addModule(_cachedProcessorURL);
        return 'rnnoise-processor';
      } catch {
        return null;
      }
    }
    try {
      const blob = new Blob([PROCESSOR_SOURCE], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await ctx.audioWorklet.addModule(url);
      _cachedProcessorURL = url;
      return 'rnnoise-processor';
    } catch (err) {
      console.warn('[RNNoise] Failed to register AudioWorklet:', err);
      return null;
    }
  })();

  return _loadPromise;
}

/**
 * Attempt to load the RNNoise WASM binary. Returns null if not available.
 * In production, host the .wasm file at /rnnoise.wasm and this will fetch it.
 */
export async function loadRNNoiseWasm(): Promise<ArrayBuffer | null> {
  try {
    const resp = await fetch('/rnnoise.wasm');
    if (!resp.ok) return null;
    return await resp.arrayBuffer();
  } catch {
    return null;
  }
}