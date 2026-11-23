import assert from 'assert';
import { LobbyCoresManager, ENERGY_CORES_CONFIG } from '../../src/ui/lobbyCores.js';
import { state } from '../../src/core/state.js';
import { settingsManager } from '../../src/core/settings.js';
import { storageManager } from '../../src/core/storage/StorageManager.js';
import { updateCamera, camera } from '../../src/graphics/scene.js';
import * as THREE from '../../vendor/three.module.js';

console.log('--- Running Playable 3D Parallax Holo-Deck Lobby & Energy Cores Test Suite ---');

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    elementFromPoint: () => null,
    getElementById: () => null,
    body: { style: {} }
  };
}
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    innerWidth: 1920,
    innerHeight: 1080
  };
}

storageManager.load();
settingsManager.load();

const manager = new LobbyCoresManager();

// Test 1: Core Configuration and 120-Degree Panoramic Arc Layout
console.log('\n[Test 1] Testing 5 Energy Core definitions and 120-degree Holo-Deck panoramic arc...');
assert.strictEqual(ENERGY_CORES_CONFIG.length, 5, 'Must define 5 Energy Cores');
const coreIds = ENERGY_CORES_CONFIG.map(c => c.id);
assert.deepStrictEqual(coreIds, ['circuit', 'survival', 'duels', 'armory', 'settings']);

for (const cfg of ENERGY_CORES_CONFIG) {
  assert.ok(cfg.pos.z < 0, `Core ${cfg.id} must be directly in front of the player (z < 0)`);
  const dist = cfg.pos.distanceTo(new THREE.Vector3(0, 0, 0));
  assert.ok(dist >= 3.5 && dist <= 5.2, `Core ${cfg.id} distance (${dist.toFixed(2)}m) must be within 3.5-5.2m range`);
  const angleDeg = Math.abs(Math.atan2(cfg.pos.x, -cfg.pos.z)) * (180 / Math.PI);
  assert.ok(angleDeg <= 60, `Core ${cfg.id} angle (${angleDeg.toFixed(1)}°) must be within 120° panoramic arc (<= 60°)`);
}
console.log('✓ All 5 Energy Cores (CIRCUIT, SURVIVAL, DUELS, ARMORY, SETTINGS) positioned in 120° arc');

// Test 2: Spawning, First-Person Central Anchor & Continuous Animation
console.log('\n[Test 2] Testing 1st-person terminal camera anchor & 3D world-space spawning...');
state.gameMode = 'lobby';
state.running = true;
state.cameraPerspective = 'third_person'; // Intentional wrong perspective to test strict 1st-person anchor
manager.spawnCores();

assert.strictEqual(manager.cores.length, 5, 'Must spawn 5 core objects in world-space');
assert.strictEqual(state.cameraPerspective, 'first_person', 'Must lock camera perspective strictly to first-person in lobby');
assert.strictEqual(state.player.pos.x, 0, 'Player anchored at center x=0');
assert.strictEqual(state.player.pos.z, 0, 'Player anchored at center z=0');

const circuitCore = manager.cores.find(c => c.id === 'circuit');
assert.ok(circuitCore.group, 'Core must have Three.js Group');
assert.ok(circuitCore.group.position.z < -3.5, 'Circuit core positioned in front of player');

// Ensure textSprite is present for test verification
if (!circuitCore.textSprite) {
  circuitCore.textSprite = new THREE.Sprite();
  circuitCore.group.add(circuitCore.textSprite);
}

// Continuous idle rotation
const initialRotY = circuitCore.group.rotation.y;
manager.update(0.1);
assert.notStrictEqual(circuitCore.group.rotation.y, initialRotY, 'Cores must animate continuous idle rotation');
console.log('✓ 1st-Person Holo-Deck terminal camera anchor & core animations verified');

// Test 3: Exponential Damped Camera Parallax
console.log('\n[Test 3] Testing exponential damped camera parallax & angle clamping...');
settingsManager.set('menuParallax', true);
state.cursorX = 1800; // Far right
state.cursorY = 100;  // High up
state.player.yaw = 0;
state.player.pitch = 0;

for (let i = 0; i < 20; i++) {
  updateCamera(0.016);
}
assert.ok(Math.abs(state.player.yaw) > 0.01, 'Camera yaw must track mouse parallax');
assert.ok(Math.abs(state.player.yaw) <= (8 * Math.PI / 180) + 1e-4, 'Camera yaw must clamp within ±8 degrees');
assert.ok(Math.abs(state.player.pitch) <= (5 * Math.PI / 180) + 1e-4, 'Camera pitch must clamp within ±5 degrees');

// Parallax disabled settling
settingsManager.set('menuParallax', false);
for (let i = 0; i < 60; i++) {
  updateCamera(0.016);
}
assert.ok(Math.abs(state.player.yaw) < 0.01, 'Camera yaw must settle to center when menuParallax is disabled');
assert.ok(Math.abs(state.player.pitch) < 0.01, 'Camera pitch must settle to center when menuParallax is disabled');
console.log('✓ Exponential damped camera parallax with ±8° yaw and ±5° pitch clamping verified');

// Test 4: Kinetic Disc Projectile Launch & Atomic Input Lock
console.log('\n[Test 4] Testing kinetic disc launch projectile animation & atomic input lock...');
state.lobbyLaunching = false;
manager.launchKineticDisc(circuitCore);

assert.strictEqual(state.lobbyLaunching, true, 'Must engage atomic state.lobbyLaunching lock');
assert.ok(manager.flyingDisc, 'Must spawn flyingDisc projectile data');
assert.strictEqual(manager.flyingDisc.core.id, 'circuit');

