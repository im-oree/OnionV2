/**
 * Model3DLoader — loads 3D model files (GLTF, GLB, OBJ, PLY, STL) into Three.js groups.
 * Uses dynamic imports for heavy loaders (GLTFLoader, OBJLoader, etc.)
 */
import * as THREE from 'three';

export interface Model3DData {
  /** Blob URL of the model file */
  url: string;
  /** Original filename */
  fileName: string;
  /** MIME type */
  mimeType: string;
  /** Loaded scene (cached after first load) */
  scene?: THREE.Group;
}

/** Cache loaded models by blob URL to avoid re-parsing */
const modelCache = new Map<string, THREE.Group>();

/**
 * Load a model file from a File object.
 * Returns the Model3DData with a blob URL and the loaded Three.js scene.
 */
export async function loadModelFile(file: File): Promise<Model3DData> {
  const url = URL.createObjectURL(file);
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
      // Try GLTF as fallback (it handles many formats)
      data.scene = await loadGLTF(url);
    }
  } catch (err) {
    console.error(`[Model3DLoader] Failed to load ${file.name}:`, err);
    // Create a placeholder cube so the layer isn't invisible
    data.scene = createPlaceholder();
  }

  return data;
}

async function loadGLTF(url: string): Promise<THREE.Group> {
  const cached = modelCache.get(url);
  if (cached) return cached.clone();

  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const scene = gltf.scene;
        // Auto-center and scale to fit
        fitToUnitBox(scene);

        // Ensure textures are preserved (don't dispose them)
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const mat = child.material as any;
            if (mat.map) mat.map.needsUpdate = true;
            if (mat.normalMap) mat.normalMap.needsUpdate = true;
            if (mat.emissiveMap) mat.emissiveMap.needsUpdate = true;
          }
        });

        scene.updateMatrixWorld(true);
        modelCache.set(url, scene);
        resolve(scene.clone());
      },
      undefined,
      (err) => reject(err),
    );
  });
}

async function loadOBJ(url: string): Promise<THREE.Group> {
  const cached = modelCache.get(url);
  if (cached) return cached.clone();

  const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
  const loader = new OBJLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (obj) => {
        // OBJ loads without materials — apply a default
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
        modelCache.set(url, obj);
        resolve(obj.clone());
      },
      undefined,
      (err) => reject(err),
    );
  });
}

async function loadPLY(url: string): Promise<THREE.Group> {
  const cached = modelCache.get(url);
  if (cached) return cached.clone();

  const { PLYLoader } = await import('three/examples/jsm/loaders/PLYLoader.js');
  const loader = new PLYLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (geometry) => {
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 }),
        );
        const group = new THREE.Group();
        group.add(mesh);
        fitToUnitBox(group);
        group.updateMatrixWorld(true);
        modelCache.set(url, group);
        resolve(group.clone());
      },
      undefined,
      (err) => reject(err),
    );
  });
}

async function loadSTL(url: string): Promise<THREE.Group> {
  const cached = modelCache.get(url);
  if (cached) return cached.clone();

  const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
  const loader = new STLLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (geometry) => {
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 }),
        );
        const group = new THREE.Group();
        group.add(mesh);
        fitToUnitBox(group);
        group.updateMatrixWorld(true);
        modelCache.set(url, group);
        resolve(group.clone());
      },
      undefined,
      (err) => reject(err),
    );
  });
}

/** Scale and center the model to fit within a 200x200x200 unit box */
function fitToUnitBox(obj: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim === 0) return;

  const scale = 200 / maxDim;
  obj.scale.multiplyScalar(scale);

  // Re-center
  obj.updateMatrixWorld(true);
  const newBox = new THREE.Box3().setFromObject(obj);
  const newCenter = newBox.getCenter(new THREE.Vector3());
  obj.position.sub(newCenter);
}

function createPlaceholder(): THREE.Group {
  const geo = new THREE.BoxGeometry(100, 100, 100);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xff6600,
    roughness: 0.5,
    transparent: true,
    opacity: 0.7,
    wireframe: false,
  });
  const mesh = new THREE.Mesh(geo, mat);

  // Add wireframe overlay
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });
  const wire = new THREE.Mesh(geo.clone(), wireMat);
  wire.scale.set(1.001, 1.001, 1.001);

  const group = new THREE.Group();
  group.add(mesh);
  group.add(wire);
  return group;
}
