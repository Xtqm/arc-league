/**
 * test/modes/survival_hardcore.test.js
 * Test suite verifying Survival: Hardcore mode unlock gating, mode instantiation,
 * baseline Level 5 difficulty, and Dynamic Director rolling counter-measures.
 */

import assert from 'assert';
import * as THREE from '../../vendor/three.module.js';
import { state } from '../../src/core/state.js';
import { config } from '../../src/core/config.js';
import { storageManager } from '../../src/core/storage/StorageManager.js';
import { isHardcoreUnlocked, getMainMenuHtml, startSoloSwarm } from '../../src/ui/menus.js';
import { lobbyCoresManager } from '../../src/ui/lobbyCores.js';
import { dynamicDirector, DynamicDirector } from '../../src/ai/DynamicDirector.js';
import { spawnWave, updateFoes, killFoe } from '../../src/entities/Bot.js';
import { BotCombatBrain } from '../../src/ai/BotCombatBrain.js';
import { pillars } from '../../src/entities/Arena.js';

console.log('--- Running Survival: Hardcore Mode & Dynamic Director Test Suite ---');

function resetTestEnvironment() {
  state.foes = [];
  state.discs = [];
  state.gameMode = 'swarm';
  state.isHardcoreSurvival = false;
  state.wave = 1;
  state.score = 0;
  state.time = 1.0;
  state.countdownTimer = 0;
  state.lastSquadOrder = null;
  state.lastCombatEvent = null;
  state.player = {
    pos: new THREE.Vector3(0, 0, 0),
    vel: new THREE.Vector3(0, 0, 0),
    y: 0,
    alive: true,
    hp: 100,
    blocking: false,
    parryTimer: 0
  };
  dynamicDirector.reset();
}

// =========================================================================
// [Group 1] Hardcore Unlock Prerequisite Gating (stats.swarmMaxWave >= 10)
// =========================================================================
console.log('\n[Group 1] Testing Hardcore Unlock Prerequisite Gating...');

// Wave < 10: Locked
storageManager.set('stats.swarmMaxWave', 9);
storageManager.set('stats.swarmHighestWave', 9);
storageManager.set('stats.highestWave', 9);
assert.strictEqual(isHardcoreUnlocked(storageManager), false, 'Hardcore mode must be locked when max wave < 10');

let menuHtml = getMainMenuHtml();
assert(menuHtml.includes('display:none'), 'Variant selector must be hidden in main menu when locked');

// Wave >= 10: Unlocked
storageManager.set('stats.swarmMaxWave', 10);
assert.strictEqual(isHardcoreUnlocked(storageManager), true, 'Hardcore mode must be unlocked when stats.swarmMaxWave >= 10');

menuHtml = getMainMenuHtml();
assert(menuHtml.includes('display:flex'), 'Variant selector must be displayed in main menu when unlocked');
assert(menuHtml.includes('btnSurvivalHardcore'), 'Hardcore selector button must exist when unlocked');

// Test lobby core confirm modal variant selector
if (typeof document !== 'undefined') {
  const dummyModal = document.createElement('div');
  dummyModal.id = 'coreConfirmModal';
  const card = document.createElement('div');
  card.className = 'card';
  const actions = document.createElement('div');
  actions.style.display = 'flex';
  card.appendChild(actions);
  dummyModal.appendChild(card);
  document.body.appendChild(dummyModal);

  lobbyCoresManager.showConfirmModal({ id: 'survival', name: 'SURVIVAL (SWARM)' });
  const variantSelector = document.getElementById('coreVariantSelector');
  assert(variantSelector && variantSelector.style.display === 'flex', 'Lobby core confirm modal must reveal variant selector for survival');
}

console.log('✓ Hardcore unlock prerequisite (Wave 10) and UI variant selector verified');

// =========================================================================
// [Group 2] Survival Hardcore Mode Instantiation & Level 5 Baseline
// =========================================================================
console.log('\n[Group 2] Testing Hardcore Match Instantiation & Level 5 Baseline...');

resetTestEnvironment();
startSoloSwarm({ hardcore: true });
assert.strictEqual(state.isHardcoreSurvival, true, 'startSoloSwarm({ hardcore: true }) must set state.isHardcoreSurvival to true');
assert.strictEqual(state.gameMode, 'swarm', 'Game mode must be set to swarm');

// Spawn Wave 1 in Hardcore mode
spawnWave();
assert(state.foes.length > 0, 'Wave 1 must spawn foes in Hardcore mode');

// Squad Commander must be present starting at Wave 1 in Hardcore
const commanders = state.foes.filter(f => f.isCommander);
assert.strictEqual(commanders.length, 1, 'Hardcore mode must spawn a Squad Commander starting from Wave 1');

// Every bot in Hardcore mode must have difficultyLevel >= 5
for (let i = 0; i < state.foes.length; i++) {
  const f = state.foes[i];
  assert(f.difficultyLevel >= 5, `Foe ${i} difficultyLevel (${f.difficultyLevel}) must be >= 5 baseline in Hardcore`);
  assert.strictEqual(BotCombatBrain.canCharge(f), true, `Foe ${i} (diff ${f.difficultyLevel}) must have CHARGED_THROW capability unlocked`);
  assert.strictEqual(BotCombatBrain.canParry(f), true, `Foe ${i} (diff ${f.difficultyLevel}) must have PARRY_DEFENSE capability unlocked`);
}

