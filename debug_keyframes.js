// debug_keyframes.js - Paste in browser console
(function() {
  const r = window.__renderer;
  if (!r) { console.error('No renderer found'); return; }
  
  console.group('🎬 Keyframe Debug');
  console.log('Renderer:', r ? '✅' : '❌');
  console.log('PropertyBinder:', r.propertyBinder ? '✅' : '❌');
  console.log('Total Keyframes:', r.propertyBinder?.engine?.totalKeyframes ?? 0);
  console.log('Composition:', r.composition?.id ?? 'None');
  console.log('Current Time:', r.composition?.currentTime ?? 0);
  console.log('Current Frame:', r.composition ? Math.floor(r.composition.currentTime * r.composition.fps) : 0);
  console.log('Layer Renderers:', r.layerSync?.getAllRenderers()?.size ?? 0);
  console.log('Render Loop Running:', r.renderLoop?.isRunning ?? false);
  console.log('Overrides Size:', r.propertyBinder?.overrides?.size ?? 0);
  console.groupEnd();
  
  // Force render and check
  r.renderLoop.requestRender();
  setTimeout(() => {
    console.log('Overrides after render:', r.propertyBinder?.overrides?.size ?? 0);
  }, 100);
})();
