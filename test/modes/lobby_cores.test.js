import assert from 'assert';
import { LobbyCoresManager, ENERGY_CORES_CONFIG } from '../../src/ui/lobbyCores.js';
import { state } from '../../src/core/state.js';
import { settingsManager } from '../../src/core/settings.js';
import { storageManager } from '../../src/core/storage/StorageManager.js';
import * as THREE from '../../vendor/three.module.js';

console.log('--- Running Playable 3D Lobby & Energy Cores Test Suite ---');

storageManager.load();
settingsManager.load();

const manager = new LobbyCoresManager();

// Test 1: Core Configuration and Geometry Integrity
console.log('\n[Test 1] Testing 4 Energy Core definitions and positions...');
assert.strictEqual(ENERGY_CORES_CONFIG.length, 4, 'Must define 4 Energy Cores');
const coreIds = ENERGY_CORES_CONFIG.map(c => c.id);
assert.deepStrictEqual(coreIds, ['circuit', 'survival', 'duels', 'armory']);
console.log('✓ All 4 Energy Cores (CIRCUIT, SURVIVAL, DUELS, ARMORY) configured cleanly');

// Test 2: Spawning and 3D World-Space Transform
console.log('\n[Test 2] Testing 3D World-Space mesh spawning & continuous animation...');
state.gameMode = 'lobby';
state.running = true;
manager.spawnCores();
assert.strictEqual(manager.cores.length, 4, 'Must spawn 4 core objects in world-space');

const circuitCore = manager.cores.find(c => c.id === 'circuit');
assert.ok(circuitCore.group, 'Core must have Three.js Group');
assert.strictEqual(circuitCore.group.position.z, -22, 'Circuit core positioned at z=-22');

// Test idle animation update
const initialRotY = circuitCore.group.rotation.y;
manager.update(0.1);
assert.notStrictEqual(circuitCore.group.rotation.y, initialRotY, 'Cores must animate continuous idle rotation');
console.log('✓ 3D Energy Cores spawn and animate continuously in world-space');

// Test 3: Disc Projectile Collision Detection
console.log('\n[Test 3] Testing disc projectile collision detection with Energy Cores...');
const mockDisc = {
  pos: new THREE.Vector3(0, 2.4, -21.8), // Right near circuit core at (0, 2.4, -22)
  vel: new THREE.Vector3(0, 0, -10),
  returning: false,
  owner: 'player'
};

let confirmedLaunch = null;
manager.executeLaunch = (core) => { confirmedLaunch = core.id; };

// Case A: With coreLaunchConfirmation = true (default)
settingsManager.set('coreLaunchConfirmation', true);
let modalShownFor = null;
manager.showConfirmModal = (core) => { modalShownFor = core.id; };

const hit = manager.checkDiscIntersection(mockDisc);
assert.ok(hit, 'Must detect disc collision with Energy Core');
assert.strictEqual(hit.id, 'circuit');
assert.strictEqual(mockDisc.returning, true, 'Disc must rebound on core strike');
assert.strictEqual(modalShownFor, 'circuit', 'Must prompt confirmation modal when setting is ON');
assert.strictEqual(confirmedLaunch, null, 'Must NOT launch immediately when confirmation is ON');
console.log('✓ Disc collision triggers confirmation modal when coreLaunchConfirmation is ON');

// Case B: With coreLaunchConfirmation = false
console.log('\n[Test 4] Testing immediate launch when coreLaunchConfirmation is OFF...');
settingsManager.set('coreLaunchConfirmation', false);
modalShownFor = null;
confirmedLaunch = null;
mockDisc.returning = false;

manager.checkDiscIntersection(mockDisc);
assert.strictEqual(confirmedLaunch, 'circuit', 'Must launch immediately when confirmation is OFF');
assert.strictEqual(modalShownFor, null, 'Must NOT show modal when confirmation is OFF');
console.log('✓ Disc collision launches immediately without modal when coreLaunchConfirmation is OFF');

// Restore setting
settingsManager.set('coreLaunchConfirmation', true);
manager.despawnCores();
assert.strictEqual(manager.cores.length, 0, 'despawnCores must cleanly remove meshes');

console.log('\n======================================================');
console.log('ALL PLAYABLE LOBBY & ENERGY CORE TESTS PASSED (100%)');
console.log('======================================================');
