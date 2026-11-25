import * as THREE from '../../vendor/three.module.js';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { mergeGeometries } from '../../vendor/BufferGeometryUtils.js';
import { wallMat, trimMat, glowMat } from './materials.js';

export const ARENA_ASSET_MANIFEST = Object.freeze({
  arcfield_tile: 'assets/models/arena/arcfield_tile.glb',
  deflector_pylon: 'assets/models/arena/deflector_pylon.glb',
  wall_buttress: 'assets/models/arena/wall_buttress.glb',
  stadium_segment: 'assets/models/arena/stadium_segment.glb',
  stadium_pylon: 'assets/models/arena/stadium_pylon.glb'
});

export const FOUNDRY_MATERIAL_SLOTS = Object.freeze([
  'Foundry_Armor',
  'Foundry_Trim',
  'Foundry_Conduit'
]);

const _assetCache = new Map();
const _inflightCache = new Map();
let _sharedLoader = null;

function getSharedGLTFLoader() {
  if (!_sharedLoader) {
    _sharedLoader = new GLTFLoader();
  }
  return _sharedLoader;
}

/**
 * Resolves a manifest key or relative path to a `.glb` URL.
 * @param {string} keyOrUrl
 * @returns {string}
 */
export function resolveArenaAssetUrl(keyOrUrl) {
  return ARENA_ASSET_MANIFEST[keyOrUrl] || keyOrUrl;
}

/**
 * Checks whether asynchronous `.glb` fetching is supported in the current runtime.
 * @returns {boolean}
 */
export function canLoadExternalModels() {
  return typeof window !== 'undefined' && (typeof fetch === 'function' || typeof XMLHttpRequest !== 'undefined');
}

/**
 * Resolves a Blender material name to a canonical Foundry material slot.
 * @param {string} [matName='']
 * @returns {'Foundry_Armor'|'Foundry_Trim'|'Foundry_Conduit'}
 */
export function resolveFoundrySlotName(matName = '') {
  if (matName === 'Foundry_Armor' || matName === 'Foundry_Trim' || matName === 'Foundry_Conduit') {
    return matName;
  }
  const lower = String(matName).toLowerCase();
  if (lower.includes('conduit') || lower.includes('emissive') || lower.includes('glow')) {
    return 'Foundry_Conduit';
  }
  if (lower.includes('trim') || lower.includes('rib')) {
    return 'Foundry_Trim';
  }
  return 'Foundry_Armor';
}

/**
 * Binds `Foundry_Armor`, `Foundry_Trim`, and `Foundry_Conduit` material slots on a loaded glTF hierarchy
 * to shared runtime Three.js materials so sector theme updates propagate cleanly.
 *
 * @param {THREE.Object3D} root
 * @param {object} [materialOverrides]
 * @returns {THREE.Object3D}
 */
export function bindFoundryMaterials(root, materialOverrides = {}) {
  if (!root || typeof root.traverse !== 'function') return root;

  const slotMap = {
    Foundry_Armor: materialOverrides.Foundry_Armor || wallMat,
    Foundry_Trim: materialOverrides.Foundry_Trim || trimMat,
    Foundry_Conduit: materialOverrides.Foundry_Conduit || glowMat
  };

  root.traverse((child) => {
    if (!child.isMesh) return;
    const rawMat = Array.isArray(child.material) ? child.material[0] : child.material;
    const slotName = resolveFoundrySlotName(rawMat ? rawMat.name : '');
    child.userData.foundrySlot = slotName;
    child.material = slotMap[slotName] || slotMap.Foundry_Armor;
  });

  return root;
}

/**
 * Normalizes a loaded glTF scene hierarchy to target bounds and/or anchor origin,
 * baking the transform directly into child geometries so instanced and cloned meshes
 * share exact local coordinates.
 *
 * @param {THREE.Object3D} root
 * @param {object} [options]
 * @param {[number, number, number]} [options.targetSize]
 * @param {boolean} [options.uniformScale=false]
 * @param {'center'|'base'|'preserve'} [options.anchor='preserve']
 * @returns {THREE.Object3D}
 */
