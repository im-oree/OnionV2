/**
 * Structured documentation content for the shader authoring API.
 * Rendered by ShaderDocs.tsx.
 */

export interface DocSection {
  id: string;
  title: string;
  content: DocBlock[];
}

export type DocBlock =
  | { kind: 'p'; text: string }
  | { kind: 'code'; lang: 'glsl' | 'ts'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'note'; text: string; variant?: 'info' | 'warn' | 'tip' };

export const DOCS_SECTIONS: DocSection[] = [
  {
    id: 'intro',
    title: 'Introduction',
    content: [
      { kind: 'p', text: 'Custom effects are user-authored GPU shaders that behave identically to built-in effects. Once created, they appear in the Effect Library, support keyframing, can be applied to any layer or adjustment layer, and can be exported to share.' },
      { kind: 'p', text: 'Every custom effect consists of two pieces:' },
      { kind: 'list', items: [
        'A fragment shader written in GLSL ES 1.00 (WebGL 1)',
        'A parameter schema defining the uniforms your shader can control',
      ]},
      { kind: 'note', variant: 'info', text: 'You do NOT write JavaScript, TypeScript, or a vertex shader. The system provides all of that for you — you only write the fragment shader and declare parameters.' },
    ],
  },
  {
    id: 'basic-template',
    title: 'Basic template',
    content: [
      { kind: 'p', text: 'Every fragment shader must define main() and write to gl_FragColor. The minimum viable effect passes the source through unchanged:' },
      { kind: 'code', lang: 'glsl', text: `uniform sampler2D uTexture;
varying vec2 vUv;

void main() {
  gl_FragColor = texture2D(uTexture, vUv);
}` },
      { kind: 'p', text: 'From here you modify the sampled colour before writing it out.' },
    ],
  },
  {
    id: 'uniforms',
    title: 'Built-in uniforms',
    content: [
      { kind: 'p', text: 'The following uniforms are always available in your shader. You do NOT need to declare them as parameters — they are injected automatically by the runtime.' },
      { kind: 'code', lang: 'glsl', text: `uniform sampler2D uTexture;   // The source pixels (from previous effect or the layer)
uniform vec2      uResolution; // Layer size in pixels (width, height)
uniform float     uTime;       // Seconds. Only meaningful if you toggle "Uses uTime" in Settings.` },
      { kind: 'note', variant: 'tip', text: 'uTime is driven by the composition playhead. When you toggle "Uses uTime", the runtime also injects Auto/Manual/Speed/Offset controls so the user can control how the effect animates.' },
    ],
  },
  {
    id: 'varyings',
    title: 'Varyings',
    content: [
      { kind: 'p', text: 'You have one varying available:' },
      { kind: 'code', lang: 'glsl', text: `varying vec2 vUv;   // Texture coordinates in the 0..1 range.
                    // vUv.x = 0 is left, vUv.x = 1 is right.
                    // vUv.y = 0 is top,  vUv.y = 1 is bottom.` },
      { kind: 'note', variant: 'info', text: 'Note the Y direction: top-left origin, matching a normal DOM image. This differs from raw WebGL convention.' },
    ],
  },
  {
    id: 'params',
    title: 'User parameters',
    content: [
      { kind: 'p', text: 'In the Params tab you can add parameters that become uniforms in your shader. Each parameter has a uniform name like uRadius — you reference it in your shader by declaring uniform float uRadius; (or vec2, vec3, bool depending on type).' },
      { kind: 'p', text: 'Type-to-GLSL mapping:' },
      { kind: 'code', lang: 'glsl', text: `// Param type "number"  →  uniform float uMyParam;
// Param type "percent" →  uniform float uMyParam;  // ranges 0..100
// Param type "angle"   →  uniform float uMyParam;  // ranges 0..360 (degrees)
// Param type "color"   →  uniform vec3  uMyParam;  // rgb 0..1
// Param type "boolean" →  uniform bool  uMyParam;
// Param type "vector2" →  uniform vec2  uMyParam;
// Param type "select"  →  uniform float uMyParam;  // integer value cast to float` },
      { kind: 'note', variant: 'warn', text: 'The uniform name in your shader must match the uniform name you configure in the parameter row, exactly.' },
    ],
  },
  {
    id: 'color-space',
    title: 'Colour space',
    content: [
      { kind: 'p', text: 'The source texture (uTexture) is sampled in the sRGB colour space. After you write to gl_FragColor, the result is passed to downstream effects (or to the compositor) also in sRGB.' },
      { kind: 'p', text: 'Do NOT apply your own gamma correction — the renderer handles the sRGB → linear conversion automatically for math-heavy operations. Just work in sRGB space as if you were painting on a normal computer monitor.' },
      { kind: 'note', variant: 'tip', text: 'For colour params, the vec3 uniform arrives in 0..1 range. Multiply / mix / lerp them freely with texture colours.' },
    ],
  },
  {
    id: 'alpha',
    title: 'Alpha and transparency',
    content: [
      { kind: 'p', text: 'The alpha channel is NOT premultiplied. gl_FragColor.a controls the transparency of that pixel in the composite.' },
      { kind: 'p', text: 'Common patterns:' },
      { kind: 'code', lang: 'glsl', text: `vec4 src = texture2D(uTexture, vUv);

// Preserve original alpha:
gl_FragColor = vec4(myModifiedRGB, src.a);

// Add extra transparency:
gl_FragColor = vec4(myModifiedRGB, src.a * 0.5);

// Composite a new colour on top (dropping the original):
gl_FragColor = vec4(newColour, 1.0);` },
    ],
  },
  {
    id: 'sampling',
    title: 'Sampling other pixels',
    content: [
      { kind: 'p', text: 'You can sample uTexture at any UV coordinate, not just vUv. This lets you build blurs, glows, distortions, edge detection, etc.' },
      { kind: 'p', text: 'To convert pixel offsets to UV offsets, divide by uResolution:' },
      { kind: 'code', lang: 'glsl', text: `vec2 pixelOffset = vec2(3.0, 0.0);          // 3 pixels to the right
vec2 uvOffset    = pixelOffset / uResolution;
vec4 neighbour   = texture2D(uTexture, vUv + uvOffset);` },
      { kind: 'note', variant: 'warn', text: 'GLSL ES 1.00 does not support dynamic loop lengths. If you loop over samples, the upper bound must be a compile-time constant. Use a "if (i >= n) break;" pattern to cap dynamic sample counts.' },
    ],
  },
  {
    id: 'limitations',
    title: 'Limitations',
    content: [
      { kind: 'list', items: [
        'This is WebGL 1 / GLSL ES 1.00 — no dynamic loops, no compute shaders, no bindless textures',
        'Loop counters must be int, and loop bounds must be constant',
        'You cannot allocate memory or write to arbitrary locations',
        'No sampler2D array — you get exactly one input texture (uTexture)',
        'Custom textures / displacement maps from disk are not yet supported (planned)',
        'You cannot read the layer\'s own transform, position, or scale from inside the shader',
        'The vertex shader is fixed — you can only customise the fragment shader',
      ]},
      { kind: 'note', variant: 'info', text: 'Despite these limits, the vast majority of AE-style effects are expressible in single-pass fragment shaders. If you need multi-pass, the built-in effect module system supports it — the custom editor does not yet expose that.' },
    ],
  },
  {
    id: 'debugging',
    title: 'Debugging tips',
    content: [
      { kind: 'p', text: 'Shader debugging is hard because you can\'t print. The technique is to visualise intermediate values as colour:' },
      { kind: 'code', lang: 'glsl', text: `// Visualise a scalar (0..1) as greyscale:
gl_FragColor = vec4(vec3(myValue), 1.0);

// Visualise a vec2 as red+green:
gl_FragColor = vec4(myVec2, 0.0, 1.0);

// Isolate one channel:
gl_FragColor = vec4(vec3(src.r), 1.0);   // red as grey
gl_FragColor = vec4(0.0, 0.0, src.a, 1.0); // alpha as blue

// Show absolute value (for signed vectors like -1..1 normals):
gl_FragColor = vec4(abs(myVec3), 1.0);` },
      { kind: 'note', variant: 'tip', text: 'The live preview updates as you type (400ms debounce). Watch it while modifying values — instant visual feedback is your best debugger.' },
    ],
  },
  {
    id: 'best-practices',
    title: 'Best practices',
    content: [
      { kind: 'list', items: [
        'Always use vec4 for gl_FragColor and preserve alpha (src.a) unless you have a reason not to',
        'Clamp any coordinate you sample with texture2D to 0..1 to avoid edge sampling artefacts on some drivers',
        'Divide pixel offsets by uResolution — do not hardcode pixel sizes',
        'For animated effects, toggle "Uses uTime" in Settings. Do not fake animation with keyframed params — the auto-injected time controls give users a Speed/Manual/Offset UI for free',
        'Give params clear names (Radius, Amount, Threshold) rather than abbreviations (r, a, t)',
        'Set sensible defaults so the effect looks reasonable the moment it\'s applied',
        'Set sensible min/max ranges so the drag scrub feels natural',
        'Use "percent" type for 0..100 controls and "angle" for degrees — the UI shows the right units',
      ]},
    ],
  },
  {
    id: 'sharing',
    title: 'Sharing your effects',
    content: [
      { kind: 'p', text: 'Every custom effect can be exported to a .onionfx file — click the download icon next to an effect in the list. This produces a single JSON file containing the shader source and full parameter schema.' },
      { kind: 'p', text: 'To install an effect from a .onionfx file, click the Upload button in the panel header and select the file. The effect appears in the list, immediately usable and identical to how it was on the original machine.' },
      { kind: 'note', variant: 'info', text: 'Custom effects are stored in your workspace folder under .effects/. You can back up or version-control that folder alongside your projects.' },
    ],
  },
];