/**
 * cosmetic_material_engine.test.js
 * Comprehensive unit and integration test suite for Dynamic Three.js Cosmetic Shader & Material Engine
 * and Turntable Preview Renderer (SPEC-ARMORY-001 Phase 2).
 */

import assert from 'assert';
import * as THREE from '../../vendor/three.module.js';
import { makeDisc, makeProgram } from '../../src/graphics/materials.js';
import {
  CosmeticMaterialEngine,
  cosmeticMaterialEngine,
  disposeHierarchy,
  CHASSIS_PBR_PRESETS
} from '../../src/armory/CosmeticMaterialEngine.js';
import { ArmoryPreviewScene } from '../../src/armory/ArmoryPreviewScene.js';
import { ArmoryManager, ArmoryEvents } from '../../src/armory/ArmoryManager.js';
import { ARMORY_CATALOG, ARMORY_CATEGORIES } from '../../src/armory/ArmoryCatalog.js';

console.log('--- Running Cosmetic Material Engine & Preview Scene Test Suite (SPEC-ARMORY-001 Phase 2) ---');

// Mock in-memory storage for test isolation
class MockStorage {
  constructor(initial = {}) {
    this.data = new Map(Object.entries(initial));
  }
  get(key, fallback = null) {
    return this.data.has(key) ? this.data.get(key) : fallback;
  }
  set(key, val) {
    this.data.set(key, val);
  }
  load() {}
  get isInitialized() { return true; }
}

// Mock economy manager
class MockEconomy {
  canAfford() { return true; }
  spendBits() { return true; }
}

// =========================================================================
// Test Group 1: Sub-Mesh Semantic Tagging & Dedicated Material Isolation
// =========================================================================
console.log('\n[Group 1] Testing Sub-Mesh Semantic Tagging & Dedicated Material Isolation...');

// 1.1 makeDisc tagging
const disc = makeDisc(0x00f3ff);
assert.strictEqual(disc.userData.part, 'disc_root');
assert.strictEqual(disc.userData.outerMesh.userData.part, 'disc_outer');
assert.strictEqual(disc.userData.faceMesh.userData.part, 'disc_face');
assert.strictEqual(disc.userData.hubMesh.userData.part, 'disc_hub');
assert.strictEqual(disc.userData.pointLight.userData.part, 'disc_light');

// 1.2 makeProgram tagging
const prog1 = makeProgram(0x00f3ff);
assert.strictEqual(prog1.userData.part, 'chassis_root');
assert.ok(prog1.userData.suitMaterial instanceof THREE.MeshStandardMaterial);
assert.ok(prog1.userData.litMaterial instanceof THREE.MeshStandardMaterial);
assert.ok(prog1.userData.litMaterial.emissiveIntensity >= 1.5);
assert.strictEqual(prog1.userData.backDisc.userData.part, 'chassis_back_disc');
assert.strictEqual(prog1.userData.halo.userData.part, 'chassis_halo');

// Check child parts
let foundSuit = 0, foundTrim = 0, foundVisor = 0;
prog1.traverse((child) => {
  if (child.userData.part === 'chassis_suit') foundSuit++;
  if (child.userData.part === 'chassis_trim') foundTrim++;
  if (child.userData.part === 'chassis_visor') foundVisor++;
});
assert.ok(foundSuit >= 4, 'Program rig must contain suit meshes');
assert.ok(foundTrim >= 4, 'Program rig must contain neon trim strips');
assert.strictEqual(foundVisor, 1, 'Program rig must contain visor');

// 1.3 Material instance isolation across multiple rigs
const prog2 = makeProgram(0xffaa00);
assert.notStrictEqual(prog1.userData.suitMaterial, prog2.userData.suitMaterial, 'Each rig must have dedicated suitMaterial');
assert.notStrictEqual(prog1.userData.litMaterial, prog2.userData.litMaterial, 'Each rig must have dedicated litMaterial');

