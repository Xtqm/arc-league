import * as THREE from '../../vendor/three.module.js';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';

export const CONSTRUCT_ASSET_MANIFEST = Object.freeze({
  player: 'assets/models/constructs/athlete_base.glb',
  athlete_base: 'assets/models/constructs/athlete_base.glb',
  drone: 'assets/models/constructs/chevron_drone.glb',
  sentinel: 'assets/models/constructs/sentinel_boss.glb'
});

export const CANONICAL_JOINT_NAMES = Object.freeze([
  'pelvis',
  'abdomen',
  'torso',
  'neck',
  'head',
  'leftShoulder',
  'rightShoulder',
  'leftElbow',
  'rightElbow',
  'leftHand',
  'rightHand',
  'leftHip',
  'rightHip',
  'leftKnee',
  'rightKnee'
]);

export const REQUIRED_CONSTRUCT_CLIPS = Object.freeze([
  'idle_hover',
  'sprint_lean',
  'throw_windup',
  'throw_release',
  'catch_recoil',
  'parry_brace',
  'dash_burst',
  'aerial_tuck'
]);

export const OPTIONAL_CONSTRUCT_CLIPS = Object.freeze(['eliminated']);

const ALL_KNOWN_CLIP_NAMES = [...REQUIRED_CONSTRUCT_CLIPS, ...OPTIONAL_CONSTRUCT_CLIPS];

const JOINT_PARENT_MAP = Object.freeze({
  pelvis: null,
  abdomen: 'pelvis',
  torso: 'abdomen',
  neck: 'torso',
  head: 'neck',
  leftShoulder: 'torso',
  leftElbow: 'leftShoulder',
  leftHand: 'leftElbow',
  rightShoulder: 'torso',
  rightElbow: 'rightShoulder',
  rightHand: 'rightElbow',
  leftHip: 'pelvis',
  leftKnee: 'leftHip',
  rightHip: 'pelvis',
  rightKnee: 'rightHip'
});

const JOINT_DEFAULT_POSITIONS = Object.freeze({
  pelvis: [0, 1.05, 0],
  abdomen: [0, 0.21, 0],
  torso: [0, 0.26, 0],
  neck: [0, 0.29, 0],
  head: [0, 0.18, 0],
  leftShoulder: [-0.40, 0.13, 0],
  leftElbow: [0, -0.32, 0],
  leftHand: [0, -0.30, 0],
  rightShoulder: [0.40, 0.13, 0],
  rightElbow: [0, -0.32, 0],
  rightHand: [0, -0.30, 0],
  leftHip: [-0.17, -0.08, 0],
  leftKnee: [0, -0.38, 0],
  rightHip: [0.17, -0.08, 0],
  rightKnee: [0, -0.38, 0]
});

