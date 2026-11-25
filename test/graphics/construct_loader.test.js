/**
 * construct_loader.test.js
 * Unit tests for ConstructLoader.js (GLB construct loading, caching, Mixamo/Blender node
 * normalization, semantic part tagging, socket discovery, clip indexing, and clone isolation).
 */

import assert from 'assert';
import * as THREE from '../../vendor/three.module.js';
import {
  CONSTRUCT_ASSET_MANIFEST,
  CANONICAL_JOINT_NAMES,
  REQUIRED_CONSTRUCT_CLIPS,
  canLoadExternalConstructs,
  normalizeJointName,
  normalizeConstructHierarchy,
  loadConstructAsset,
  loadAllConstructAssets,
  getCachedConstructAsset,
  clearConstructAssetCache
} from '../../src/graphics/ConstructLoader.js';

/**
 * Builds a minimal valid glTF 2.0 binary (.glb) buffer containing a single triangle mesh
 * so we exercise real `GLTFLoader.parse()` in Node without external file fixtures.
 */
function buildMinimalGlbBuffer() {
  const positions = new Float32Array([
    0, 0, 0,
    0.2, 0, 0,
    0, 0.2, 0
  ]);
  const indices = new Uint16Array([0, 1, 2, 0]); // padded to 4-byte boundary (8 bytes)
  const binByteLength = positions.byteLength + indices.byteLength; // 36 + 8 = 44 bytes

  const gltfJson = {
    asset: { version: '2.0', generator: 'arc-league-test' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [
      { name: 'pelvis', translation: [0, 1.05, 0], children: [1] },
      { name: 'torso', translation: [0, 0.45, 0], children: [2, 3, 4] },
      { name: 'suit_chest', mesh: 0 },
      { name: 'visor_brow', mesh: 0 },
      { name: 'core_gyro', mesh: 0 }
    ],
    meshes: [
      {
        primitives: [{
          attributes: { POSITION: 0 },
          indices: 1
        }]
      }
    ],
    buffers: [{ byteLength: binByteLength }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.byteLength, target: 34962 },
      { buffer: 0, byteOffset: positions.byteLength, byteLength: 6, target: 34963 }
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: 'VEC3',
        min: [0, 0, 0],
        max: [0.2, 0.2, 0]
      },
      {
        bufferView: 1,
        componentType: 5123,
        count: 3,
        type: 'SCALAR'
      }
    ]
  };

  const jsonBytes = new TextEncoder().encode(JSON.stringify(gltfJson));
  const jsonPad = (4 - (jsonBytes.byteLength % 4)) % 4;
  const jsonChunkLen = jsonBytes.byteLength + jsonPad;
  const totalLen = 12 + 8 + jsonChunkLen + 8 + binByteLength;

  const buffer = new ArrayBuffer(totalLen);
  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer);

  // Header: 'glTF', version 2, total length
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, totalLen, true);

  // JSON chunk
  let offset = 12;
  view.setUint32(offset, jsonChunkLen, true);
  view.setUint32(offset + 4, 0x4e4f534a, true);
  u8.set(jsonBytes, offset + 8);
  for (let i = 0; i < jsonPad; i++) {
    u8[offset + 8 + jsonBytes.byteLength + i] = 0x20;
  }

  // BIN chunk
  offset += 8 + jsonChunkLen;
  view.setUint32(offset, binByteLength, true);
  view.setUint32(offset + 4, 0x004e4942, true);
  u8.set(new Uint8Array(positions.buffer), offset + 8);
  u8.set(new Uint8Array(indices.buffer), offset + 8 + positions.byteLength);

  return buffer;
}