console.log('✓ Group 1: Sub-mesh semantic tagging and material isolation verified.');

// =========================================================================
// Test Group 2: Engine Boot Hydration & Loadout Event Subscription
// =========================================================================
console.log('\n[Group 2] Testing Engine Boot Hydration & Loadout Event Subscription...');

const storage = new MockStorage({
  'loadout.activeDisc': 'disc_neon_amber',
  'loadout.activeChassis': 'chassis_infiltrator'
});
const mockArmory = new ArmoryManager({
  catalog: ARMORY_CATALOG,
  economy: new MockEconomy(),
  storage
});

const testRig = makeProgram(0x00f3ff);
const testDisc = makeDisc(0x00f3ff);

const engine = new CosmeticMaterialEngine({
  armory: mockArmory,
  playerObj: testRig,
  playerDiscMesh: testDisc
});

engine.init();
assert.strictEqual(engine.isInitialized, true);
assert.strictEqual(engine.activeDiscSkinId, 'disc_neon_amber');
assert.strictEqual(engine.activeChassisSkinId, 'chassis_infiltrator');

// Verify initial loadout hydration affected meshes
// disc_neon_amber primaryHex is #ffaa00
const outerColorHex = '#' + testDisc.userData.outerMesh.material.color.getHexString();
assert.strictEqual(outerColorHex, '#ffaa00', 'Disc outer mesh must match activeDisc loadout color');

// chassis_infiltrator roughness is 0.85
assert.strictEqual(testRig.userData.suitMaterial.roughness, 0.85, 'Chassis suit roughness must match activeChassis loadout');

// 2.2 Event Dispatching on LOADOUT_CHANGED
mockArmory.emit(ArmoryEvents.LOADOUT_CHANGED, {
  category: ARMORY_CATEGORIES.DISC_SKINS,
  itemId: 'disc_retro_green'
});
assert.strictEqual(engine.activeDiscSkinId, 'disc_retro_green');
const updatedDiscHex = '#' + testDisc.userData.outerMesh.material.color.getHexString();
assert.strictEqual(updatedDiscHex, '#00ff66', 'Disc outer mesh must update on LOADOUT_CHANGED event');

console.log('✓ Group 2: Engine boot hydration and loadout event subscription verified.');

// =========================================================================
// Test Group 3: Dynamic Identity Disc Cosmetic Application & Wireframe Overlay
// =========================================================================
console.log('\n[Group 3] Testing Identity Disc Cosmetic Application & Wireframe Overlay...');

// 3.1 Standard skin application
const sampleDisc = makeDisc(0x00f3ff);
engine.applyDiscSkin(sampleDisc, 'disc_plasma_violet');
assert.strictEqual('#' + sampleDisc.userData.outerMesh.material.color.getHexString(), '#bd00ff');
assert.strictEqual('#' + sampleDisc.userData.pointLight.color.getHexString(), '#bd00ff');
assert.strictEqual(sampleDisc.userData.wireframeOverlay, undefined);

// 3.2 Retro wireframe skin application (disc_corrupted_void)
engine.applyDiscSkin(sampleDisc, 'disc_corrupted_void');
assert.strictEqual('#' + sampleDisc.userData.outerMesh.material.color.getHexString(), '#ff0033');
const wfOverlay = sampleDisc.userData.wireframeOverlay;
assert.ok(wfOverlay, 'Wireframe overlay must be attached when wireframeToggle is true');
assert.strictEqual(wfOverlay.userData.isWireframeOverlay, true);
assert.strictEqual(wfOverlay.material.wireframe, true);
assert.strictEqual('#' + wfOverlay.material.color.getHexString(), '#660011', 'Wireframe color must match secondaryEmissiveHex');

// 3.3 Reverting to non-wireframe skin cleans up overlay
let wfDisposed = false;
wfOverlay.material.dispose = () => { wfDisposed = true; };

