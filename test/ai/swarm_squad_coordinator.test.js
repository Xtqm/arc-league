/**
 * test/ai/swarm_squad_coordinator.test.js
 * Test suite verifying Swarm Squad Commander spawning, visual beacon attachments,
 * tactical order broadcasting (PINCER, STAGGER), and the tiered disarray lifecycle.
 */

import assert from 'assert';
import * as THREE from '../../vendor/three.module.js';
import { state } from '../../src/core/state.js';
import { config } from '../../src/core/config.js';
import {
  spawnWave,
  killFoe,
  updateFoes,
  promoteToCommander,
  electNewCommander
} from '../../src/entities/Bot.js';
import { makeProgram } from '../../src/graphics/materials.js';

console.log('--- Running Swarm Squad Coordinator & Disarray Lifecycle Test Suite ---');

function resetTestState(wave = 4) {
  state.foes = [];
  state.discs = [];
  state.gameMode = 'swarm';
  state.wave = wave;
  state.score = 0;
  state.time = 1.0;
  state.countdownTimer = 0;
  state.player = {
    pos: new THREE.Vector3(0, 0, 0),
    y: 0,
    alive: true,
    hp: 100
  };
}

// =========================================================================
// [Group 1] Squad Commander Wave Gating & Beacon Attachment
// =========================================================================
console.log('\n[Group 1] Testing Commander Spawning & Beacon Light Attachment...');

// Waves 1-3: No Squad Commander
resetTestState(2);
spawnWave();
const w2Commanders = state.foes.filter(f => f.isCommander);
assert.strictEqual(w2Commanders.length, 0, 'Waves 1-3 must not spawn a Squad Commander');

// Wave 4: Exactly 1 Squad Commander with visual command beacon
resetTestState(4);
spawnWave();
const w4Commanders = state.foes.filter(f => f.isCommander);
assert.strictEqual(w4Commanders.length, 1, 'Wave 4 must spawn exactly 1 Squad Commander');

const cmd = w4Commanders[0];
assert(cmd.hp > 100, `Commander must have elevated HP pool (got ${cmd.hp})`);
assert(cmd.beaconLight instanceof THREE.PointLight, 'Commander must have attached visual beacon PointLight');
assert.strictEqual(cmd.difficultyLevel >= 5, true, 'Commander difficulty level must be >= 5');

console.log('✓ Wave 4+ Squad Commander spawning and beacon attachments verified');

// =========================================================================
// [Group 2] Commander Tactical Order Broadcasting (PINCER & STAGGER)
// =========================================================================
console.log('\n[Group 2] Testing Commander Tactical Order Broadcasting...');
resetTestState(5);

const mockCmd = {
  pos: new THREE.Vector3(0, 0, -20),
  y: 0,
  vel: new THREE.Vector3(),
  hp: 300,
  maxHp: 300,
  alive: true,
  isCommander: true,
  commandTimer: 0.001, // Ready to emit order
  difficultyLevel: 6,
  hasDisc: true,
  cd: 2.0,
  strafe: 1,
  strafeT: 1.0,
  obj: makeProgram(0xff0055, { archetype: 'sentinel' })
};

const minion1 = {
  pos: new THREE.Vector3(-10, 0, -18),
  y: 0,
  vel: new THREE.Vector3(),
  hp: 150,
  maxHp: 150,
  alive: true,
  isCommander: false,
  disarrayTimer: 0,
  pincerActive: 0,
  hasDisc: true,
  cd: 2.0,
  strafe: 1,
  strafeT: 1.0,
  obj: makeProgram(config.ORANGE, { archetype: 'drone' })
};

const minion2 = {
  pos: new THREE.Vector3(10, 0, -18),
  y: 0,
  vel: new THREE.Vector3(),
  hp: 150,
  maxHp: 150,
  alive: true,
  isCommander: false,
  disarrayTimer: 0,
  pincerActive: 0,
  hasDisc: true,
  cd: 2.0,
  strafe: -1,
  strafeT: 1.0,
  obj: makeProgram(config.ORANGE, { archetype: 'drone' })
};

state.foes = [mockCmd, minion1, minion2];

// Step updateFoes to trigger command broadcast
updateFoes(0.016);

assert(state.lastSquadOrder === 'PINCER' || state.lastSquadOrder === 'STAGGER', 'Commander must broadcast PINCER or STAGGER order');

if (state.lastSquadOrder === 'PINCER') {
  assert(minion1.pincerActive > 0, 'Minion 1 must activate pincer maneuver');
  assert(minion2.pincerActive > 0, 'Minion 2 must activate pincer maneuver');
  assert.strictEqual(minion1.strafe, -minion2.strafe, 'Minions must execute opposing flank strafe vectors');
} else {
  assert.strictEqual(minion1.tacticalOrder, 'STAGGER');
  assert.strictEqual(minion2.tacticalOrder, 'STAGGER');
  assert.notStrictEqual(minion1.cd, minion2.cd, 'Wingmen must receive staggered cooldown intervals');
}

console.log(`✓ Commander tactical order broadcast verified (issued: ${state.lastSquadOrder})`);