function buildMockGltfHierarchy() {
  const root = new THREE.Group();
  root.name = 'ConstructRoot';

  const suitMat = new THREE.MeshStandardMaterial({ color: 0x1e2631, flatShading: false });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x00f3ff, emissive: 0x00f3ff });

  const hips = new THREE.Bone();
  hips.name = 'mixamorig:Hips';
  hips.position.set(0, 1.05, 0);
  root.add(hips);

  const spine = new THREE.Bone();
  spine.name = 'mixamorig:Spine';
  spine.position.set(0, 0.21, 0);
  hips.add(spine);

  const chest = new THREE.Bone();
  chest.name = 'mixamorig:Spine2';
  chest.position.set(0, 0.26, 0);
  spine.add(chest);

  const head = new THREE.Bone();
  head.name = 'mixamorig:Head';
  head.position.set(0, 0.45, 0);
  chest.add(head);

  const lArm = new THREE.Bone();
  lArm.name = 'mixamorig:LeftArm';
  lArm.position.set(-0.4, 0.13, 0);
  chest.add(lArm);

  const rArm = new THREE.Bone();
  rArm.name = 'mixamorig:RightArm';
  rArm.position.set(0.4, 0.13, 0);
  chest.add(rArm);

  const rForeArm = new THREE.Bone();
  rForeArm.name = 'mixamorig:RightForeArm';
  rForeArm.position.set(0, -0.32, 0);
  rArm.add(rForeArm);

  const rHand = new THREE.Bone();
  rHand.name = 'mixamorig:RightHand';
  rHand.position.set(0, -0.30, 0);
  rForeArm.add(rHand);

  const palmSocket = new THREE.Object3D();
  palmSocket.name = 'palm_socket_r';
  palmSocket.position.set(0, -0.05, 0.19);
  rHand.add(palmSocket);

  const dorsalSocket = new THREE.Object3D();
  dorsalSocket.name = 'dorsal_socket';
  dorsalSocket.position.set(0, 0.12, -0.18);
  chest.add(dorsalSocket);

  const chestShard = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), suitMat);
  chestShard.name = 'suit_chest_l';
  chest.add(chestShard);

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 1), trimMat);
  core.name = 'core_gyro';
  chest.add(core);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.06), trimMat);
  visor.name = 'visor_brow';
  head.add(visor);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.02, 8, 24), trimMat);
  halo.name = 'halo_crown';
  head.add(halo);

  const animations = REQUIRED_CONSTRUCT_CLIPS.map((clipName) => {
    const qTrack = new THREE.QuaternionKeyframeTrack(
      'mixamorig:Hips.quaternion',
      [0, 0.5],
      [0, 0, 0, 1, 0, 0.1, 0, 0.995]
    );
    return new THREE.AnimationClip(clipName, 0.5, [qTrack]);
  });

  return { scene: root, animations };
}

console.log('--- Running Construct Loader Test Suite ---');

// =========================================================================
// Group 1: Headless & Error Fallback
// =========================================================================
console.log('\n[Group 1] Testing Headless & Error Fallback...');

clearConstructAssetCache();
assert.strictEqual(canLoadExternalConstructs(), false, 'Headless Node without window must disable auto fetch');
assert.strictEqual(await loadConstructAsset('player', { silent: true }), null, 'Headless loadConstructAsset must resolve null');

const allHeadless = await loadAllConstructAssets({ silent: true });
for (const key of ['player', 'drone', 'sentinel']) {
  assert.strictEqual(allHeadless[key], null, `Headless loadAllConstructAssets[${key}] must resolve null`);
}

const corruptBuf = new Uint8Array([1, 2, 3, 4]).buffer;
assert.strictEqual(
  await loadConstructAsset('player', { arrayBuffer: corruptBuf, silent: true }),
  null,
  'Corrupt GLB input must return null cleanly'
);

console.log('✓ Group 1: Headless and error fallbacks verified.');

// =========================================================================
// Group 2: Joint Name & Hierarchy Normalization
// =========================================================================
console.log('\n[Group 2] Testing Joint Name & Semantic Tag Normalization...');

assert.strictEqual(normalizeJointName('mixamorig:Hips'), 'pelvis');
assert.strictEqual(normalizeJointName('mixamorig:Spine'), 'abdomen');
assert.strictEqual(normalizeJointName('mixamorig:Spine2'), 'torso');
assert.strictEqual(normalizeJointName('mixamorig:LeftArm'), 'leftShoulder');
assert.strictEqual(normalizeJointName('mixamorig:RightForeArm'), 'rightElbow');
assert.strictEqual(normalizeJointName('mixamorig:LeftUpLeg'), 'leftHip');
assert.strictEqual(normalizeJointName('mixamorig:RightLeg'), 'rightKnee');
assert.strictEqual(normalizeJointName('Armature_left_hand'), 'leftHand');

const mockGltf = buildMockGltfHierarchy();
const mockLoader = {
  async loadAsync() {
    return mockGltf;
  }
};

const loadedMock = await loadConstructAsset('player', { loader: mockLoader });
assert.ok(loadedMock, 'Mock GLTF loader must return normalized construct record');
assert.strictEqual(loadedMock.url, CONSTRUCT_ASSET_MANIFEST.player);
assert.strictEqual(Object.keys(loadedMock.clips).length, REQUIRED_CONSTRUCT_CLIPS.length);