engine.applyDiscSkin(sampleDisc, 'disc_default');
assert.strictEqual(sampleDisc.userData.wireframeOverlay, null, 'Wireframe overlay reference must be cleared');
assert.strictEqual(sampleDisc.children.includes(wfOverlay), false, 'Wireframe overlay must be detached from disc');
assert.strictEqual(wfDisposed, true, 'Wireframe overlay material must be disposed on removal');

console.log('✓ Group 3: Identity disc skin application and wireframe overlay toggling verified.');

// =========================================================================
// Test Group 4: Dynamic Program Chassis Skin & PBR Surface Tuning
// =========================================================================
console.log('\n[Group 4] Testing Program Chassis Skin & PBR Surface Tuning...');

const sampleRig = makeProgram(0x00f3ff);

// 4.1 Apply ISO Guardian (high metalness, radiant amber/gold)
engine.applyChassisSkin(sampleRig, 'chassis_iso_guardian');
assert.strictEqual(sampleRig.userData.suitMaterial.roughness, 0.2);
assert.strictEqual(sampleRig.userData.suitMaterial.metalness, 0.95);
assert.strictEqual('#' + sampleRig.userData.litMaterial.color.getHexString(), '#ffea00');
assert.strictEqual('#' + sampleRig.userData.litMaterial.emissive.getHexString(), '#ffea00');
assert.ok(sampleRig.userData.litMaterial.emissiveIntensity > 2.2, 'Glowing chassis skin must scale HDR emissiveIntensity');
assert.ok(sampleRig.userData.edgeMaterial, 'Construct rig must expose edgeMaterial for hairline trim tinting');
assert.strictEqual('#' + sampleRig.userData.halo.color.getHexString(), '#ffea00');

// 4.2 Apply Infiltrator (matte stealth)
engine.applyChassisSkin(sampleRig, 'chassis_infiltrator');
assert.strictEqual(sampleRig.userData.suitMaterial.roughness, 0.85);
assert.strictEqual(sampleRig.userData.suitMaterial.metalness, 0.2);
assert.strictEqual('#' + sampleRig.userData.litMaterial.color.getHexString(), '#00d4ff');

// 4.3 Apply Sovereign Arbiter (ivory champion armor)
engine.applyChassisSkin(sampleRig, 'chassis_arbiter');
assert.strictEqual(sampleRig.userData.suitMaterial.roughness, 0.15);
assert.strictEqual(sampleRig.userData.suitMaterial.metalness, 0.85);
assert.strictEqual('#' + sampleRig.userData.suitMaterial.color.getHexString(), '#e0e0e0');
assert.strictEqual('#' + sampleRig.userData.litMaterial.color.getHexString(), '#ffffff');

// 4.4 Back-mounted disc synchronization
engine.activeDiscSkinId = 'disc_retro_green';
engine.applyChassisSkin(sampleRig, 'chassis_default');
assert.strictEqual('#' + sampleRig.userData.backDisc.material.color.getHexString(), '#00ff66', 'Back disc must match activeDiscSkinId');

// 4.5 Self-contained modular chassis skin without pre-registered CHASSIS_PBR_PRESETS
const customRig = makeProgram(0x00f3ff);
engine.applyChassisSkin(customRig, {
  id: 'chassis_custom_modular_test',
  shader: {
    primaryHex: '#00ffcc',
    secondaryEmissiveHex: '#0033aa',
    suitHex: '#3a1050',
    roughness: 0.12,
    metalness: 0.93,
    glowIntensity: 1.8
  }
});
assert.strictEqual('#' + customRig.userData.suitMaterial.color.getHexString(), '#3a1050', 'Custom chassis suitHex must apply directly without PBR preset');
assert.strictEqual(customRig.userData.suitMaterial.roughness, 0.12, 'Custom chassis roughness must apply directly');
assert.strictEqual(customRig.userData.suitMaterial.metalness, 0.93, 'Custom chassis metalness must apply directly');
assert.strictEqual('#' + customRig.userData.litMaterial.color.getHexString(), '#00ffcc', 'Custom chassis primaryHex must apply directly');

