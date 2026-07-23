/**
 * Model3DLoader — loads 3D model files (GLTF, GLB, OBJ, PLY, STL) into Three.js groups.
 * Uses dynamic imports for heavy loaders (GLTFLoader, OBJLoader, etc.)
 */
import * as THREE from 'three';

export interface Model3DData {
  url: string;
  fileName: string;
  mimeType: string;
  scene?: THREE.Group;
}

interface CacheEntry {
  group: THREE.Group;
  // Track all textures so we can dispose them on cache clear
  textures: THREE.Texture[];
}

// Fix #1 — cache stores full entry with textures, not just raw group
const modelCache = new Map<string, CacheEntry>();

// Fix #2 — track all blob URLs we create so they can be revoked on dispose
const blobUrls = new Set<string>();

export async function loadModelFile(file: File): Promise<Model3DData> {
  const url = URL.createObjectURL(file);
  blobUrls.add(url);

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  const data: Model3DData = {
    url,
    fileName: file.name,
    mimeType: file.type,
  };

  try {
    if (ext === 'gltf' || ext === 'glb') {
      data.scene = await loadGLTF(url);
    } else if (ext === 'obj') {
      data.scene = await loadOBJ(url);
    } else if (ext === 'ply') {
      data.scene = await loadPLY(url);
    } else if (ext === 'stl') {
      data.scene = await loadSTL(url);
    } else {
      // Fix #3 — unknown formats shouldn't silently fall back to GLTF;
      // that produces confusing errors. Throw so placeholder is used.
      throw new Error(`Unsupported format: .${ext}`);
    }
  } catch (err) {
    console.error(`[Model3DLoader] Failed to load ${file.name}:`, err);
    data.scene = createPlaceholder();
  }

  return data;
}

// Fix #4 — cloneWithTextures: THREE's .clone() does NOT deep-clone
// materials or textures. Each caller got the same material/texture
// references, so disposing one layer disposed all others.
// We deep-clone materials so each caller owns its own instances.
function deepCloneGroup(group: THREE.Group): THREE.Group {
  const clone = group.clone(true);
  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const cloneMaterial = (mat: THREE.Material): THREE.Material => {
      const m = mat.clone();
      // Clone any texture maps so each instance is independent
      const anyM = m as any;
      const mapKeys = [
        'map', 'normalMap', 'roughnessMap', 'metalnessMap',
        'emissiveMap', 'aoMap', 'displacementMap', 'alphaMap',
        'envMap', 'lightMap',
      ];
      for (const key of mapKeys) {
        if (anyM[key] instanceof THREE.Texture) {
          anyM[key] = anyM[key].clone();
          anyM[key].needsUpdate = true;
        }
      }
      return m;
    };

    if (Array.isArray(child.material)) {
      child.material = child.material.map(cloneMaterial);
    } else if (child.material) {
      child.material = cloneMaterial(child.material);
    }
  });
  return clone;
}

async function loadGLTF(url: string): Promise<THREE.Group> {
  const cached = modelCache.get(url);
  if (cached) return deepCloneGroup(cached.group);

  const { GLTFLoader } = await import(
    'three/examples/jsm/loaders/GLTFLoader.js'
  );
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const scene = gltf.scene;
        fitToUnitBox(scene);

        const textures: THREE.Texture[] = [];

        scene.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          const mat = child.material as any;
          if (!mat) return;

          const mapKeys = [
            'map', 'normalMap', 'roughnessMap', 'metalnessMap',
            'emissiveMap', 'aoMap', 'displacementMap', 'alphaMap',
          ];
          for (const key of mapKeys) {
            if (mat[key] instanceof THREE.Texture) {
              mat[key].needsUpdate = true;
              textures.push(mat[key]);
            }
          }
        });

        scene.updateMatrixWorld(true);
        modelCache.set(url, { group: scene, textures });
        resolve(deepCloneGroup(scene));
      },
      undefined,
      reject,
    );
  });
}