// Verify launch debounce while projectile is in flight
let secondaryLaunchTriggered = false;
manager.launchKineticDisc = () => { secondaryLaunchTriggered = true; };
const suppressedClick = manager.checkPointerIntersection(960, 540, camera);
assert.strictEqual(suppressedClick, null, 'Clicks must be debounced and return null while disc is in flight');
assert.strictEqual(secondaryLaunchTriggered, false, 'Secondary launch must NOT trigger while disc is in flight');
console.log('✓ Kinetic disc projectile launch and atomic single-flight lock verified');

// Restore launchKineticDisc method
manager.launchKineticDisc = LobbyCoresManager.prototype.launchKineticDisc.bind(manager);

// Test 5: Disc Impact, Neon Voxel Shatter & Confirmation Flow
console.log('\n[Test 5] Testing disc arrival, neon voxel pixel shatter & confirmation drawer...');
settingsManager.set('coreLaunchConfirmation', true);
let modalShownFor = null;
let confirmedLaunch = null;
manager.showConfirmModal = (core) => { modalShownFor = core.id; };
manager.executeLaunch = (core) => { confirmedLaunch = core.id; };

// Advance animation to completion (~0.25s)
manager.update(0.3);

assert.strictEqual(manager.flyingDisc, null, 'Flying disc must be despawned on impact');
assert.strictEqual(circuitCore.mesh.visible, false, 'Struck core mesh must be hidden on impact');
assert.strictEqual(circuitCore.wireMesh.visible, false, 'Struck core wireMesh must be hidden on impact');
assert.strictEqual(circuitCore.textSprite.visible, false, 'Struck core text badge must be hidden on impact');
assert.ok(state.shakeAmt > 0, 'Impact must trigger screen pulse feedback');
assert.strictEqual(manager.shatteredCore.id, 'circuit', 'shatteredCore must reference struck core');
assert.strictEqual(modalShownFor, 'circuit', 'Must prompt confirmation drawer when coreLaunchConfirmation is ON');
assert.strictEqual(confirmedLaunch, null, 'Must NOT launch mode immediately when confirmation is ON');
console.log('✓ Voxel pixel shatter, core concealment, and confirmation modal prompt verified');

// Test 6: Cinematic Reverse-Particle Glitch Re-Assembly on Cancel
console.log('\n[Test 6] Testing cinematic reverse-particle glitch re-assembly on cancel...');
manager.cancelLaunch();

assert.ok(manager.reassemblyAnim, 'Must start reassemblyAnim on cancel');
assert.strictEqual(manager.reassemblyAnim.core.id, 'circuit');

// Advance reassembly animation to completion (0.22s)
manager.update(0.25);

assert.strictEqual(manager.reassemblyAnim, null, 'Reassembly animation must conclude cleanly');
assert.strictEqual(circuitCore.mesh.visible, true, 'Core mesh must be unhidden after reassembly');
assert.strictEqual(circuitCore.wireMesh.visible, true, 'Core wireMesh must be unhidden after reassembly');
assert.strictEqual(circuitCore.textSprite.visible, true, 'Core text badge must be unhidden after reassembly');
assert.strictEqual(manager.shatteredCore, null, 'shatteredCore reference must be cleared');
assert.strictEqual(state.lobbyLaunching, false, 'Atomic input lock must be released after reassembly');
console.log('✓ Cinematic reverse-particle glitch re-assembly lifecycle verified');

// Test 7: DOM Element Occlusion Detection
console.log('\n[Test 7] Testing DOM element occlusion suppression with document.elementFromPoint...');
globalThis.document.elementFromPoint = (x, y) => {
  return {
    closest: (selector) => selector.includes('#identityHeader') ? {} : null
  };
};

const occludedHit = manager.checkPointerIntersection(100, 20, camera);
assert.strictEqual(occludedHit, null, 'Raycasting must be suppressed when pointer is over #identityHeader');

globalThis.document.elementFromPoint = () => null; // Reset to non-occluded canvas
console.log('✓ DOM element occlusion suppression over header and modals verified');

// Test 8: Gameplay Disc Collision (checkDiscIntersection)
console.log('\n[Test 8] Testing gameplay disc collision & immediate launch when confirmation is OFF...');
settingsManager.set('coreLaunchConfirmation', false);
modalShownFor = null;
confirmedLaunch = null;

const mockDisc = {
  pos: circuitCore.pos.clone().add(new THREE.Vector3(0, 0, 0.2)),
  vel: new THREE.Vector3(0, 0, -10),
  returning: false,
  owner: 'player'
};

const directHit = manager.checkDiscIntersection(mockDisc);
assert.ok(directHit, 'Must detect disc collision with Energy Core');
assert.strictEqual(directHit.id, 'circuit');
assert.strictEqual(mockDisc.returning, true, 'Disc must rebound on core strike');
assert.strictEqual(confirmedLaunch, 'circuit', 'Must launch immediately when confirmation is OFF');
assert.strictEqual(modalShownFor, null, 'Must NOT show modal when confirmation is OFF');
console.log('✓ Disc collision and immediate launch without confirmation verified');

// Cleanup
settingsManager.set('coreLaunchConfirmation', true);
settingsManager.set('menuParallax', true);
manager.despawnCores();
assert.strictEqual(manager.cores.length, 0, 'despawnCores must cleanly remove meshes');

console.log('\n======================================================');
console.log('ALL HOLO-DECK LOBBY & ENERGY CORE TESTS PASSED (100%)');
console.log('======================================================');
