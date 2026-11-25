/**
 * arena_backdrop.test.js
 * Unit and integration tests for ArenaBackdrop.js, scene.js backdrop wiring,
 * quality preset / particle chasm mist gating, and .glb stadium hydration.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import * as THREE from '../../vendor/three.module.js';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { ArenaBackdrop, CHASM_FLOOR_Y } from '../../src/graphics/ArenaBackdrop.js';
import { scene, arenaBackdrop } from '../../src/graphics/scene.js';
import { settingsManager } from '../../src/core/settings.js';
import { clearArenaAssetCache } from '../../src/graphics/ArenaAssetLoader.js';

console.log('--- Running Arena Backdrop & Chasm Mist Test Suite ---');

// =========================================================================
// Group 1: Headless Scene Initialization & Procedural Silhouette Fallback
// =========================================================================
console.log('\n[Group 1] Testing Headless Initialization & Null Void Chasm Floor...');

assert.ok(arenaBackdrop instanceof ArenaBackdrop, 'scene.js must instantiate arenaBackdrop');
assert.ok(scene.children.includes(arenaBackdrop.group), 'scene must attach arenaBackdrop.group');
assert.ok(arenaBackdrop.chasmFloorMesh instanceof THREE.Mesh, 'Null Void chasm floor mesh must exist');
assert.ok(CHASM_FLOOR_Y <= -18, 'Chasm floor constant must sit at or below y = -18');
assert.ok(arenaBackdrop.chasmFloorMesh.position.y <= -18, 'Chasm floor mesh must sit at y <= -18');
assert.strictEqual(arenaBackdrop.mistPlanes.length, 2, 'Two chasm mist planes must be created');

const procInstanced = arenaBackdrop.stadiumGroup.children.filter(c => c.isInstancedMesh);
assert.strictEqual(procInstanced.length, 4, 'Procedural stadium fallback must batch into 4 InstancedMeshes');
for (const inst of procInstanced) {
  assert.strictEqual(inst.count, 16, 'Each procedural stadium ring InstancedMesh must have 16 instances');
}

console.log('✓ Group 1: Headless backdrop initialization & procedural fallback verified.');

// =========================================================================
// Group 2: Quality Preset & Particle Chasm Mist Gating
// =========================================================================
console.log('\n[Group 2] Testing Quality Preset & Particle Mist Gating...');

settingsManager.applyPreset('ultra');
assert.strictEqual(arenaBackdrop.mistGroup.visible, true, 'Ultra preset must show chasm mist');
assert.strictEqual(arenaBackdrop.mistOpacityScale, 1.0, 'Ultra preset must use full mist opacity');
assert.strictEqual(arenaBackdrop.mistPlanes.every(p => p.visible), true, 'Ultra preset must enable all mist layers');

settingsManager.applyPreset('medium');
assert.strictEqual(arenaBackdrop.mistGroup.visible, true, 'Medium preset must show chasm mist');
assert.strictEqual(arenaBackdrop.mistOpacityScale, 0.6, 'Medium preset must scale mist opacity to 0.6');

settingsManager.applyPreset('low');
assert.strictEqual(arenaBackdrop.mistGroup.visible, true, 'Low preset must show reduced chasm mist');
assert.strictEqual(arenaBackdrop.mistPlanes[0].visible, true);
assert.strictEqual(arenaBackdrop.mistPlanes[1].visible, false, 'Low preset must keep only 1 mist plane active');

settingsManager.applyPreset('competitive');
assert.strictEqual(arenaBackdrop.mistGroup.visible, false, 'Competitive preset must hide chasm mist');
assert.strictEqual(arenaBackdrop.mistPlanes.every(p => !p.visible), true, 'Competitive preset must hide all mist planes');

settingsManager.applyPreset('high');
assert.strictEqual(arenaBackdrop.mistGroup.visible, true, 'High preset must restore chasm mist');

settingsManager.set('particles', false);
assert.strictEqual(arenaBackdrop.mistGroup.visible, false, 'particles: false must hide chasm mist');

// Restore clean default high preset
settingsManager.applyPreset('high');
assert.strictEqual(arenaBackdrop.mistGroup.visible, true);

console.log('✓ Group 2: Competitive preset and particles: false mist gating verified.');

// =========================================================================
// Group 3: Stadium .glb Hydration & Mist Scrolling Update
// =========================================================================
console.log('\n[Group 3] Testing Stadium .glb Hydration & Mist Scrolling...');

clearArenaAssetCache();
const gltfLoader = new GLTFLoader();
const localFsLoader = {
  async loadAsync(url) {
    const buf = fs.readFileSync(path.resolve(process.cwd(), url));
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    return await new Promise((resolve, reject) => gltfLoader.parse(ab, '', resolve, reject));
  }
};

const isolatedBackdrop = new ArenaBackdrop();
const hydrated = await isolatedBackdrop.hydrate({ loader: localFsLoader });
assert.strictEqual(hydrated, true, 'Stadium .glb hydration must succeed');
assert.strictEqual(isolatedBackdrop.isHydrated, true);

const hydratedInstanced = isolatedBackdrop.stadiumGroup.children.filter(c => c.isInstancedMesh);
assert.ok(hydratedInstanced.length >= 4, 'Hydrated stadium must contain instanced meshes for segment & pylon Foundry slots');
for (const inst of hydratedInstanced) {
  assert.strictEqual(inst.count, 16, 'Hydrated stadium InstancedMesh must instance 16 elements');
}

// Verify mist UV scrolling when texture map is attached
const mockTex = new THREE.Texture();
isolatedBackdrop.mistPlanes[0].material.map = mockTex;
const prevOffX = mockTex.offset.x;
isolatedBackdrop.update(0.5);
assert.notStrictEqual(mockTex.offset.x, prevOffX, 'update(dt) must scroll mist texture offset');

isolatedBackdrop.dispose();
assert.strictEqual(isolatedBackdrop.isDisposed, true);
clearArenaAssetCache();

console.log('✓ Group 3: Stadium .glb hydration, mist scrolling & disposal verified.');

console.log('\n=============================================================');
console.log('ALL ARENA BACKDROP & CHASM MIST TESTS PASSED (100%)');
console.log('=============================================================');
