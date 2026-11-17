/**
 * test/gameplay/bot_combat_e2e_simulation.test.js
 * End-to-end combat simulation validating full match lifecycles across:
 * 1. Swarm Standard (Waves 1-5, Squad Commander collapse clearing wave 4)
 * 2. Swarm Hardcore (Level 5 baseline, DynamicDirector countering parry & camping)
 * 3. Campaign Trial (Encounter wave with GUARDIAN/ELITE tiers)
 * 4. Arbiter Boss Encounters (Phase transitions, shield depletions, apex AI)
 */

import assert from 'assert';
import * as THREE from '../../vendor/three.module.js';
import { state } from '../../src/core/state.js';
import { config } from '../../src/core/config.js';
import { storageManager } from '../../src/core/storage/StorageManager.js';
import {
  spawnWave,
  spawnCampaignWave,
  spawnArbiterBoss,
  updateFoes,
  killFoe
} from '../../src/entities/Bot.js';
import { updateDiscs, spawnDisc } from '../../src/entities/Disc.js';
import { dynamicDirector } from '../../src/ai/DynamicDirector.js';
import { ArbiterBossController, ARBITER_CONFIGS } from '../../src/ai/ArbiterBossController.js';
import { startSoloSwarm } from '../../src/ui/menus.js';
import { campaignManager } from '../../src/campaign/CampaignManager.js';

console.log('--- Running Bot Combat End-to-End Simulation Test Suite ---');

