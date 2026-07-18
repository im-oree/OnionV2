# OnionV2 — Progress Tracker

## ✅ Phase 1: App Shell & Layout (COMPLETE)
- CSS Grid layout (AppShell.tsx)
- MenuBar (7 menus: File, Edit, Add, Layer, Animation, View, Help)
- Toolbar (10 tools: Select, Move, Rotate, Scale, Rectangle, Ellipse, Pen, Text, Hand, Zoom)
- Panel system (Splitter, PanelHeader, WorkspaceTabs)
- Workspace panel configuration (quad layout: viewport/timeline/properties)

## ✅ Phase 2: Viewport & Camera (COMPLETE)
- Three.js WebGLRenderer setup
- OrthographicCamera (2D, Y-UP)
- CameraManager (pan/zoom/fit/screen↔world conversion)
- SceneManager (grid, compBounds, safeZones)
- RenderLoop with RAF and idle pause
- ResizeHandler
- Snapping system

## ✅ Phase 3: Layer System (COMPLETE)
- Layer types (Solid, Shape, Text, Image, Video)
- LayerFactory + 5 renderers
- Outliner Panel with tree/drag/reorder/parenting
- Properties Panel (Transform, Layer, type-specific sections)
- Selection system (click, shift-click, box-select)
- LayerSync pipeline
- HitTest (raycasting)
- SelectionOverlay with bounding box handles + Blender gizmo
- ModalTransform (Blender-style G/R/S with pointer lock, axis lock, numeric input)

## ✅ Phase 4: Timeline & Animation (COMPLETE)
- AnimationClock (playback, frame timing)
- KeyframeEngine (interpolation, evaluation)
- PropertyBinder (evaluates keyframes each frame)
- keyframeStore (Zustand)
- timelineStore (zoom, scroll, playhead, work area)
- TimelinePanel (AE layout: track labels + keyframe area)
- PlaybackControls, TimelineRuler, Playhead
- GraphEditorPanel (SVG-based curve editor)
- Animation menu + keyboard shortcuts

## ✅ Phase 5: Effects System (COMPLETE)
- Effect types (EffectInstance, EffectParameter, EffectDefinition)
- EffectRegistry (register/get/list/listByCategory)
- FBOPool (reusable FBO pool)
- EffectChain (ping-pong FBO pipeline + 15 inline GLSL shaders)
- 15 built-in effects (gaussianBlur, glow, dropShadow, colorCorrection, levels, hueSaturation, tint, invert, threshold, fill, gradient, wave, boxBlur, directionalBlur, radialBlur)
- effectsStore (Zustand CRUD + keyframable params)
- EffectsSection UI (categorized add, collapsible params, stopwatch/diamond integration)
- EffectsRenderer (bridges effects into rendering pipeline)
- ShaderLoader (async GLSL loading with fallback)

## 🔶 Phase 6: Masks & Blending Modes (PARTIALLY DONE)
### Completed:
- [x] src/types/mask.ts — Mask shape types, interface, defaultMask()
- [x] src/renderer/blending/BlendModes.ts — 27 AE blend modes, GLSL builder, mode index
- [x] src/state/maskStore.ts — Zustand store (add/remove/update/reorder/select masks)
- [x] src/renderer/layers/NullLayerRenderer.ts — Null object layer

### Not Started:
- [ ] Mask rendering pipeline (MaskRenderer, SDF, feather, expansion, compositor)
- [ ] Mask UI (MasksSection, MaskListItem, MaskModeDropdown)
- [ ] Blend mode UI (BlendModeDropdown, category groups)
- [ ] Compositor pipeline (Compositor.ts, LayerComposite.ts)
- [ ] Mask viewport interaction (MaskOverlay, handles, editing)
- [ ] Track mattes
- [ ] Preserve transparency
- [ ] Parenting system (ParentTransform.ts)
- [ ] Shy/Solo/Guide layer systems
- [ ] Menu additions + keyboard shortcuts

## ❌ Phase 7: Playback Optimization (NOT STARTED)
- RAM preview, adaptive resolution, web workers

## 🔶 Phase 8: Storage & Project Files (IN PROGRESS — CURRENT)
Current implementation ongoing...