console.log('✓ Hardcore mode starts with Level 5+ baseline and Wave 1 Squad Commander');

// =========================================================================
// [Group 3] Dynamic Director: Defensive Parry / Turtling Counter
// =========================================================================
console.log('\n[Group 3] Testing Dynamic Director Parry Counter & Guard Crush Orders...');

resetTestEnvironment();
state.isHardcoreSurvival = true;
const director = new DynamicDirector();

// 2 parries in 5s: not yet countering
director.recordParry(1.0);
director.recordParry(2.0);
director.update(0.1);
assert.strictEqual(director.isCounteringParry(), false, '2 parries should not trigger parry counter (threshold is > 2)');

// 3rd parry: threshold exceeded (> 2 in 5s)
director.recordParry(2.5);
director.update(0.1);
assert.strictEqual(director.isCounteringParry(), true, '3 parries in 5s must trigger counterParry = true');

// Advance time past 5s window: oldest parries should expire
state.time = 8.0;
director.update(0.1);
assert.strictEqual(director.isCounteringParry(), false, 'Expired parries must clear counterParry flag');

// Sustained defensive blocking (> 2.0s) triggers counterParry
state.player.blocking = true;
for (let step = 0; step < 25; step++) {
  director.update(0.1);
}
assert.strictEqual(director.isCounteringParry(), true, 'Sustained blocking (> 2.0s) must trigger counterParry');

// Integrate with Bot.js updateFoes: verify Commander issues CHARGE order and minions start charging
resetTestEnvironment();
state.isHardcoreSurvival = true;
spawnWave();
dynamicDirector.recordParry(state.time);
dynamicDirector.recordParry(state.time);
dynamicDirector.recordParry(state.time);
dynamicDirector.update(0.1);
assert.strictEqual(dynamicDirector.isCounteringParry(), true, 'Dynamic Director must flag counterParry');

// Force Commander order countdown
const cmd = state.foes.find(f => f.isCommander);
assert(cmd, 'Squad Commander must exist');
cmd.commandTimer = 0.05;

// Tick updateFoes
updateFoes(0.1);
assert.strictEqual(state.lastSquadOrder, 'CHARGE', 'Commander must issue CHARGE order when counterParry is active');

// Wingmen should have begun charge windups
const chargingFoes = state.foes.filter(f => !f.isCommander && f.isChargingThrow);
assert(chargingFoes.length > 0, 'Minions must initiate throw charge windups upon receiving CHARGE order');

console.log('✓ Dynamic Director rolling parry counter and CHARGE squad orders verified');

// =========================================================================
// [Group 4] Dynamic Director: Pillar Camping Detection & Bank Ricochets
// =========================================================================
console.log('\n[Group 4] Testing Dynamic Director Pillar Camping & Bank Counter...');

resetTestEnvironment();
state.isHardcoreSurvival = true;

// Place player behind first pillar at [-20, -20]
assert(pillars.length > 0, 'Arena pillars must exist');
const testPillar = pillars[0];
state.player.pos.set(testPillar.x + 1.0, 0, testPillar.z + 1.0);
state.player.vel.set(0, 0, 0);

// Tick for 2.0s: under 3.0s threshold
for (let t = 0; t < 20; t++) {
  dynamicDirector.update(0.1);
}
assert.strictEqual(dynamicDirector.isCounteringCamping(), false, 'Camping timer under 3.0s must not trigger counterCamping');

// Tick beyond 3.0s: threshold reached
for (let t = 0; t < 15; t++) {
  dynamicDirector.update(0.1);
}
assert.strictEqual(dynamicDirector.isCounteringCamping(), true, 'Stationary near pillar > 3.0s must trigger counterCamping');

// Move player out into open arena
state.player.pos.set(0, 0, 0);
for (let t = 0; t < 30; t++) {
  dynamicDirector.update(0.1);
}
assert.strictEqual(dynamicDirector.isCounteringCamping(), false, 'Moving away from pillar must clear counterCamping');

console.log('✓ Dynamic Director pillar camping detection and recovery verified');

// =========================================================================
// [Group 5] Dynamic Director: Flawless Health Difficulty Elevation
// =========================================================================
console.log('\n[Group 5] Testing Flawless Health Difficulty Elevation...');

resetTestEnvironment();
state.isHardcoreSurvival = true;

// Player at 100 HP -> flawless health = true, modifier = +1
state.player.hp = 100;
dynamicDirector.update(0.1);
assert.strictEqual(dynamicDirector.flawlessHealth, true, 'Player at 100 HP must have flawlessHealth = true');
assert.strictEqual(dynamicDirector.getDifficultyModifier(), 1, 'Flawless health must grant +1 difficulty modifier');

// Player takes damage -> flawless health = false, modifier = 0
state.player.hp = 75;
dynamicDirector.update(0.1);
assert.strictEqual(dynamicDirector.flawlessHealth, false, 'Player below 100 HP must lose flawlessHealth');
assert.strictEqual(dynamicDirector.getDifficultyModifier(), 0, 'Damaged player must have 0 difficulty modifier');

console.log('✓ Flawless health difficulty elevation verified');

console.log('\n======================================================');
console.log(' ALL SURVIVAL: HARDCORE & DYNAMIC DIRECTOR TESTS PASSED');
console.log('======================================================\n');