// =========================================================================
// [Group 3] Tiered Disarray: Early Waves (Waves 4-7 Instant Swarm Collapse)
// =========================================================================
console.log('\n[Group 3] Testing Early Wave Commander Elimination (Instant Swarm Collapse)...');
resetTestState(5); // Wave 5 in range 4-7

const earlyCmd = {
  pos: new THREE.Vector3(0, 0, -15),
  y: 0,
  alive: true,
  isCommander: true,
  hp: 200,
  obj: new THREE.Group()
};

const drone1 = {
  pos: new THREE.Vector3(-10, 0, -15),
  y: 0,
  alive: true,
  isCommander: false,
  hp: 100,
  obj: new THREE.Group()
};

const drone2 = {
  pos: new THREE.Vector3(10, 0, -15),
  y: 0,
  alive: true,
  isCommander: false,
  hp: 100,
  obj: new THREE.Group()
};

state.foes = [earlyCmd, drone1, drone2];

// Eliminate early wave Commander
killFoe(earlyCmd);

assert.strictEqual(state.lastCombatEvent, 'SWARM_COLLAPSE', 'Eliminating early Commander must trigger SWARM_COLLAPSE');
assert.strictEqual(state.foes.length, 0, 'Swarm collapse must immediately de-rez all peripheral drones');
assert.strictEqual(drone1.alive, false, 'Peripheral drone 1 must de-rez');
assert.strictEqual(drone2.alive, false, 'Peripheral drone 2 must de-rez');
assert.strictEqual(state.wave, 6, 'Wave counter must advance to next wave cycle');

console.log('✓ Early wave instant swarm collapse verified cleanly');

// =========================================================================
// [Group 4] Tiered Disarray: Mid Waves (Waves 8-12 2.5s Glitch Disarray)
// =========================================================================
console.log('\n[Group 4] Testing Mid Wave Commander Elimination (2.5s Network Disarray)...');
resetTestState(9); // Wave 9 in range 8-12

const midCmd = {
  pos: new THREE.Vector3(0, 0, -15),
  y: 0,
  alive: true,
  isCommander: true,
  hp: 250,
  obj: new THREE.Group()
};

const midDrone = {
  pos: new THREE.Vector3(8, 0, -15),
  y: 0,
  alive: true,
  isCommander: false,
  hp: 120,
  disarrayTimer: 0,
  obj: new THREE.Group()
};

state.foes = [midCmd, midDrone];

killFoe(midCmd);

assert.strictEqual(state.lastCombatEvent, 'SWARM_DISARRAY', 'Eliminating mid Commander must trigger SWARM_DISARRAY');
assert.strictEqual(state.foes.length, 1, 'Surviving minion must not de-rez');
assert.strictEqual(midDrone.alive, true, 'Surviving drone must remain alive');
assert.strictEqual(midDrone.disarrayTimer, 2.5, 'Surviving drone must incur 2.5s disarray timer');
assert.strictEqual(midDrone.hurt, 0.5, 'Surviving drone must enter glitch/stagger state');

console.log('✓ Mid wave 2.5s network glitch disarray verified cleanly');

// =========================================================================
// [Group 5] Tiered Disarray: Late Waves (Waves 13+ Automated Commander Re-election)
// =========================================================================
console.log('\n[Group 5] Testing Late Wave Commander Elimination & Automated Re-election...');
resetTestState(14); // Wave 14 >= 13

const lateCmd = {
  pos: new THREE.Vector3(0, 0, -15),
  y: 0,
  alive: true,
  isCommander: true,
  hp: 350,
  obj: new THREE.Group()
};

const highHpMinion = {
  pos: new THREE.Vector3(-12, 0, -15),
  y: 0,
  alive: true,
  isCommander: false,
  hp: 190,
  maxHp: 200,
  disarrayTimer: 0,
  obj: new THREE.Group()
};

const lowHpMinion = {
  pos: new THREE.Vector3(12, 0, -15),
  y: 0,
  alive: true,
  isCommander: false,
  hp: 80,
  maxHp: 200,
  disarrayTimer: 0,
  obj: new THREE.Group()
};

state.foes = [lateCmd, highHpMinion, lowHpMinion];

// Eliminate late wave Commander
killFoe(lateCmd);

assert.strictEqual(state.lastCombatEvent, 'COMMANDER_ELECTION', 'Eliminating late Commander must initiate election');
assert.strictEqual(highHpMinion.disarrayTimer, 2.0);
assert.strictEqual(lowHpMinion.disarrayTimer, 2.0);

// Automated Election resolves: highest HP minion (190 HP) is promoted!
const electedCommander = electNewCommander();
assert.strictEqual(electedCommander, highHpMinion, 'Highest HP minion must be elected new Commander');
assert.strictEqual(highHpMinion.isCommander, true, 'Elected minion isCommander must be true');
assert(highHpMinion.beaconLight instanceof THREE.PointLight, 'Promoted Commander must receive beacon light');
assert(highHpMinion.hp >= 190, 'Promoted Commander HP must be boosted');
assert.strictEqual(lowHpMinion.isCommander, false, 'Lower HP minion must remain regular minion');

console.log('✓ Late wave automated Commander re-election verified cleanly');

console.log('\n======================================================');
console.log('ALL SWARM SQUAD COORDINATOR TESTS PASSED (100% SUCCESS)');
console.log('======================================================');