const JOINT_ALIAS_MAP = new Map([
  ['pelvis', 'pelvis'],
  ['hips', 'pelvis'],
  ['hip', 'pelvis'],
  ['abdomen', 'abdomen'],
  ['spine', 'abdomen'],
  ['spine1', 'abdomen'],
  ['waist', 'abdomen'],
  ['torso', 'torso'],
  ['spine2', 'torso'],
  ['chest', 'torso'],
  ['upperchest', 'torso'],
  ['neck', 'neck'],
  ['head', 'head'],
  ['leftshoulder', 'leftShoulder'],
  ['leftarm', 'leftShoulder'],
  ['leftupperarm', 'leftShoulder'],
  ['lshoulder', 'leftShoulder'],
  ['shoulderl', 'leftShoulder'],
  ['upperarml', 'leftShoulder'],
  ['rightshoulder', 'rightShoulder'],
  ['rightarm', 'rightShoulder'],
  ['rightupperarm', 'rightShoulder'],
  ['rshoulder', 'rightShoulder'],
  ['shoulderr', 'rightShoulder'],
  ['upperarmr', 'rightShoulder'],
  ['leftelbow', 'leftElbow'],
  ['leftforearm', 'leftElbow'],
  ['leftlowerarm', 'leftElbow'],
  ['lelbow', 'leftElbow'],
  ['elbowl', 'leftElbow'],
  ['forearml', 'leftElbow'],
  ['lowerarml', 'leftElbow'],
  ['rightelbow', 'rightElbow'],
  ['rightforearm', 'rightElbow'],
  ['rightlowerarm', 'rightElbow'],
  ['relbow', 'rightElbow'],
  ['elbowr', 'rightElbow'],
  ['forearmr', 'rightElbow'],
  ['lowerarmr', 'rightElbow'],
  ['lefthand', 'leftHand'],
  ['lhand', 'leftHand'],
  ['handl', 'leftHand'],
  ['leftwrist', 'leftHand'],
  ['wristl', 'leftHand'],
  ['righthand', 'rightHand'],
  ['rhand', 'rightHand'],
  ['handr', 'rightHand'],
  ['rightwrist', 'rightHand'],
  ['wristr', 'rightHand'],
  ['lefthip', 'leftHip'],
  ['leftupleg', 'leftHip'],
  ['leftthigh', 'leftHip'],
  ['lhip', 'leftHip'],
  ['hipl', 'leftHip'],
  ['thighl', 'leftHip'],
  ['righthip', 'rightHip'],
  ['rightupleg', 'rightHip'],
  ['rightthigh', 'rightHip'],
  ['rhip', 'rightHip'],
  ['hipr', 'rightHip'],
  ['thighr', 'rightHip'],
  ['leftknee', 'leftKnee'],
  ['leftleg', 'leftKnee'],
  ['leftshin', 'leftKnee'],
  ['leftcalf', 'leftKnee'],
  ['lknee', 'leftKnee'],
  ['kneel', 'leftKnee'],
  ['shinl', 'leftKnee'],
  ['rightknee', 'rightKnee'],
  ['rightleg', 'rightKnee'],
  ['rightshin', 'rightKnee'],
  ['rightcalf', 'rightKnee'],
  ['rknee', 'rightKnee'],
  ['kneer', 'rightKnee'],
  ['shinr', 'rightKnee']
]);

const _constructCache = new Map();
const _inflightConstructCache = new Map();
let _sharedLoader = null;

function getSharedGLTFLoader() {
  if (!_sharedLoader) {
    _sharedLoader = new GLTFLoader();
  }
  return _sharedLoader;
}

/**
 * Resolves a construct manifest key or relative URL to a `.glb` asset path.
 * @param {string} keyOrUrl
 * @returns {string}
 */
export function resolveConstructAssetUrl(keyOrUrl) {
  return CONSTRUCT_ASSET_MANIFEST[keyOrUrl] || keyOrUrl;
}

/**
 * Checks whether asynchronous `.glb` fetching is supported in the current runtime.
 * @returns {boolean}
 */
export function canLoadExternalConstructs() {
  return typeof window !== 'undefined' && (typeof fetch === 'function' || typeof XMLHttpRequest !== 'undefined');
}

/**
 * Maps a raw Blender/Mixamo bone or node name to a canonical joint identifier, or `null`.
 * @param {string} [rawName='']
 * @returns {string|null}
 */
export function normalizeJointName(rawName = '') {
  if (!rawName || typeof rawName !== 'string') return null;
  let cleaned = rawName.trim();
  cleaned = cleaned.replace(/^mixamorig[:_]?/i, '');
  cleaned = cleaned.replace(/^armature[:_|.]?/i, '');
  cleaned = cleaned.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return JOINT_ALIAS_MAP.get(cleaned) || null;
}

/**
 * Resolves a semantic `userData.part` tag for a node based on existing tags, node name, or material name.
 * @param {THREE.Object3D} node
 * @returns {'chassis_suit'|'chassis_trim'|'chassis_visor'|'chassis_halo'|'chassis_back_disc'|null}
 */