console.log('✓ Group 4: Program chassis PBR styling and back disc synchronization verified.');

// =========================================================================
// Test Group 5: Disc Flight Trail Configuration & Color Interpolation
// =========================================================================
console.log('\n[Group 5] Testing Flight Trail Shader Parameters...');

const trailNeonAmber = engine.getTrailConfig('disc_neon_amber');
assert.strictEqual(trailNeonAmber.primaryHex, '#ffaa00');
assert.strictEqual(trailNeonAmber.secondaryEmissiveHex, '#ff4400');
assert.ok(trailNeonAmber.primaryColor instanceof THREE.Color);
assert.ok(trailNeonAmber.secondaryColor instanceof THREE.Color);
assert.strictEqual(trailNeonAmber.opacity, 0.9);
assert.strictEqual(trailNeonAmber.glowIntensity, 1.8);

const trailPlasmaViolet = engine.getTrailConfig('disc_plasma_violet');
assert.strictEqual(trailPlasmaViolet.primaryHex, '#bd00ff');
assert.strictEqual(trailPlasmaViolet.secondaryEmissiveHex, '#7700ff');
assert.strictEqual(trailPlasmaViolet.opacity, 0.95);

const trailDeltaTriad = engine.getTrailConfig('disc_delta_triad');
assert.strictEqual(trailDeltaTriad.shape, 'triangle');
assert.strictEqual(trailDeltaTriad.particles?.ricochetSparks, true);
assert.strictEqual(trailDeltaTriad.particles?.sparkColorHex, '#00f3ff');
assert.strictEqual(trailDeltaTriad.particles?.sparkCount, 16);

const trailShurikenVoid = engine.getTrailConfig('disc_shuriken_void');
assert.strictEqual(trailShurikenVoid.shape, 'shuriken_4');
assert.strictEqual(trailShurikenVoid.particles?.ricochetSparks, true);
assert.strictEqual(trailShurikenVoid.particles?.sparkColorHex, '#ff0055');
assert.strictEqual(trailShurikenVoid.particles?.sparkCount, 24);

console.log('✓ Group 5: Flight trail parameters and interpolation configurations verified.');

// =========================================================================
// Test Group 6: WebGL Resource Management & Recursive Disposal
// =========================================================================
console.log('\n[Group 6] Testing WebGL Resource Management & Recursive Disposal...');

const disposableGroup = new THREE.Group();
const m1 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
const m2 = new THREE.Mesh(new THREE.SphereGeometry(1), [
  new THREE.MeshBasicMaterial(),
  new THREE.MeshBasicMaterial()
]);
disposableGroup.add(m1, m2);

let disposedCount = 0;
m1.geometry.dispose = () => { disposedCount++; };
m1.material.dispose = () => { disposedCount++; };
m2.geometry.dispose = () => { disposedCount++; };
m2.material[0].dispose = () => { disposedCount++; };
m2.material[1].dispose = () => { disposedCount++; };

disposeHierarchy(disposableGroup);
assert.strictEqual(disposedCount, 5, 'disposeHierarchy must dispose all geometries and multi-materials');

// Engine disposal
engine.dispose();
assert.strictEqual(engine.isInitialized, false);
assert.strictEqual(engine.playerObj, null);
assert.strictEqual(engine.playerDiscMesh, null);

console.log('✓ Group 6: Recursive WebGL disposal utility and engine teardown verified.');

// =========================================================================
// Test Group 7: ArmoryPreviewScene Staging & Lifecycle
// =========================================================================
console.log('\n[Group 7] Testing ArmoryPreviewScene Staging & Lifecycle...');