export function normalizeAssetRoot(root, options = {}) {
  if (!root) return root;

  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) return root;

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  let sx = 1;
  let sy = 1;
  let sz = 1;
  if (Array.isArray(options.targetSize) && options.targetSize.length === 3) {
    const [tx, ty, tz] = options.targetSize;
    sx = size.x > 1e-6 && tx > 0 ? tx / size.x : 1;
    sy = size.y > 1e-6 && ty > 0 ? ty / size.y : 1;
    sz = size.z > 1e-6 && tz > 0 ? tz / size.z : 1;
    if (options.uniformScale) {
      const u = Math.min(sx, sy, sz);
      sx = u;
      sy = u;
      sz = u;
    }
  }

  let ox = 0;
  let oy = 0;
  let oz = 0;
  const anchor = options.anchor || 'preserve';
  if (anchor === 'center') {
    ox = -center.x * sx;
    oy = -center.y * sy;
    oz = -center.z * sz;
  } else if (anchor === 'base') {
    ox = -center.x * sx;
    oy = -box.min.y * sy;
    oz = -center.z * sz;
  }

  const normMatrix = new THREE.Matrix4().compose(
    new THREE.Vector3(ox, oy, oz),
    new THREE.Quaternion(),
    new THREE.Vector3(sx, sy, sz)
  );

  root.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const baked = child.geometry.clone();
    const worldMat = child.matrixWorld.clone();
    const fullMat = new THREE.Matrix4().multiplyMatrices(normMatrix, worldMat);
    baked.applyMatrix4(fullMat);
    baked.computeBoundingBox();
    baked.computeBoundingSphere();
    child.geometry = baked;
    child.position.set(0, 0, 0);
    child.rotation.set(0, 0, 0);
    child.scale.set(1, 1, 1);
    child.updateMatrix();
  });

  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);
  return root;
}

/**
 * Extracts and merges all mesh geometries inside a normalized glTF root
 * into a single `THREE.BufferGeometry` suitable for single-material `InstancedMesh` rendering.
 *
 * @param {THREE.Object3D} root
 * @returns {THREE.BufferGeometry|null}
 */
export function extractMergedGeometry(root) {
  if (!root || typeof root.traverse !== 'function') return null;

  root.updateMatrixWorld(true);
  const parts = [];

  root.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const nonIdx = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
    nonIdx.applyMatrix4(child.matrixWorld);

    // Ensure identical attribute set (position, normal, uv) across primitives before merging
    for (const attrName of Object.keys(nonIdx.attributes)) {
      if (attrName !== 'position' && attrName !== 'normal' && attrName !== 'uv') {
        nonIdx.deleteAttribute(attrName);
      }
    }
    if (!nonIdx.hasAttribute('normal')) {
      nonIdx.computeVertexNormals();
    }
    if (!nonIdx.hasAttribute('uv') && nonIdx.hasAttribute('position')) {
      const count = nonIdx.attributes.position.count;
      nonIdx.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    }
    parts.push(nonIdx);
  });

  if (parts.length === 0) return null;

  const merged = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  if (parts.length > 1) {
    for (const p of parts) p.dispose();
  }
  if (!merged) return null;

  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

/**
 * Clones a normalized asset scene while sharing geometries and bound Foundry materials.
 * @param {THREE.Object3D} sourceRoot
 * @returns {THREE.Group}
 */
export function cloneAssetScene(sourceRoot) {
  const group = new THREE.Group();
  if (!sourceRoot || typeof sourceRoot.traverse !== 'function') return group;

  sourceRoot.traverse((child) => {
    if (!child.isMesh) return;
    const mesh = new THREE.Mesh(child.geometry, child.material);
    mesh.name = child.name;
    mesh.position.copy(child.position);
    mesh.rotation.copy(child.rotation);
    mesh.scale.copy(child.scale);
    mesh.castShadow = child.castShadow;
    mesh.receiveShadow = child.receiveShadow;
    mesh.userData = { ...child.userData };
    group.add(mesh);
  });

  return group;
}

function buildCacheKey(url, options) {
  const sizeKey = Array.isArray(options.targetSize) ? options.targetSize.join('x') : 'native';
  const anchorKey = options.anchor || 'preserve';
  return `${url}::${sizeKey}::${anchorKey}`;
}