export function resolveConstructPartTag(node) {
  if (!node) return null;
  const existing = node.userData?.part;
  if (
    existing === 'chassis_suit' ||
    existing === 'chassis_trim' ||
    existing === 'chassis_visor' ||
    existing === 'chassis_halo' ||
    existing === 'chassis_back_disc'
  ) {
    return existing;
  }

  const rawName = String(node.name || '').toLowerCase();
  const matName = node.isMesh
    ? String((Array.isArray(node.material) ? node.material[0]?.name : node.material?.name) || '').toLowerCase()
    : '';
  const probe = `${rawName} ${matName}`;

  if (
    rawName.startsWith('back_disc') ||
    rawName.startsWith('palm_disc') ||
    rawName.includes('chassis_back_disc')
  ) {
    return 'chassis_back_disc';
  }
  if (rawName.startsWith('halo_') || rawName === 'halo' || rawName === 'headhalo' || rawName === 'head_halo') {
    return 'chassis_halo';
  }
  if (rawName.startsWith('visor_') || rawName === 'visor' || probe.includes('chassis_visor')) {
    return 'chassis_visor';
  }
  if (
    rawName.startsWith('core_') ||
    rawName === 'core' ||
    rawName === 'coremesh' ||
    rawName.startsWith('trim_') ||
    rawName.startsWith('edge_') ||
    probe.includes('chassis_trim')
  ) {
    return 'chassis_trim';
  }
  if (
    rawName.startsWith('suit_') ||
    rawName.startsWith('armor_') ||
    rawName.startsWith('shard_') ||
    rawName.startsWith('palm_') ||
    rawName.startsWith('thumb_') ||
    rawName.startsWith('finger_') ||
    probe.includes('chassis_suit')
  ) {
    return 'chassis_suit';
  }
  if (node.isMesh) {
    return 'chassis_suit';
  }
  return null;
}

/**
 * Normalizes animation clips into a canonical lookup dictionary by clip name.
 * @param {THREE.AnimationClip[]} [animations=[]]
 * @returns {Record<string, THREE.AnimationClip>}
 */
export function indexConstructClips(animations = []) {
  const clips = {};
  if (!Array.isArray(animations)) return clips;

  for (const clip of animations) {
    if (!clip || !clip.name) continue;
    const raw = String(clip.name).trim();
    const lowered = raw.toLowerCase().replace(/[\s-]+/g, '_');
    const matched = ALL_KNOWN_CLIP_NAMES.find((k) => lowered === k || lowered.endsWith(`_${k}`) || lowered.startsWith(`${k}_`));
    if (matched) {
      clips[matched] = clip;
    } else {
      clips[raw] = clip;
    }
  }
  return clips;
}

/**
 * Normalizes a loaded glTF construct scene in-place (or cloned hierarchy) into the Arc League
 * Construct rig contract: `userData.joints`, `userData.part` tags, `coreMesh`, `headHalo`,
 * `dorsalWingPivot`, `palmSocket`, `backDisc`, and `floatingShards`.
 *
 * @param {THREE.Object3D} root
 * @param {object} [options]
 * @param {THREE.AnimationClip[]} [options.animations]
 * @returns {THREE.Object3D}
 */
