# Project TODO

## Deferred features

### 10D-2 — Audio: Offline Voice Isolation Bake
Add a "Bake to File" button in the Audio → Effects panel that runs a real ML model (Demucs / Spleeter) offline against the source audio and produces a new "voice-only" asset the user can swap the layer to.

- Realtime "Isolate Voice" effect (shipped in 10D-1) is an EQ + centre-channel approximation. Good for talking heads, not great for music.
- Real ML bake would give studio-quality vocal isolation.

**Approach when ready:**
1. Wire Electron IPC to detect if `ffmpeg` and `demucs` (or `spleeter`) are installed on the user's system.
2. If yes: spawn as a child process, stream progress to a modal dialog.
3. If no: show install instructions per-platform.
4. Alternative: bundle `@sevagh/free-music-demixer` WASM (~60MB) — slow but self-contained.
5. Output: new project asset with `_isolated` suffix, auto-linked to layer.

**UI location:** Audio → Effects → new "Bake" section at bottom.

**Estimated work:** ~2 days.

---

### Video scrub lag (existing TODO from earlier discussion)
Paused-state timeline scrub is laggy on video layers because:
- Each scrub tick issues a new `video.currentTime = ...` + waits for `seeked` + `createImageBitmap`.
- No debouncing — dozens of pending seeks pile up.
- `_syncVideoLayers` runs every `beforeRender` regardless of whether the frame changed.

**Fix plan (Batch 11):**
1. Add "scrub state" flag in `useTimelineStore`.
2. During active scrub: skip `seeked`/`captureFrame`, just assign `currentTime` and let VideoTexture show whatever's decoded (jumpy but instant).
3. On scrub-end (idle >16ms): do the full seek + capture path for the exact final frame.
4. Pre-warm neighboring frames (N±5) into `videoFrameCache` after a scrub settles.
5. Guard `_syncVideoLayers` behind a "did frame change?" check.


### 10F — Adjust panel: HSL / Curves / Color Wheel
The three remaining Adjust sub-tabs. Basic + LUT are shipped.

- **HSL:** 8 hue ranges (red/orange/yellow/green/aqua/blue/purple/magenta) each with H/S/L sliders. Shader-based hue mask + adjustment.
- **Curves:** 4 curves (RGB master + R + G + B). Interactive curve editor with draggable control points. Uploaded as 1D lookup texture to shader.
- **Color Wheel:** three color wheels (Shadows / Midtones / Highlights) with luma masks. Lift/gamma/gain equivalents.

Estimated: 3 sub-batches.

---

### Model files needed for MODNet + U²-Net (Cutout tab)

Users need to drop model files into `public/models/` for the higher-quality
cutout models to work. If missing, the UI shows a friendly error.

**MODNet (portrait matting, ~15 MB):**
1. Download from https://github.com/ZHKKKe/MODNet (pre-trained ONNX export)
2. Save as `public/models/modnet.onnx`

**U²-Net (general purpose):**
- Small variant (~5 MB, recommended): https://github.com/xuebinqin/U-2-Net → u2netp.onnx
- Full variant (~170 MB, best quality): u2net.onnx
- Either way, save as `public/models/u2net.onnx`

MediaPipe (people-focused, realtime) requires no download — loads from CDN.

---

### Shader pipeline stabilization — Adjust + LUT + Cutout visual passes

**Status:** UI panels work, data saves/loads, all disabled at render level.

**What's broken:**
1. GLSL3 shaders (`adjustPass.ts`, `cutoutShader.ts`) use `in`/`out`/`sampler3D`
   which require `glslVersion: THREE.GLSL3`. When the shader compiles but the
   FBO setup or texture swap timing is wrong, GL_INVALID_OPERATION fires every
   frame, killing performance.
2. The texture-swap-restore lifecycle (save mat.map, swap to FBO, restore next
   frame) conflicts with the CanvasTexture video pump and cached-scrub-bitmap
   paths. The material's `map` pointer gets stale, disposed, or pointed at
   the wrong texture depending on play/pause/scrub state.
3. The adjust pass's `trueOriginal` save sometimes captures a cutout FBO
   reference instead of the layer's base texture, causing cascading corruption.

**Re-enablement plan:**
1. Convert adjust + cutout shaders to plain GLSL (no `in`/`out`, use
   `gl_FragColor`, `texture2D`, no `sampler3D` — encode LUT as a 2D
   strip texture instead of 3D).
2. Change the compositor to use a **dedicated per-layer FBO pair** that
   persists across frames, instead of swapping mat.map. The layer always
   renders from its base texture; the compositor renders the effect into
   a separate overlay quad that sits on top. No swap = no restore = no
   corruption.
3. Test each pass independently before combining.

**Files to modify:**
- `src/renderer/effects/library/adjustPass.ts` — GLSL1 rewrite
- `src/renderer/cutout/cutoutShader.ts` — GLSL1 rewrite
- `src/renderer/cutout/CutoutCompositor.ts` — overlay approach
- `src/renderer/compositing/AdjustPassRenderer.ts` — overlay approach
- `src/renderer/Renderer.ts` — uncomment blocks, wire overlay quads
- `src/renderer/color/lutStore.ts` — 2D strip LUT instead of 3D texture

---

### WebGPU renderer — TEMPORARILY DISABLED

**Status:** Files intact, all runtime code paths short-circuited.

**Why disabled:** Selecting WebGPU produces empty renders because every
effect shader + material uses GLSL/WebGL APIs incompatible with
`WebGPURenderer`. Rather than half-working, WebGPU is now hard-disabled
at the store, factory, and UI layers.

**To re-enable:**
1. Port all shaders in `src/renderer/effects/library/` to TSL
2. Port `TonemapPass`, `MotionBlurCompositor`, `TransitionCompositor`,
   `AdjustPassRenderer`, `CutoutCompositor` to node-based materials
3. Handle async `readRenderTargetPixels` calls
4. Wire the GLSLSidecar for effects that can't be ported
5. Restore original code in these files:
   - `src/renderer/backend/backendFactory.ts` — restore WebGPU import
   - `src/state/rendererBackendStore.ts` — restore checkWebGPUAvailability + setPreferredBackend
   - `src/renderer/Renderer.ts` — restore auto-swap and swapBackend WebGPU path
   - `src/ui/dialogs/preferences/RenderingPreferences.tsx` — restore radio + selection UI
   - `src/ui/panels/viewport/ViewportToolbar.tsx` — restore `<BackendPill />`
   - `src/ui/panels/viewport/ViewportPanel.tsx` — restore `<BackendWarningBanner />`
   - `src/App.tsx` — restore `checkWebGPUAvailability` effect
6. Test with real WebGPU-supporting browser

Verify nothing else imports WebGPU
Run this to sanity-check no stray active imports:

```
Select-String -Path 'src\**\*.ts','src\**\*.tsx' -Pattern 'three/webgpu|WebGPURenderer|webgpu/WebGPU' | Where-Object { $_.Line -notmatch '^\s*//|^\s*\*|comment' }
```

Anything that shows up outside comments needs to be commented too.