function resetSimEnvironment() {
  state.foes = [];
  state.discs = [];
  state.gameMode = 'swarm';
  state.isHardcoreSurvival = false;
  state.wave = 1;
  state.score = 0;
  state.time = 0.0;
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
// [Simulation 1] Swarm Standard: Waves 1-4 & Early Commander Collapse
// =========================================================================
console.log('\n[Simulation 1] Swarm Standard Simulation...');

resetSimEnvironment();
state.gameMode = 'swarm';
state.wave = 1;
spawnWave();
assert.strictEqual(state.foes.length >= 2, true, 'Wave 1 must spawn initial drone cohort');
assert.strictEqual(state.foes.some(f => f.isCommander), false, 'Wave 1 Standard must not have Commander');

// Simulate eliminating all Wave 1 drones
while (state.foes.length > 0) {
  killFoe(state.foes[0]);
}
assert.strictEqual(state.foes.length, 0, 'Wave 1 cleared');

// Advance to Wave 4
state.wave = 4;
spawnWave();
const cmdW4 = state.foes.find(f => f.isCommander);
assert(cmdW4, 'Wave 4 must have a Squad Commander');
const droneCountBefore = state.foes.filter(f => !f.isCommander).length;
assert(droneCountBefore > 0, 'Wave 4 must have peripheral drones');

// Simulate eliminating Commander during Wave 4 -> triggers SWARM_COLLAPSE
killFoe(cmdW4);
assert.strictEqual(state.lastCombatEvent, 'SWARM_COLLAPSE', 'Eliminating Wave 4 Commander must trigger instant collapse');
assert.strictEqual(state.foes.length, 0, 'All peripheral drones must de-rez immediately upon early collapse');

console.log('✓ Swarm Standard simulation and early collapse wave clear verified');

// =========================================================================
// [Simulation 2] Swarm Hardcore: Level 5 Baseline & Dynamic Director Loop
// =========================================================================
console.log('\n[Simulation 2] Swarm Hardcore & Dynamic Director Simulation...');

resetSimEnvironment();
storageManager.set('stats.swarmMaxWave', 10);
startSoloSwarm({ hardcore: true });
assert.strictEqual(state.isHardcoreSurvival, true, 'Hardcore survival active');

spawnWave();
assert.strictEqual(state.foes.some(f => f.isCommander), true, 'Hardcore mode must have Commander at Wave 1');

// Verify all bots meet Level 5 baseline
state.foes.forEach((f, idx) => {
  assert(f.difficultyLevel >= 5, `Foe ${idx} difficulty (${f.difficultyLevel}) must be >= 5`);
});

// Simulate player defensive turtling (multiple parries in 5s)
dynamicDirector.recordParry(state.time);
dynamicDirector.recordParry(state.time + 1.0);
dynamicDirector.recordParry(state.time + 2.0);
dynamicDirector.update(0.1);
assert.strictEqual(dynamicDirector.isCounteringParry(), true, 'Director must detect parry turtling');

// Simulate frame tick of foes under parry counter
const commander = state.foes.find(f => f.isCommander);
commander.commandTimer = 0.01;
updateFoes(0.016);
assert.strictEqual(state.lastSquadOrder, 'CHARGE', 'Commander must order CHARGE to break turtle guard');

console.log('✓ Swarm Hardcore match simulation and Dynamic Director response verified');

// =========================================================================
// [Simulation 3] Campaign Trial Encounter (GUARDIAN / ELITE cohort)
// =========================================================================
console.log('\n[Simulation 3] Campaign Trial Encounter Simulation...');

resetSimEnvironment();
state.gameMode = 'campaign';
const campaignLevelConfig = {
  id: 'level_02_03',
  name: 'Outlands Sector 3',
  type: 'trial',
  waves: [
    {
      waveNumber: 1,
      enemies: [
        { type: 'GUARDIAN', count: 2, hp: 120 },
        { type: 'ELITE', count: 1, hp: 160 }
      ]
    }
  ]
};

spawnCampaignWave(campaignLevelConfig, 1);
assert.strictEqual(state.foes.length, 3, 'Must spawn 3 campaign trial foes');

const eliteFoe = state.foes.find(f => f.campaignTier === 'ELITE');
assert(eliteFoe, 'ELITE foe must be present in cohort');
assert(eliteFoe.skill >= 0.85, 'ELITE foe must have high combat skill rating');

// Simulate combat loop for campaign foes
for (let frame = 0; frame < 30; frame++) {
  state.time += 0.016;
  updateFoes(0.016);
  updateDiscs(0.016);
}
assert.strictEqual(eliteFoe.alive, true, 'Campaign foes must update without exceptions');

console.log('✓ Campaign Trial encounter simulation verified');

// =========================================================================
// [Simulation 4] Master Control Level 10 Apex Arbiter Simulation
// =========================================================================
console.log('\n[Simulation 4] Master Control Apex Arbiter Simulation...');

resetSimEnvironment();
state.gameMode = 'campaign';
storageManager.set('campaign.starsEarned', 60);
storageManager.set('campaign.unlockedNodes', ['level_04_08']);
campaignManager.startTrial('level_04_08');
const mcFoe = spawnArbiterBoss('level_04_08');
assert(mcFoe, 'Master Control boss foe must spawn successfully');
const mcBoss = mcFoe.bossController;
assert(mcBoss, 'Master Control boss controller must be attached');
assert.strictEqual(mcBoss.personality, 'MASTER_CONTROL', 'Boss must be Master Control');
assert.strictEqual(mcBoss.currentShields, 4, 'Master Control must begin with 4 shield layers');

let summonTriggered = false;
mcBoss.on('summon_minions', (e) => {
  summonTriggered = true;
  assert.strictEqual(e.count, 2, 'Must summon 2 minion subroutines upon shield depletion');
});

// Simulate stripping shields down to Core
while (mcBoss.currentShields > 0) {
  mcBoss.invulnerableTimer = 0;
  const res = mcBoss.onHit(25);
  assert.strictEqual(res.absorbed, true, 'Shield layer must absorb incoming hit');
}
assert.strictEqual(mcBoss.currentShields, 0, 'Shields must be completely depleted');

// Update boss to trigger minion summon event
mcBoss.update(0.016, state.player, []);
assert.strictEqual(summonTriggered, true, 'Depleted shields must trigger minion subroutine summon');

// Now hit core
const coreRes = mcBoss.onHit(50);
assert.strictEqual(coreRes.absorbed, false, 'Unshielded core must take damage');
assert(mcBoss.foe.hp < mcBoss.config.maxHp, 'Boss HP must decrease');

// Eliminate Master Control boss
mcBoss.foe.hp = 0;
killFoe(mcBoss.foe);
assert.strictEqual(mcBoss.foe.alive, false, 'Master Control must be de-rezed');

console.log('✓ Master Control Level 10 Apex Arbiter simulation verified');

console.log('\n======================================================');
console.log(' ALL END-TO-END COMBAT SIMULATIONS PASSED (100%)');
console.log('======================================================\n');