export function normalizeConstructHierarchy(root, options = {}) {
  if (!root || typeof root.traverse !== 'function') return root;

  const animations = options.animations || root.animations || [];
  const positionAnimatedTargets = new Set();
  for (const clip of animations) {
    if (!clip || !Array.isArray(clip.tracks)) continue;
    for (const track of clip.tracks) {
      if (typeof track?.name === 'string' && track.name.endsWith('.position')) {
        positionAnimatedTargets.add(track.name.slice(0, -'.position'.length));
      }
    }
  }

  const joints = {};
  const floatingShards = [];
  let coreMesh = null;
  let headHalo = null;
  let dorsalWingPivot = null;
  let palmSocket = null;
  let backDisc = null;
  let firstVisor = null;

  root.traverse((child) => {
    if (child === root) return;
    const rawName = String(child.name || '');
    const lowerName = rawName.toLowerCase();

    // 1. Joint mapping
    const jointKey = normalizeJointName(rawName) || (CANONICAL_JOINT_NAMES.includes(child.userData?.name) ? child.userData.name : null);
    if (jointKey && !joints[jointKey] && !child.isMesh && !child.isLine) {
      joints[jointKey] = child;
      child.userData.name = jointKey;
    }

    // 2. Socket discovery
    if (!palmSocket && (lowerName === 'palm_socket_r' || lowerName === 'palmsocketr' || lowerName === 'palm_socket' || lowerName === 'disc_socket_r')) {
      palmSocket = child;
      child.userData.name = 'palm_socket_r';
    }
    if (!dorsalWingPivot && (lowerName === 'dorsal_socket' || lowerName === 'dorsalwingpivot' || lowerName === 'dorsal_wing_pivot')) {
      dorsalWingPivot = child;
      child.userData.name = 'dorsalWingPivot';
    }

    // 3. Semantic part tagging and special mesh references
    if (child.isMesh || child.isLine || child.isLineSegments) {
      const partTag = resolveConstructPartTag(child);
      if (partTag) {
        child.userData.part = partTag;
      }

      if (child.isLine || child.isLineSegments || lowerName.startsWith('edge_')) {
        child.userData.part = 'chassis_trim';
        child.userData.isEdgeTrim = true;
      }

      if (!coreMesh && (lowerName.startsWith('core_') || lowerName === 'core' || lowerName === 'coremesh')) {
        coreMesh = child;
      }
      if (!headHalo && partTag === 'chassis_halo') {
        headHalo = child;
      }
      if (!backDisc && partTag === 'chassis_back_disc') {
        backDisc = child;
      }
      if (partTag === 'chassis_visor') {
        if (!firstVisor) {
          firstVisor = child;
        } else {
          // Enforce single visor tag per rig
          child.userData.part = 'chassis_trim';
        }
      }

      if (child.isMesh && partTag === 'chassis_suit') {
        if (child.material && 'flatShading' in child.material && !child.material.flatShading) {
          child.material.flatShading = true;
          child.material.needsUpdate = true;
        }
        const isHandPart = lowerName.startsWith('palm_') || lowerName.startsWith('thumb_') || lowerName.startsWith('finger_');
        if (!isHandPart && !positionAnimatedTargets.has(rawName)) {
          if (!child.userData.floatBasePos) {
            child.userData.floatBasePos = child.position.clone();
          }
          if (child.userData.floatPhase === undefined) {
            child.userData.floatPhase = floatingShards.length * 0.65;
          }
          if (child.userData.floatAmp === undefined) {
            child.userData.floatAmp = 0.008;
          }
          floatingShards.push(child);
        }
      }
    }
  });

  // 4. Synthesize any missing canonical joints in the parent-child hierarchy
  for (const jointName of CANONICAL_JOINT_NAMES) {
    if (!joints[jointName]) {
      const synthesized = new THREE.Group();
      synthesized.name = jointName;
      synthesized.userData.name = jointName;
      const defPos = JOINT_DEFAULT_POSITIONS[jointName];
      if (defPos) {
        synthesized.position.set(defPos[0], defPos[1], defPos[2]);
      }
      const parentKey = JOINT_PARENT_MAP[jointName];
      const parentObj = parentKey ? joints[parentKey] : root;
      (parentObj || root).add(synthesized);
      joints[jointName] = synthesized;
    }
  }

  // Ensure canonical joint parent-child connectivity when synthesized or detached
  for (const jointName of CANONICAL_JOINT_NAMES) {
    const joint = joints[jointName];
    const expectedParentKey = JOINT_PARENT_MAP[jointName];
    if (joint && expectedParentKey && joints[expectedParentKey] && !joint.parent) {
      joints[expectedParentKey].add(joint);
    }
  }

  // 5. Synthesize dorsalWingPivot and palmSocket if absent
  if (!dorsalWingPivot) {
    dorsalWingPivot = new THREE.Group();
    dorsalWingPivot.name = 'dorsal_socket';
    dorsalWingPivot.userData.name = 'dorsalWingPivot';
    dorsalWingPivot.position.set(0, 0.12, -0.18);
    joints.torso.add(dorsalWingPivot);
  }
  if (!palmSocket) {
    palmSocket = new THREE.Group();
    palmSocket.name = 'palm_socket_r';
    palmSocket.userData.name = 'palm_socket_r';
    palmSocket.position.set(0, -0.06, 0.18);
    joints.rightHand.add(palmSocket);
  }

  // 6. Populate root.userData references
  root.userData.part = 'chassis_root';
  root.userData.joints = joints;
  for (const jointName of CANONICAL_JOINT_NAMES) {
    root.userData[jointName] = joints[jointName];
  }
  root.userData.dorsalWingPivot = dorsalWingPivot;
  root.userData.palmSocket = palmSocket;
  root.userData.floatingShards = floatingShards;
  if (coreMesh) root.userData.coreMesh = coreMesh;
  if (headHalo) root.userData.headHalo = headHalo;
  if (backDisc) root.userData.backDisc = backDisc;

  return root;
}

