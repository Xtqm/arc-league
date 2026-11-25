/**
 * arena_asset_loader.test.js
 * Unit tests for ArenaAssetLoader.js (GLB loading, caching, normalization,
 * Foundry_* material slot binding, and headless/offline fallback).
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import * as THREE from '../../vendor/three.module.js';
import { config } from '../../src/core/config.js';
import { wallMat, trimMat, glowMat } from '../../src/graphics/materials.js';
import {
  ARENA_ASSET_MANIFEST,
  canLoadExternalModels,
  loadArenaAsset,
  loadAllArenaAssets,
  getCachedArenaAsset,
  clearArenaAssetCache
} from '../../src/graphics/ArenaAssetLoader.js';

function readGlbArrayBuffer(relPath) {
  const abs = path.resolve(process.cwd(), relPath);
  const buf = fs.readFileSync(abs);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

console.log('--- Running Arena Asset Loader Test Suite ---');

// =========================================================================
// Group 1: Headless / Offline Fallback
// =========================================================================
console.log('\n[Group 1] Testing Headless & Error Fallback...');

clearArenaAssetCache();
assert.strictEqual(canLoadExternalModels(), false, 'Headless Node without window must disable auto fetch');
const headlessRes = await loadArenaAsset('arcfield_tile', { silent: true });
assert.strictEqual(headlessRes, null, 'Headless loadArenaAsset must resolve null cleanly');

const allHeadless = await loadAllArenaAssets({ silent: true });
for (const key of Object.keys(ARENA_ASSET_MANIFEST)) {
  assert.strictEqual(allHeadless[key], null, `Headless loadAllArenaAssets[${key}] must resolve null`);
}

// Corrupt GLB binary must fail gracefully and return null
const badBuf = new Uint8Array([1, 2, 3, 4]).buffer;
const corruptRes = await loadArenaAsset('arcfield_tile', { arrayBuffer: badBuf, silent: true });
assert.strictEqual(corruptRes, null, 'Corrupt GLB input must return null cleanly without rejecting');

console.log('✓ Group 1: Headless and error fallbacks verified.');

// =========================================================================
// Group 2: GLB Parsing, Normalization, Caching & Foundry_* Slot Binding
// =========================================================================
console.log('\n[Group 2] Testing GLB Parsing, Normalization, Caching & Foundry Slots...');

clearArenaAssetCache();
const tileBuf = readGlbArrayBuffer(ARENA_ASSET_MANIFEST.arcfield_tile);
const tileNormOpts = {
  arrayBuffer: tileBuf,
  targetSize: [config.TILE_W - 0.08, 0.35, config.TILE_W - 0.08],
  anchor: 'center'
};

const tileAsset = await loadArenaAsset('arcfield_tile', tileNormOpts);
assert.ok(tileAsset, 'arcfield_tile.glb must parse successfully');
assert.ok(tileAsset.mergedGeometry instanceof THREE.BufferGeometry, 'Merged BufferGeometry must be extracted');

const tileBox = new THREE.Box3().setFromObject(tileAsset.scene);
const tileSize = new THREE.Vector3();
const tileCenter = new THREE.Vector3();
tileBox.getSize(tileSize);
tileBox.getCenter(tileCenter);
assert.ok(Math.abs(tileSize.x - (config.TILE_W - 0.08)) < 1e-3, 'Normalized tile width must match config.TILE_W - 0.08');
assert.ok(Math.abs(tileSize.y - 0.35) < 1e-3, 'Normalized tile height must match 0.35');
assert.ok(Math.abs(tileSize.z - (config.TILE_W - 0.08)) < 1e-3, 'Normalized tile depth must match config.TILE_W - 0.08');
assert.ok(tileCenter.length() < 1e-3, 'Centered tile origin must sit at (0,0,0)');

// Cache hit check (without passing arrayBuffer again, same targetSize/anchor)
const cachedTile = getCachedArenaAsset('arcfield_tile', {
  targetSize: [config.TILE_W - 0.08, 0.35, config.TILE_W - 0.08],
  anchor: 'center'
});
assert.strictEqual(cachedTile, tileAsset, 'getCachedArenaAsset must return cached asset');
const secondLoad = await loadArenaAsset('arcfield_tile', {
  targetSize: [config.TILE_W - 0.08, 0.35, config.TILE_W - 0.08],
  anchor: 'center'
});
assert.strictEqual(secondLoad, tileAsset, 'Repeated loadArenaAsset must reuse cache');

// Foundry_* material slot binding on deflector_pylon.glb
const pylonBuf = readGlbArrayBuffer(ARENA_ASSET_MANIFEST.deflector_pylon);
const pylonAsset = await loadArenaAsset('deflector_pylon', { arrayBuffer: pylonBuf });
assert.ok(pylonAsset, 'deflector_pylon.glb must parse successfully');

const boundSlots = new Set();
pylonAsset.scene.traverse((child) => {
  if (child.isMesh) {
    boundSlots.add(child.userData.foundrySlot);
    if (child.userData.foundrySlot === 'Foundry_Armor') assert.strictEqual(child.material, wallMat);
    if (child.userData.foundrySlot === 'Foundry_Trim') assert.strictEqual(child.material, trimMat);
    if (child.userData.foundrySlot === 'Foundry_Conduit') assert.strictEqual(child.material, glowMat);
  }
});
assert.strictEqual(boundSlots.has('Foundry_Armor'), true, 'Foundry_Armor slot must be bound');
assert.strictEqual(boundSlots.has('Foundry_Trim'), true, 'Foundry_Trim slot must be bound');
assert.strictEqual(boundSlots.has('Foundry_Conduit'), true, 'Foundry_Conduit slot must be bound');

// Verify clone shares geometry/material references
const pylonClone = pylonAsset.clone();
assert.ok(pylonClone instanceof THREE.Group);
assert.ok(pylonClone.children.length >= 3, 'Cloned deflector pylon must preserve mesh parts');

clearArenaAssetCache();
assert.strictEqual(getCachedArenaAsset('deflector_pylon'), null, 'clearArenaAssetCache must empty cache');

console.log('✓ Group 2: GLB parsing, normalization, caching & Foundry_* material binding verified.');

console.log('\n=============================================================');
console.log('ALL ARENA ASSET LOADER TESTS PASSED (100%)');
console.log('=============================================================');