const cloneA = loadedMock.clone();
const cloneB = loadedMock.clone();
assert.ok(cloneA instanceof THREE.Group);
assert.strictEqual(cloneA.userData.part, 'chassis_root');

// Verify all 15 canonical joints exist (including synthesized neck/hips/knees/elbows)
for (const jointName of CANONICAL_JOINT_NAMES) {
  assert.ok(cloneA.userData.joints[jointName], `Joint ${jointName} must be present`);
  assert.notStrictEqual(
    cloneA.userData.joints[jointName],
    loadedMock.scene.userData.joints[jointName],
    `Cloned joint ${jointName} must not share template node reference`
  );
  assert.notStrictEqual(
    cloneA.userData.joints[jointName],
    cloneB.userData.joints[jointName],
    `Cloned joint ${jointName} must be isolated across instances`
  );
}

// Verify semantic parts & sockets
assert.ok(cloneA.userData.coreMesh, 'coreMesh must be normalized');
assert.strictEqual(cloneA.userData.coreMesh.userData.part, 'chassis_trim');
assert.ok(cloneA.userData.headHalo, 'headHalo must be normalized');
assert.strictEqual(cloneA.userData.headHalo.userData.part, 'chassis_halo');
assert.ok(cloneA.userData.dorsalWingPivot, 'dorsalWingPivot must be mapped from dorsal_socket');
assert.ok(cloneA.userData.palmSocket, 'palmSocket must be mapped from palm_socket_r');
assert.strictEqual(cloneA.userData.floatingShards.length, 1, 'suit_chest_l shard must register for micro-hover');

let suitTagCount = 0;
let visorTagCount = 0;
let haloTagCount = 0;
let trimTagCount = 0;
cloneA.traverse((c) => {
  if (c.userData?.part === 'chassis_suit') suitTagCount++;
  if (c.userData?.part === 'chassis_visor') visorTagCount++;
  if (c.userData?.part === 'chassis_halo') haloTagCount++;
  if (c.userData?.part === 'chassis_trim') trimTagCount++;
});
assert.strictEqual(suitTagCount, 1);
assert.strictEqual(visorTagCount, 1);
assert.strictEqual(haloTagCount, 1);
assert.strictEqual(trimTagCount, 1);

// Verify shared geometry + isolated materials between cloneA and cloneB
const shardA = cloneA.userData.floatingShards[0];
const shardB = cloneB.userData.floatingShards[0];
assert.strictEqual(shardA.geometry, shardB.geometry, 'Clones must share cached GPU BufferGeometry');
assert.notStrictEqual(shardA.material, shardB.material, 'Clones must have isolated material instances');
assert.strictEqual(shardA.material.flatShading, true, 'Construct suit shards must enforce flatShading');

console.log('✓ Group 2: Joint normalization, semantic part tags, sockets & clone isolation verified.');

// =========================================================================
// Group 3: Real Binary GLB Parsing & Caching
// =========================================================================
console.log('\n[Group 3] Testing Binary GLB Parsing & Caching...');

clearConstructAssetCache();
assert.strictEqual(getCachedConstructAsset('drone'), null, 'Cache must be empty after clear');

const glbBuffer = buildMinimalGlbBuffer();
const parsedRecord = await loadConstructAsset('drone', { arrayBuffer: glbBuffer });
assert.ok(parsedRecord, 'Minimal binary GLB must parse cleanly via GLTFLoader');
assert.strictEqual(getCachedConstructAsset('drone'), parsedRecord, 'getCachedConstructAsset must return cached record');
assert.strictEqual(await loadConstructAsset('drone'), parsedRecord, 'Repeated loadConstructAsset must reuse cache');

const glbClone = parsedRecord.clone();
assert.ok(glbClone.userData.coreMesh, 'Parsed binary GLB must detect core_gyro as coreMesh');
assert.ok(glbClone.userData.joints.torso, 'Parsed binary GLB must map torso joint');
assert.ok(glbClone.userData.joints.rightHand, 'Parsed binary GLB must synthesize missing canonical joints');

clearConstructAssetCache();
assert.strictEqual(getCachedConstructAsset('drone'), null, 'clearConstructAssetCache must empty cache');

console.log('✓ Group 3: Binary GLB parsing and cache lifecycle verified.');

console.log('\n=============================================================');
console.log('ALL CONSTRUCT LOADER TESTS PASSED (100%)');
console.log('=============================================================');