function cloneMaterialsOnNode(material) {
  if (!material) return material;
  if (Array.isArray(material)) {
    return material.map((m) => (m && typeof m.clone === 'function' ? m.clone() : m));
  }
  return typeof material.clone === 'function' ? material.clone() : material;
}

/**
 * Deep-clones a construct hierarchy preserving shared GPU geometries while creating
 * per-instance cloned materials and rebinding any `SkinnedMesh` skeletons to cloned bones.
 *
 * @param {THREE.Object3D} sourceRoot
 * @returns {THREE.Group}
 */
export function cloneConstructHierarchy(sourceRoot) {
  const rootGroup = new THREE.Group();
  if (!sourceRoot || typeof sourceRoot.traverse !== 'function') return rootGroup;

  const sourceToClone = new Map();
  const skinnedMeshes = [];

  function cloneNodeRecursive(src, isRoot = false) {
    let dst;
    if (isRoot) {
      dst = rootGroup;
    } else if (src.isSkinnedMesh) {
      dst = new THREE.SkinnedMesh(src.geometry, cloneMaterialsOnNode(src.material));
      skinnedMeshes.push({ src, dst });
    } else if (src.isMesh) {
      dst = new THREE.Mesh(src.geometry, cloneMaterialsOnNode(src.material));
    } else if (src.isLineSegments) {
      dst = new THREE.LineSegments(src.geometry, cloneMaterialsOnNode(src.material));
    } else if (src.isLine) {
      dst = new THREE.Line(src.geometry, cloneMaterialsOnNode(src.material));
    } else if (src.isBone) {
      dst = new THREE.Bone();
    } else if (src.isPointLight) {
      dst = new THREE.PointLight(src.color.clone(), src.intensity, src.distance, src.decay);
    } else if (src.isGroup) {
      dst = new THREE.Group();
    } else {
      dst = new THREE.Object3D();
    }

    dst.name = src.name;
    dst.position.copy(src.position);
    dst.quaternion.copy(src.quaternion);
    dst.scale.copy(src.scale);
    dst.visible = src.visible;
    dst.castShadow = src.castShadow;
    dst.receiveShadow = src.receiveShadow;

    // Copy primitive/plain metadata without leaking template object references
    dst.userData = {};
    if (src.userData) {
      for (const [k, v] of Object.entries(src.userData)) {
        if (k === 'floatBasePos' && v && typeof v.clone === 'function') {
          dst.userData[k] = v.clone();
        } else if (v === null || typeof v !== 'object') {
          dst.userData[k] = v;
        }
      }
    }

    sourceToClone.set(src, dst);

    if (Array.isArray(src.children)) {
      for (const child of src.children) {
        const clonedChild = cloneNodeRecursive(child, false);
        dst.add(clonedChild);
      }
    }

    return dst;
  }

  cloneNodeRecursive(sourceRoot, true);

  // Rebind SkinnedMesh skeletons to cloned bones if any soft-skinned submeshes exist
  for (const { src, dst } of skinnedMeshes) {
    if (!src.skeleton) continue;
    const clonedBones = src.skeleton.bones.map((bone) => sourceToClone.get(bone) || bone);
    const clonedInverses = src.skeleton.boneInverses.map((m) => m.clone());
    dst.bind(new THREE.Skeleton(clonedBones, clonedInverses), src.bindMatrix.clone());
  }

  return rootGroup;
}

function buildConstructCacheKey(url, options) {
  const variant = options.variant || options.archetype || 'default';
  return `${url}::${variant}`;
}

/**
 * Asynchronously loads (or parses), normalizes, and caches a `.glb` construct rig bundle.
 * Resolves to `null` cleanly in headless Node (unless `arrayBuffer` or `loader` is provided)
 * or when loading fails.
 *
 * @param {string} keyOrUrl Manifest key (e.g. `'player'`, `'drone'`, `'sentinel'`) or `.glb` URL
 * @param {object} [options]
 * @param {string} [options.archetype]
 * @param {string} [options.variant]
 * @param {GLTFLoader} [options.loader] Optional loader override for testing
 * @param {ArrayBuffer} [options.arrayBuffer] Optional pre-loaded GLB binary buffer
 * @param {boolean} [options.silent=false]
 * @returns {Promise<{
 *   key: string,
 *   url: string,
 *   scene: THREE.Object3D,
 *   animations: THREE.AnimationClip[],
 *   clips: Record<string, THREE.AnimationClip>,
 *   clone: () => THREE.Group
 * } | null>}
 */