async function loadOBJ(url: string): Promise<THREE.Group> {
  const cached = modelCache.get(url);
  if (cached) return deepCloneGroup(cached.group);

  const { OBJLoader } = await import(
    'three/examples/jsm/loaders/OBJLoader.js'
  );
  const loader = new OBJLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (obj) => {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh && !child.material) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0xcccccc,
              roughness: 0.5,
              metalness: 0.1,
            });
          }
        });

        fitToUnitBox(obj);
        obj.updateMatrixWorld(true);
        modelCache.set(url, { group: obj, textures: [] });
        resolve(deepCloneGroup(obj));
      },
      undefined,
      reject,
    );
  });
}

async function loadPLY(url: string): Promise<THREE.Group> {
  const cached = modelCache.get(url);
  if (cached) return deepCloneGroup(cached.group);

  const { PLYLoader } = await import(
    'three/examples/jsm/loaders/PLYLoader.js'
  );
  const loader = new PLYLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (geometry) => {
        // Fix #5 — computeVertexNormals after potential color attribute
        // detection (PLY can have vertex colors)
        if (!geometry.attributes.normal) {
          geometry.computeVertexNormals();
        }

        const mat = new THREE.MeshStandardMaterial({
          color: 0xcccccc,
          roughness: 0.5,
          // Fix #6 — enable vertexColors if the PLY has color data
          vertexColors: !!geometry.attributes.color,
        });

        const mesh = new THREE.Mesh(geometry, mat);
        const group = new THREE.Group();
        group.add(mesh);
        fitToUnitBox(group);
        group.updateMatrixWorld(true);
        modelCache.set(url, { group, textures: [] });
        resolve(deepCloneGroup(group));
      },
      undefined,
      reject,
    );
  });
}

async function loadSTL(url: string): Promise<THREE.Group> {
  const cached = modelCache.get(url);
  if (cached) return deepCloneGroup(cached.group);

  const { STLLoader } = await import(
    'three/examples/jsm/loaders/STLLoader.js'
  );
  const loader = new STLLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (geometry) => {
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.5,
          }),
        );
        const group = new THREE.Group();
        group.add(mesh);
        fitToUnitBox(group);
        group.updateMatrixWorld(true);
        modelCache.set(url, { group, textures: [] });
        resolve(deepCloneGroup(group));
      },
      undefined,
      reject,
    );
  });
}

function fitToUnitBox(obj: THREE.Object3D): void {
  obj.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(obj);
  if (box.isEmpty()) return;

  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim === 0) return;

  // 1. Uniformly scale to fit within a 200-unit box
  const scale = 200 / maxDim;
  obj.scale.multiplyScalar(scale);
  obj.updateMatrixWorld(true);

  // 2. Bake the centering into geometry vertices, not position offset.
  //    Group.position stays at (0,0,0) so future transforms are predictable
  //    and scale operations happen around the true geometric center.
  const scaledBox = new THREE.Box3().setFromObject(obj);
  const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

  obj.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.geometry) return;
    // Convert world-space center offset into local-space of this mesh
    child.updateMatrixWorld(true);
    const localCenter = scaledCenter.clone().applyMatrix4(
      child.matrixWorld.clone().invert(),
    );
    child.geometry.translate(-localCenter.x, -localCenter.y, -localCenter.z);
    child.geometry.computeBoundingBox();
    child.geometry.computeBoundingSphere();
  });

  obj.updateMatrixWorld(true);
}

function createPlaceholder(): THREE.Group {
  const geo = new THREE.BoxGeometry(100, 100, 100);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xff6600,
    roughness: 0.5,
    transparent: true,
    opacity: 0.7,
  });
  const mesh = new THREE.Mesh(geo, mat);

  const wireMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });

  // Fix #9 — wireframe shares geometry ref, use same geo not clone
  // to avoid double GPU upload; wireframe=true only reads index data
  const wire = new THREE.Mesh(geo, wireMat);
  wire.scale.set(1.001, 1.001, 1.001);

  const group = new THREE.Group();
  group.add(mesh);
  group.add(wire);
  return group;
}

/**
 * Dispose all cached models and revoke blob URLs.
 * Call this when the project is closed.
 */
export function disposeModelCache(): void {
  for (const [, entry] of modelCache) {
    // Dispose geometries and materials in the cached master group
    entry.group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry?.dispose();
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const m of mats) m?.dispose();
    });
    for (const tex of entry.textures) {
      tex.dispose();
    }
  }

  modelCache.clear();

  for (const url of blobUrls) {
    URL.revokeObjectURL(url);
  }

  blobUrls.clear();
}