const preview = new ArmoryPreviewScene({
  width: 400,
  height: 400,
  cosmetics: cosmeticMaterialEngine,
  autoRotate: true,
  autoRotateSpeed: 1.0
});

assert.ok(preview.scene instanceof THREE.Scene);
assert.ok(preview.camera instanceof THREE.PerspectiveCamera);
assert.ok(preview.pivot instanceof THREE.Group);

// 7.1 Stage Disc Skin
preview.previewDisc('disc_plasma_violet');
assert.strictEqual(preview.stagedType, 'disc');
assert.strictEqual(preview.currentSkinId, 'disc_plasma_violet');
assert.ok(preview.stagedMesh, 'Staged mesh must be present');
assert.strictEqual(preview.pivot.children.includes(preview.stagedMesh), true);

// 7.2 Stage Chassis Skin (replaces disc and disposes prior)
let prevDiscDisposed = false;
preview.stagedMesh.userData.outerMesh.geometry.dispose = () => { prevDiscDisposed = true; };

preview.previewChassis('chassis_black_guard');
assert.strictEqual(preview.stagedType, 'chassis');
assert.strictEqual(preview.currentSkinId, 'chassis_black_guard');
assert.strictEqual(prevDiscDisposed, true, 'Prior staged mesh must be disposed when staging new item');

// 7.3 Viewport resize
preview.resize(600, 600);
assert.strictEqual(preview.width, 600);
assert.strictEqual(preview.height, 600);
assert.strictEqual(preview.camera.aspect, 1.0);

// 7.4 Pause / Resume
preview.pause();
assert.strictEqual(preview.isPaused, true);
preview.resume();
assert.strictEqual(preview.isPaused, false);

// 7.5 Teardown lifecycle
preview.dispose();
assert.strictEqual(preview.isDisposed, true);
assert.strictEqual(preview.stagedMesh, null);
assert.strictEqual(preview.pivot, null);
assert.strictEqual(preview.scene, null);

console.log('✓ Group 7: ArmoryPreviewScene staging, swap disposal, and destruction lifecycle verified.');

// =========================================================================
// Test Group 8: Procedural Shape Swapping, Wireframe Matching & Palm Disc Sync
// =========================================================================
console.log('\n[Group 8] Testing Procedural Shape Swapping, Wireframe Shape Matching & Palm Disc Sync...');

const shapedDisc = makeDisc(0x00f3ff);
assert.strictEqual(shapedDisc.userData.currentShape, 'circle');

// 8.1 Geometry Swapping with Clean Buffer Disposal
let oldOuterDisposed = false;
let oldFaceDisposed = false;
let oldHubDisposed = false;

shapedDisc.userData.outerMesh.geometry.dispose = () => { oldOuterDisposed = true; };
shapedDisc.userData.faceMesh.geometry.dispose = () => { oldFaceDisposed = true; };
shapedDisc.userData.hubMesh.geometry.dispose = () => { oldHubDisposed = true; };

engine.applyDiscSkin(shapedDisc, {
  id: 'disc_test_triad',
  shape: 'triangle',
  shader: {
    primaryHex: '#00ffcc',
    secondaryEmissiveHex: '#0033aa',
    wireframeToggle: false
  }
});

assert.strictEqual(shapedDisc.userData.currentShape, 'triangle');
assert.strictEqual(oldOuterDisposed, true, 'Prior outer geometry must be disposed on shape swap');
assert.strictEqual(oldFaceDisposed, true, 'Prior face geometry must be disposed on shape swap');
assert.strictEqual(oldHubDisposed, true, 'Prior hub geometry must be disposed on shape swap');

// 8.2 Shape-Conforming Retro Wireframe Overlay
engine.applyDiscSkin(shapedDisc, {
  id: 'disc_test_triad_wf',
  shape: 'triangle',
  shader: {
    primaryHex: '#00ffcc',
    secondaryEmissiveHex: '#0033aa',
    wireframeToggle: true
  }
});