/**
 * Asynchronously loads (or parses), caches, normalizes, and binds Foundry material slots
 * for an arena `.glb` architectural asset. Safely resolves to `null` in headless/offline environments.
 *
 * @param {string} keyOrUrl Manifest key (e.g. `'arcfield_tile'`) or `.glb` URL
 * @param {object} [options]
 * @param {[number, number, number]} [options.targetSize]
 * @param {boolean} [options.uniformScale=false]
 * @param {'center'|'base'|'preserve'} [options.anchor='preserve']
 * @param {object} [options.materials] Material slot overrides (`Foundry_Armor`, `Foundry_Trim`, `Foundry_Conduit`)
 * @param {GLTFLoader} [options.loader] Optional loader override for testing
 * @param {ArrayBuffer} [options.arrayBuffer] Optional pre-loaded GLB binary buffer
 * @param {boolean} [options.silent=false]
 * @returns {Promise<{
 *   key: string,
 *   url: string,
 *   scene: THREE.Object3D,
 *   mergedGeometry: THREE.BufferGeometry|null,
 *   clone: () => THREE.Group
 * } | null>}
 */
export async function loadArenaAsset(keyOrUrl, options = {}) {
  const url = resolveArenaAssetUrl(keyOrUrl);
  const cacheKey = buildCacheKey(url, options);

  if (_assetCache.has(cacheKey)) {
    return _assetCache.get(cacheKey);
  }
  if (_inflightCache.has(cacheKey)) {
    return _inflightCache.get(cacheKey);
  }

  const promise = (async () => {
    const hasCustomInput = !!(options.arrayBuffer || options.loader);
    if (!hasCustomInput && !canLoadExternalModels()) {
      return null;
    }

    try {
      const loader = options.loader || getSharedGLTFLoader();
      let gltf;
      if (options.arrayBuffer) {
        gltf = await new Promise((resolve, reject) => {
          loader.parse(options.arrayBuffer, '', resolve, reject);
        });
      } else {
        gltf = await loader.loadAsync(url);
      }

      if (!gltf || !gltf.scene) {
        return null;
      }

      const root = gltf.scene;
      normalizeAssetRoot(root, options);
      bindFoundryMaterials(root, options.materials);
      const mergedGeometry = extractMergedGeometry(root);

      const record = {
        key: keyOrUrl,
        url,
        scene: root,
        mergedGeometry,
        clone: () => cloneAssetScene(root)
      };

      _assetCache.set(cacheKey, record);
      return record;
    } catch (err) {
      if (!options.silent) {
        console.warn(`[ArenaAssetLoader] Failed to load '${url}', using procedural fallback:`, err);
      }
      return null;
    } finally {
      _inflightCache.delete(cacheKey);
    }
  })();

  _inflightCache.set(cacheKey, promise);
  return promise;
}

/**
 * Returns a previously cached asset record synchronously, or `null` if not loaded yet.
 * @param {string} keyOrUrl
 * @param {object} [options]
 */
export function getCachedArenaAsset(keyOrUrl, options = {}) {
  const url = resolveArenaAssetUrl(keyOrUrl);
  return _assetCache.get(buildCacheKey(url, options)) || null;
}

/**
 * Loads all arena architectural assets defined in `ARENA_ASSET_MANIFEST` in parallel.
 * @param {object} [options]
 * @returns {Promise<Record<string, ReturnType<typeof getCachedArenaAsset>>>}
 */
export async function loadAllArenaAssets(options = {}) {
  const entries = await Promise.all(
    Object.keys(ARENA_ASSET_MANIFEST).map(async (key) => {
      const asset = await loadArenaAsset(key, options[key] || options);
      return [key, asset];
    })
  );
  return Object.fromEntries(entries);
}

/**
 * Clears cached arena assets and in-flight promises.
 */
export function clearArenaAssetCache() {
  for (const record of _assetCache.values()) {
    if (record && record.mergedGeometry && typeof record.mergedGeometry.dispose === 'function') {
      record.mergedGeometry.dispose();
    }
    if (record && record.scene && typeof record.scene.traverse === 'function') {
      record.scene.traverse((child) => {
        if (child.isMesh && child.geometry && typeof child.geometry.dispose === 'function') {
          child.geometry.dispose();
        }
      });
    }
  }
  _assetCache.clear();
  _inflightCache.clear();
}