export async function loadConstructAsset(keyOrUrl, options = {}) {
  const url = resolveConstructAssetUrl(keyOrUrl);
  const cacheKey = buildConstructCacheKey(url, options);

  if (_constructCache.has(cacheKey)) {
    return _constructCache.get(cacheKey);
  }
  if (_inflightConstructCache.has(cacheKey)) {
    return _inflightConstructCache.get(cacheKey);
  }

  const hasCustomInput = !!(options.arrayBuffer || options.loader);
  if (!hasCustomInput && !canLoadExternalConstructs()) {
    return null;
  }

  const promise = (async () => {
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

      const animations = Array.isArray(gltf.animations) ? gltf.animations : [];
      const root = gltf.scene;
      normalizeConstructHierarchy(root, { animations });
      root.traverse((child) => {
        if ((child.isMesh || child.isLine || child.isLineSegments) && child.geometry) {
          child.geometry.userData = child.geometry.userData || {};
          child.geometry.userData.sharedFromAssetCache = true;
        }
      });
      const clips = indexConstructClips(animations);

      const record = {
        key: keyOrUrl,
        url,
        scene: root,
        animations,
        clips,
        clone: () => {
          const cloned = cloneConstructHierarchy(root);
          normalizeConstructHierarchy(cloned, { animations });
          cloned.userData.clips = clips;
          cloned.userData.animations = animations;
          return cloned;
        }
      };

      _constructCache.set(cacheKey, record);
      // Also index under bare key/url if variant-less lookup is used by makeProgram()
      if (!options.variant && !options.archetype) {
        _constructCache.set(`${keyOrUrl}::default`, record);
      }
      return record;
    } catch (err) {
      if (!options.silent) {
        console.warn(`[ConstructLoader] Failed to load '${url}', using procedural fallback:`, err);
      }
      return null;
    } finally {
      _inflightConstructCache.delete(cacheKey);
    }
  })();

  _inflightConstructCache.set(cacheKey, promise);
  return promise;
}

/**
 * Returns a previously cached construct asset record synchronously, or `null` if not loaded yet.
 * @param {string} keyOrUrl
 * @param {object} [options]
 * @returns {ReturnType<typeof _constructCache.get> | null}
 */
export function getCachedConstructAsset(keyOrUrl, options = {}) {
  const url = resolveConstructAssetUrl(keyOrUrl);
  return (
    _constructCache.get(buildConstructCacheKey(url, options)) ||
    _constructCache.get(`${url}::default`) ||
    _constructCache.get(`${keyOrUrl}::default`) ||
    null
  );
}

/**
 * Preloads all construct bundles declared in `CONSTRUCT_ASSET_MANIFEST` in parallel.
 * @param {object} [options]
 * @returns {Promise<Record<string, ReturnType<typeof getCachedConstructAsset>>>}
 */
export async function loadAllConstructAssets(options = {}) {
  const uniqueKeys = ['player', 'drone', 'sentinel'];
  const entries = await Promise.all(
    uniqueKeys.map(async (key) => {
      const asset = await loadConstructAsset(key, options[key] || options);
      return [key, asset];
    })
  );
  return Object.fromEntries(entries);
}

/**
 * Clears cached construct assets and disposes template GPU geometries and materials.
 */
export function clearConstructAssetCache() {
  const disposedRecords = new Set();
  for (const record of _constructCache.values()) {
    if (!record || disposedRecords.has(record)) continue;
    disposedRecords.add(record);
    if (record.scene && typeof record.scene.traverse === 'function') {
      record.scene.traverse((child) => {
        if (child.isMesh || child.isLine || child.isLineSegments) {
          if (child.geometry && typeof child.geometry.dispose === 'function') {
            child.geometry.dispose();
          }
          if (child.material) {
            if (Array.isArray(child.material)) {
              for (const mat of child.material) {
                if (mat && typeof mat.dispose === 'function') mat.dispose();
              }
            } else if (typeof child.material.dispose === 'function') {
              child.material.dispose();
            }
          }
        }
      });
    }
  }
  _constructCache.clear();
  _inflightConstructCache.clear();
}