const triadWf = shapedDisc.userData.wireframeOverlay;
assert.ok(triadWf, 'Wireframe overlay must be attached');
assert.strictEqual(triadWf.userData.currentShape, 'triangle', 'Wireframe must conform to triangle shape');

let oldWfDisposed = false;
triadWf.geometry.dispose = () => { oldWfDisposed = true; };

// Swap to hexagon while wireframe remains active
engine.applyDiscSkin(shapedDisc, {
  id: 'disc_test_hex_wf',
  shape: 'hexagon',
  shader: {
    primaryHex: '#ff00aa',
    secondaryEmissiveHex: '#550033',
    wireframeToggle: true
  }
});

assert.strictEqual(shapedDisc.userData.currentShape, 'hexagon');
assert.strictEqual(oldWfDisposed, true, 'Prior wireframe geometry must be disposed on shape swap');
assert.strictEqual(shapedDisc.userData.wireframeOverlay.userData.currentShape, 'hexagon', 'Wireframe must conform to hexagon shape');

// 8.3 Hover-Palm Disc Synchronization on Player Construct Rig
const testRigPalm = makeProgram(0x00f3ff);
const palmDisc = testRigPalm.userData.backDisc;
assert.ok(palmDisc, 'Construct rig must feature backDisc');
assert.strictEqual(palmDisc.userData.currentShape, 'circle');

let oldPalmOuterDisposed = false;
let oldPalmFaceDisposed = false;
palmDisc.geometry.dispose = () => { oldPalmOuterDisposed = true; };
palmDisc.userData.faceMesh.geometry.dispose = () => { oldPalmFaceDisposed = true; };

engine.applyDiscSkin(palmDisc, {
  id: 'disc_test_shuriken_palm',
  shape: 'shuriken_4',
  shader: {
    primaryHex: '#ff5500',
    secondaryEmissiveHex: '#aa2200'
  }
});

assert.strictEqual(palmDisc.userData.currentShape, 'shuriken_4', 'Palm disc must mirror equipped shuriken_4 shape');
assert.strictEqual(oldPalmOuterDisposed, true, 'Prior palm rim geometry must be disposed');
assert.strictEqual(oldPalmFaceDisposed, true, 'Prior palm face geometry must be disposed');

// 8.4 Revert to legacy / circle shape
let prevHexOuterDisposed = false;
shapedDisc.userData.outerMesh.geometry.dispose = () => { prevHexOuterDisposed = true; };

engine.applyDiscSkin(shapedDisc, {
  id: 'disc_test_default',
  shape: 'circle',
  shader: {
    primaryHex: '#00f3ff',
    secondaryEmissiveHex: '#0066ff',
    wireframeToggle: false
  }
});

assert.strictEqual(shapedDisc.userData.currentShape, 'circle');
assert.strictEqual(prevHexOuterDisposed, true, 'Hexagon outer geometry must be disposed when reverting to circle');

// 8.5 Palm-Held Disc Shape-Conforming Wireframe Lifecycle
engine.applyDiscSkin(palmDisc, {
  id: 'disc_test_hex_wf_palm',
  shape: 'hexagon',
  shader: {
    primaryHex: '#00ffaa',
    secondaryEmissiveHex: '#005533',
    wireframeToggle: true
  }
});

assert.strictEqual(palmDisc.userData.currentShape, 'hexagon', 'Palm disc must adopt hexagon shape');
assert.ok(palmDisc.userData.wireframeOverlay, 'Palm disc must possess wireframeOverlay when wireframeToggle is true');
assert.strictEqual(palmDisc.userData.wireframeOverlay.visible, true, 'Palm disc wireframeOverlay must be visible');
assert.strictEqual(palmDisc.userData.wireframeOverlay.userData.currentShape, 'hexagon', 'Palm disc wireframeOverlay must conform to hexagon shape');

