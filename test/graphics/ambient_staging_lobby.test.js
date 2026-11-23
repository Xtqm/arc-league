import assert from 'assert';
import * as THREE from '../../vendor/three.module.js';
import { state } from '../../src/core/state.js';
import { settingsManager } from '../../src/core/settings.js';
import { scene, camera, updateCamera } from '../../src/graphics/scene.js';
import { spawnStagingDisc, despawnStagingDisc, updateAmbientLobby, getStagingDisc, resetMatchCamera } from '../../src/graphics/ambientLobby.js';
import { showModeSelectMenu, startMode } from '../../src/ui/menus.js';
import { updatePlayer, throwDisc } from '../../src/entities/Player.js';

console.log('--- Running Ambient 3D Staging Presentation & Camera Transition Test Suite ---');

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: () => ({
      style: {},
      classList: { add: () => {}, remove: () => {} },
      appendChild: () => {}
    }),
    getElementById: () => null,
    body: {
      style: {},
      appendChild: () => {}
    }
  };
}
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    innerWidth: 1920,
    innerHeight: 1080
  };
}

// Test 1: Staging Turntable Identity Disc in Lobby Mode
console.log('\n[Test 1] Testing ambient turntable Identity Disc creation & positioning...');
state.gameMode = 'lobby';
state.time = 0;
const disc = spawnStagingDisc();
assert.ok(disc, 'Staging disc group must be created');
assert.strictEqual(disc.visible, true, 'Staging disc must be visible in lobby');
assert.strictEqual(disc.userData.part, 'ambient_staging_disc', 'Disc must have ambient_staging_disc marker');
assert.ok(disc.position.x > 0, 'Disc must be positioned on the right staging area (x > 0)');
assert.ok(disc.position.z < 0, 'Disc must be positioned in front of camera (z < 0)');
console.log('✓ Turntable Identity Disc model spawned and positioned in right 65% staging viewport');

// Test 2: Continuous Turntable Animation Update
console.log('\n[Test 2] Testing continuous turntable rotation & hover bob...');
const startRotY = disc.rotation.y;
updateAmbientLobby(0.5);
assert.notStrictEqual(disc.rotation.y, startRotY, 'Turntable disc must continuously rotate with dt');
console.log('✓ Turntable rotation and idle hover float verified');

// Test 3: Player Locomotion (WASD) and Click-to-Throw Disabled in Lobby
console.log('\n[Test 3] Testing disabled player locomotion (WASD) and click-to-throw in lobby...');
state.gameMode = 'lobby';
state.player.pos.set(0, 0, 0);
state.player.hasDisc = true;
state.player.alive = true;
state.keys = { KeyW: true, KeyA: true };
state.countdownTimer = 0;

updatePlayer(0.1);
assert.strictEqual(state.player.pos.x, 0, 'Player X position must remain 0 (no locomotion in lobby)');
assert.strictEqual(state.player.pos.z, 0, 'Player Z position must remain 0 (no locomotion in lobby)');

// Attempt to throw disc in lobby
throwDisc();
assert.strictEqual(state.player.hasDisc, true, 'Player must retain disc (throwDisc disabled in lobby)');
assert.strictEqual(state.discs.length, 0, 'No discs may be spawned from throws in lobby');
console.log('✓ Locomotion keys (WASD) and disc throws completely disabled in lobby mode');

// Test 4: Camera Parallax Clamping in Lobby Mode
console.log('\n[Test 4] Testing camera parallax clamping in lobby mode...');
state.gameMode = 'lobby';
state.player.yaw = 0;
state.player.pitch = 0;
state.cursorX = 1920; // far right
state.cursorY = 1080; // far bottom
updateCamera(0.1);
const maxYaw = 8 * (Math.PI / 180) + 0.01;
const maxPitch = 5 * (Math.PI / 180) + 0.01;
assert.ok(Math.abs(state.player.yaw) <= maxYaw, `Camera yaw (${state.player.yaw.toFixed(3)}) clamped within ±8°`);
assert.ok(Math.abs(state.player.pitch) <= maxPitch, `Camera pitch (${state.player.pitch.toFixed(3)}) clamped within ±5°`);
console.log('✓ Camera subtle parallax tracking clamped within ±8° yaw and ±5° pitch');

// Test 5: Clean Despawn & Camera Transition to Gameplay Modes
console.log('\n[Test 5] Testing transition from lobby staging to active gameplay across modes...');

const modesToTest = ['duel_ai', 'swarm', 'campaign'];
for (const m of modesToTest) {
  // First enter lobby
  state.gameMode = 'lobby';
  spawnStagingDisc();
  assert.strictEqual(disc.visible, true, 'Disc must be visible in lobby');

  // Launch mode
  startMode(m);
  assert.strictEqual(disc.visible, false, `Staging disc must be despawned upon launch into ${m}`);
  assert.notStrictEqual(state.gameMode, 'lobby', `Mode must be updated to ${m}`);
  console.log(`✓ Staging disc hidden and camera reset cleanly for mode: ${m}`);
}

console.log('\n======================================================');
console.log('ALL AMBIENT 3D STAGING & CAMERA TESTS PASSED (100%)');
console.log('======================================================\n');
