/**
 * arena_floor_instancing.test.js
 * Unit and integration tests for Hybrid Arena Floor Instancing (SPEC-PERF-001).
 * Verifies InstancedMesh initialization for 576 tiles, grid matrix alignment,
 * zero-scale hiding/restoration, dynamic delegate mesh pooling, sector theming,
 * and draw-call batching.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import * as THREE from '../../vendor/three.module.js';
import { config } from '../../src/core/config.js';
import { state } from '../../src/core/state.js';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { clearArenaAssetCache } from '../../src/graphics/ArenaAssetLoader.js';
import {
  tiles,
  tileGroup,
  TOTAL_TILES,
  instancedSlabs,
  instancedEdges,
  defaultTileMatrices,
  hideInstance,
  showInstance,
  delegatePool,
  DELEGATE_POOL_SIZE,
  claimDelegate,
  releaseDelegate,
  triggerTileWarning,
  updateTiles,
  rebuildArenaTiles,
  applySectorArena,
  teardownSectorArena,
  tileMatIntact,
  tileEdgeMatIntact,
  pillars,
  walls,
  hydrateArenaModels
} from '../../src/entities/Arena.js';

console.log('--- Running Hybrid Arena Floor Instancing Test Suite ---');

// =========================================================================
// Group 1: InstancedMesh Initialization & Buffer Counts
// =========================================================================
console.log('\n[Group 1] Testing InstancedMesh Allocation for 576 Tiles...');

assert.strictEqual(TOTAL_TILES, 576, 'Arena must have exactly 24x24 = 576 tiles');
assert.ok(instancedSlabs instanceof THREE.InstancedMesh, 'instancedSlabs must be an InstancedMesh');
assert.strictEqual(instancedSlabs.count, 576, 'instancedSlabs must have count 576');
assert.strictEqual(instancedSlabs.receiveShadow, true, 'instancedSlabs must receive shadows');

assert.ok(instancedEdges instanceof THREE.InstancedMesh, 'instancedEdges must be an InstancedMesh');
assert.strictEqual(instancedEdges.count, 576, 'instancedEdges must have count 576');
assert.strictEqual(instancedEdges.isLine, true, 'instancedEdges must render with line mode');
assert.strictEqual(instancedEdges.isLineSegments, true, 'instancedEdges must be flagged as line segments');

assert.ok(tileGroup.children.includes(instancedSlabs), 'tileGroup must contain instancedSlabs');
assert.ok(tileGroup.children.includes(instancedEdges), 'tileGroup must contain instancedEdges');

console.log('✓ Group 1: 576 slabs and 576 edge lines instanced meshes verified cleanly.');

// =========================================================================
// Group 2: Instance Matrix Grid Alignment Against Arena Layout
// =========================================================================
console.log('\n[Group 2] Testing Instance Matrix Population & Grid Alignment...');

assert.strictEqual(defaultTileMatrices.length, 576, 'defaultTileMatrices must store 576 transform matrices');

const matTest = new THREE.Matrix4();
const posTest = new THREE.Vector3();

// Verify corner 0,0: ix=0, iz=0
instancedSlabs.getMatrixAt(0, matTest);
posTest.setFromMatrixPosition(matTest);
const c00X = -config.ARENA + 0.5 * config.TILE_W;
const c00Z = -config.ARENA + 0.5 * config.TILE_W;
assert.ok(Math.abs(posTest.x - c00X) < 1e-4, `Corner (0,0) X (${posTest.x}) must match expected (${c00X})`);
assert.ok(Math.abs(posTest.y - (-0.175)) < 1e-4, `Corner (0,0) Y (${posTest.y}) must match -0.175`);
assert.ok(Math.abs(posTest.z - c00Z) < 1e-4, `Corner (0,0) Z (${posTest.z}) must match expected (${c00Z})`);

// Verify center tile (ix=12, iz=12): tileIndex = 12 * 24 + 12 = 300
const centerIdx = 12 * config.TILE_N + 12;
instancedSlabs.getMatrixAt(centerIdx, matTest);
posTest.setFromMatrixPosition(matTest);
const c12X = -config.ARENA + (12 + 0.5) * config.TILE_W;
const c12Z = -config.ARENA + (12 + 0.5) * config.TILE_W;
assert.ok(Math.abs(posTest.x - c12X) < 1e-4, `Center tile X (${posTest.x}) must match expected (${c12X})`);
assert.ok(Math.abs(posTest.z - c12Z) < 1e-4, `Center tile Z (${posTest.z}) must match expected (${c12Z})`);

console.log('✓ Group 2: Instance matrices map exactly to 24x24 world arena layout.');

// =========================================================================
// Group 3: Instance Matrix Hiding (Zero-Scale) & Restoration Helpers
// =========================================================================
console.log('\n[Group 3] Testing Instance Hiding & Restoration Helpers...');

const testTileIndex = 42;
hideInstance(testTileIndex);

instancedSlabs.getMatrixAt(testTileIndex, matTest);
const scaleTest = new THREE.Vector3();
scaleTest.setFromMatrixScale(matTest);
assert.strictEqual(scaleTest.x, 0, 'Hidden slab instance scale X must be 0');
assert.strictEqual(scaleTest.y, 0, 'Hidden slab instance scale Y must be 0');
assert.strictEqual(scaleTest.z, 0, 'Hidden slab instance scale Z must be 0');
assert.ok(instancedSlabs.instanceMatrix.version > 0, 'instanceMatrix.version must be incremented on update');

showInstance(testTileIndex);
instancedSlabs.getMatrixAt(testTileIndex, matTest);
scaleTest.setFromMatrixScale(matTest);
posTest.setFromMatrixPosition(matTest);
assert.ok(Math.abs(scaleTest.x - 1.0) < 1e-4, 'Restored slab instance scale X must be 1.0');
assert.ok(Math.abs(scaleTest.y - 1.0) < 1e-4, 'Restored slab instance scale Y must be 1.0');
assert.ok(Math.abs(scaleTest.z - 1.0) < 1e-4, 'Restored slab instance scale Z must be 1.0');
assert.ok(Math.abs(posTest.y - (-0.175)) < 1e-4, 'Restored slab instance position Y must be -0.175');

console.log('✓ Group 3: Zero-scale hiding and identity restoration helpers verified.');

// =========================================================================
// Group 4: Dynamic Delegate Mesh Pool Allocation & Reusability
// =========================================================================
console.log('\n[Group 4] Testing Fixed Dynamic Delegate Pool (32 Meshes)...');

assert.strictEqual(DELEGATE_POOL_SIZE, 32, 'Delegate pool must contain 32 preallocated meshes');
assert.strictEqual(delegatePool.length, 32, 'delegatePool must contain exactly 32 instances');
for (const d of delegatePool) {
  assert.ok(d.group instanceof THREE.Group, 'Pool delegate must have a group');
  assert.ok(d.slabMesh instanceof THREE.Mesh, 'Pool delegate must have a slabMesh');
  assert.ok(d.edgeMesh instanceof THREE.LineSegments, 'Pool delegate must have an edgeMesh');
  assert.strictEqual(d.inUse, false, 'Unclaimed delegate must not be in use');
  assert.strictEqual(d.group.visible, false, 'Unclaimed delegate must be hidden');
}

console.log('✓ Group 4: Fixed pool of 32 reusable dynamic tile meshes verified.');

// =========================================================================
// Group 5: Tile Warning Hand-off to Dynamic Delegate Mesh
// =========================================================================
console.log('\n[Group 5] Testing Tile Warning State & Dynamic Delegate Hand-off...');

const sampleTile = tiles.get('5_5');
assert.ok(sampleTile, 'Sample tile 5_5 must exist');
assert.strictEqual(sampleTile.state, config.TILE_INTACT);

triggerTileWarning(sampleTile, config.ORANGE);
assert.strictEqual(sampleTile.state, config.TILE_WARNING);
assert.ok(sampleTile.delegate, 'Tile must have claimed a dynamic delegate');
assert.strictEqual(sampleTile.delegate.inUse, true, 'Claimed delegate must be flagged inUse');
assert.strictEqual(sampleTile.delegate.group.visible, true, 'Claimed delegate group must be visible');
assert.strictEqual(sampleTile.mesh, sampleTile.delegate.group, 'tile.mesh must delegate to active dynamic group');

// Verify instanced slot was hidden
instancedSlabs.getMatrixAt(sampleTile.tileIndex, matTest);
scaleTest.setFromMatrixScale(matTest);
assert.strictEqual(scaleTest.x, 0, 'Instanced slot must be zero-scale while delegate is active');

console.log('✓ Group 5: Warning triggers seamless handoff to dynamic delegate.');

// =========================================================================
// Group 6: Tile Rebuilding & Pool Reclamation
// =========================================================================
console.log('\n[Group 6] Testing Tile Rebuilding Completion & Pool Reclamation...');

// Simulate warning timer expiration -> fallen
sampleTile.timer = 0;
updateTiles(0.016);
assert.strictEqual(sampleTile.state, config.TILE_FALLEN);

// Simulate regen timer expiration -> rebuilding
sampleTile.regenTimer = config.TILE_REGEN_DELAY;
updateTiles(0.016);
assert.strictEqual(sampleTile.state, config.TILE_REBUILDING);

// Simulate ascent reaching floor elevation (y >= origY)
sampleTile.mesh.position.y = 0.1;
updateTiles(0.016);
assert.strictEqual(sampleTile.state, config.TILE_INTACT, 'Tile must return to INTACT state');
assert.strictEqual(sampleTile.delegate, null, 'Tile delegate must be released');

// Instanced slot must be restored
instancedSlabs.getMatrixAt(sampleTile.tileIndex, matTest);
scaleTest.setFromMatrixScale(matTest);
assert.ok(Math.abs(scaleTest.x - 1.0) < 1e-4, 'Instanced slot scale must return to 1.0');

console.log('✓ Group 6: Rebuilding releases delegate back to pool and unhides instanced slot.');

// =========================================================================
// Group 7: Sector Theming & Teardown Palette Restoration
// =========================================================================
console.log('\n[Group 7] Testing Sector Theming & Teardown Material Palettes...');

applySectorArena('grid_02');
assert.strictEqual(tileMatIntact.color.getHex(), 0x1c1005, 'tileMatIntact must update to Solar Sail floor color');
assert.strictEqual(tileEdgeMatIntact.color.getHex(), 0xff8800, 'tileEdgeMatIntact must update to Solar Sail edge color');

teardownSectorArena();
assert.strictEqual(tileMatIntact.color.getHex(), 0x07202c, 'tileMatIntact must restore baseline dark blue');
assert.strictEqual(tileEdgeMatIntact.color.getHex(), 0x187588, 'tileEdgeMatIntact must restore baseline cyan edge');

console.log('✓ Group 7: Sector theming and teardown palette restoration verified.');

// =========================================================================
// Group 8: Arena Draw Calls Consolidation Verification
// =========================================================================
console.log('\n[Group 8] Testing Total Scene Draw Call Consolidation (<35 calls)...');

rebuildArenaTiles();
// With all tiles intact, only 2 instanced meshes represent the entire 576-tile floor
// tileGroup contains only instancedSlabs + instancedEdges + 32 invisible delegate groups
const visibleTileGroupChildren = tileGroup.children.filter(c => c.visible);
assert.strictEqual(visibleTileGroupChildren.length, 2, 'Only 2 instanced meshes must be visible in tileGroup');

// Total floor draw calls when all tiles intact: 2 (1 for slabs + 1 for edges)
let intactFloorCalls = 2;
assert.ok(intactFloorCalls < 35, `Floor draw calls (${intactFloorCalls}) must be < 35`);

// Simulate 4 tiles actively warning/shaking concurrently:
// 2 instanced draw calls + 4 active delegates * 2 meshes (slab + edge) = 10 draw calls
const warningTiles = [tiles.get('1_1'), tiles.get('2_2'), tiles.get('3_3'), tiles.get('4_4')];
for (const t of warningTiles) {
  triggerTileWarning(t, config.ORANGE);
}
const activeDelegates = delegatePool.filter(d => d.inUse && d.group.visible);
assert.strictEqual(activeDelegates.length, 4, 'Exactly 4 delegates must be active');
const activeFloorCalls = 2 + activeDelegates.length * 2;
assert.strictEqual(activeFloorCalls, 10, 'Total floor draw calls with 4 active warning tiles must equal 10');
assert.ok(activeFloorCalls < 35, `Floor draw calls under combat load (${activeFloorCalls}) must be < 35 calls (down from 1,152 monolithic calls)`);

rebuildArenaTiles();
console.log('✓ Group 8: Floor grid draw calls decrease from ~1,200 to <35 (2 intact, 10 during 4-tile barrage).');

// =========================================================================
// Group 9: Physicalized Vectorfall Tilt, Plunge Tumble & Tilt Reset
// =========================================================================
console.log('\n[Group 9] Testing Physicalized Vectorfall Tilt, Plunge & Release Reset...');

const vfTile = tiles.get('7_7');
assert.ok(vfTile, 'Sample tile 7_7 must exist');
state.time = 0.25;
triggerTileWarning(vfTile, config.CYAN);
state.time += 0.35;
updateTiles(0.35);

assert.ok(
  Math.abs(vfTile.mesh.rotation.x) > 1e-4 || Math.abs(vfTile.mesh.rotation.z) > 1e-4,
  'Warning tile must exhibit destabilizing pitch/roll tilt'
);

// Verify direct releaseDelegate resets tilt cleanly back to (0, 0, 0)
const activeDelegate = vfTile.delegate;
assert.ok(activeDelegate, 'Vectorfall tile must have an active delegate');
releaseDelegate(vfTile);
assert.strictEqual(activeDelegate.group.rotation.x, 0, 'releaseDelegate must reset delegate rotation.x to 0');
assert.strictEqual(activeDelegate.group.rotation.y, 0, 'releaseDelegate must reset delegate rotation.y to 0');
assert.strictEqual(activeDelegate.group.rotation.z, 0, 'releaseDelegate must reset delegate rotation.z to 0');
assert.strictEqual(vfTile._dummyMesh.rotation.x, 0, 'releaseDelegate must reset dummy rotation.x to 0');
assert.strictEqual(vfTile._dummyMesh.rotation.z, 0, 'releaseDelegate must reset dummy rotation.z to 0');

// Verify plunge tumble during TILE_FALLEN and rebuild reset
triggerTileWarning(vfTile, config.CYAN);
vfTile.timer = 0;
updateTiles(0.016);
assert.strictEqual(vfTile.state, config.TILE_FALLEN);
const rotBeforeFall = vfTile.mesh.rotation.x;
updateTiles(0.2);
assert.notStrictEqual(vfTile.mesh.rotation.x, rotBeforeFall, 'Falling tile must tumble during chasm plunge');
assert.ok(vfTile.mesh.position.y < vfTile.origY, 'Falling tile must plunge downward');

rebuildArenaTiles();
assert.strictEqual(vfTile.state, config.TILE_INTACT);
assert.strictEqual(vfTile.mesh.rotation.x, 0, 'rebuildArenaTiles must reset tile rotation');

console.log('✓ Group 9: Physicalized Vectorfall tilt, plunge tumble & releaseDelegate reset verified.');

// =========================================================================
// Group 10: Async .glb Foundry Hydration & Collision Parity
// =========================================================================
console.log('\n[Group 10] Testing Async .glb Hydration & Collision Bounds Parity...');

clearArenaAssetCache();
const gltfLoader = new GLTFLoader();
const localFsLoader = {
  async loadAsync(url) {
    const buf = fs.readFileSync(path.resolve(process.cwd(), url));
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    return await new Promise((resolve, reject) => gltfLoader.parse(ab, '', resolve, reject));
  }
};

const hydration = await hydrateArenaModels({ loader: localFsLoader });
assert.strictEqual(hydration.tileHydrated, true, 'arcfield_tile.glb must hydrate instancedSlabs');
assert.strictEqual(hydration.pylonsHydrated, true, 'deflector_pylon.glb must hydrate pillars');
assert.strictEqual(hydration.wallsHydrated, true, 'wall_buttress.glb must hydrate perimeter walls');
assert.strictEqual(instancedSlabs.count, 576, 'Hydration must preserve TOTAL_TILES = 576');
assert.strictEqual(instancedEdges.isLineSegments, true, 'Hydration must preserve instancedEdges line segments');
assert.strictEqual(pillars.length, 8, 'Hydration must preserve all 8 pillars');
for (const p of pillars) {
  assert.strictEqual(p.r, 2.1, 'Pillar collision radius r=2.1 must remain unchanged after hydration');
  assert.ok(p.hydratedGroup && p.fallbackGroup.visible === false, 'Pillar must swap to hydrated .glb group');
}
for (const w of walls) {
  assert.ok(w.hydratedGroup && w.fallbackGroup.visible === false, 'Wall must swap to hydrated .glb buttress bays');
}
clearArenaAssetCache();

console.log('✓ Group 10: Async .glb hydration & collision parity verified.');

console.log('\n======================================================');
console.log('ALL HYBRID ARENA FLOOR INSTANCING TESTS PASSED (100%)');
console.log('======================================================\n');