let oldPalmWfDisposed = false;
palmDisc.userData.wireframeOverlay.geometry.dispose = () => { oldPalmWfDisposed = true; };

// Toggle wireframe off for palm disc
engine.applyDiscSkin(palmDisc, {
  id: 'disc_test_hex_nowf_palm',
  shape: 'hexagon',
  shader: {
    primaryHex: '#00ffaa',
    secondaryEmissiveHex: '#005533',
    wireframeToggle: false
  }
});

assert.strictEqual(oldPalmWfDisposed, true, 'Prior palm wireframe geometry must be disposed when toggled off');
assert.strictEqual(palmDisc.userData.wireframeOverlay, null, 'Palm disc wireframeOverlay must be cleared and null when toggled off');

console.log('✓ Group 8: Procedural shape swapping, conforming wireframe, palm disc sync, and zero WebGL leaks verified.');

// =========================================================================
// Test Group 9: Catalog Ricochet Particles & Surface Impact Sparks
// =========================================================================
console.log('\n[Group 9] Testing Catalog Ricochet Particles & Surface Impact Sparks...');

// 9.1 Catalog-Defined Particle Trait Extraction
const triadConfig = engine.getTrailConfig('disc_delta_triad');
assert.strictEqual(triadConfig.shape, 'triangle');
assert.strictEqual(triadConfig.particles?.ricochetSparks, true);
assert.strictEqual(triadConfig.particles?.sparkColorHex, '#00f3ff');
assert.strictEqual(triadConfig.particles?.sparkCount, 16);

const shurikenConfig = engine.getTrailConfig('disc_shuriken_void');
assert.strictEqual(shurikenConfig.shape, 'shuriken_4');
assert.strictEqual(shurikenConfig.particles?.ricochetSparks, true);
assert.strictEqual(shurikenConfig.particles?.sparkColorHex, '#ff0055');
assert.strictEqual(shurikenConfig.particles?.sparkCount, 24);

const legacyConfig = engine.getTrailConfig('disc_default');
assert.strictEqual(legacyConfig.shape, 'circle');
assert.strictEqual(legacyConfig.particles, null);

// 9.2 Ricochet Spark Resolution Simulation
function resolveRicochetSparks(disc) {
  if (disc.cosmetics?.particles?.ricochetSparks) {
    const p = disc.cosmetics.particles;
    return {
      color: p.sparkColorHex || disc.cosmetics.primaryHex || disc.color,
      count: p.sparkCount || 16,
      power: 8,
      custom: true
    };
  }
  return {
    color: (disc.cosmetics && disc.cosmetics.primaryHex) ? disc.cosmetics.primaryHex : disc.color,
    count: 10,
    power: 6,
    custom: false
  };
}

const triadDisc = {
  color: 0x00f3ff,
  cosmetics: triadConfig
};
const triadSparks = resolveRicochetSparks(triadDisc);
assert.strictEqual(triadSparks.custom, true);
assert.strictEqual(triadSparks.color, '#00f3ff');
assert.strictEqual(triadSparks.count, 16);

const voidDisc = {
  color: 0xff0055,
  cosmetics: shurikenConfig
};
const voidSparks = resolveRicochetSparks(voidDisc);
assert.strictEqual(voidSparks.custom, true);
assert.strictEqual(voidSparks.color, '#ff0055');
assert.strictEqual(voidSparks.count, 24);

const standardDisc = {
  color: 0x00f3ff,
  cosmetics: legacyConfig
};
const standardSparks = resolveRicochetSparks(standardDisc);
assert.strictEqual(standardSparks.custom, false);
assert.strictEqual(standardSparks.count, 10);

console.log('✓ Group 9: Catalog ricochet particles, custom spark traits, and fallback behavior verified.');

console.log('\n=================================================================');
console.log('ALL COSMETIC MATERIAL ENGINE & PREVIEW SCENE TESTS PASSED (100% SUCCESS)');
console.log('=================================================================\n');
