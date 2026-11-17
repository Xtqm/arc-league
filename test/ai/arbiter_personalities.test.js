/**
 * test/ai/arbiter_personalities.test.js
 * Unit and integration test suite verifying personality-specific combat behaviors,
 * phase transitions, and update-loop decoupling for all 4 Campaign Arbiter Bosses.
 */

import assert from 'assert';
import * as THREE from '../../vendor/three.module.js';
import { state } from '../../src/core/state.js';
import {
  ArbiterBossController,
  ARBITER_CONFIGS
} from '../../src/ai/ArbiterBossController.js';
import { updateFoes } from '../../src/entities/Bot.js';

console.log('--- Running Campaign Arbiter Personalities Test Suite ---');

function createMockFoe(x = 0, z = -20) {
  return {
    pos: new THREE.Vector3(x, 0, z),
    y: 0,
    vy: 0,
    vel: new THREE.Vector3(),
    hp: 250,
    maxHp: 250,
    hasDisc: true,
    alive: true,
    isArbiter: true,
    isBoss: true,
    shieldCd: 0,
    blocking: false,
    obj: {
      position: new THREE.Vector3(x, 0, z),
      rotation: { x: 0, y: 0, z: 0 },
      userData: {
        backDisc: {
          visible: true,
          position: new THREE.Vector3(),
          rotation: new THREE.Euler()
        },
        joints: {
          pelvis: new THREE.Group(),
          torso: new THREE.Group(),
          head: new THREE.Group(),
          leftShoulder: new THREE.Group(),
          rightShoulder: new THREE.Group(),
          leftElbow: new THREE.Group(),
          rightElbow: new THREE.Group(),
          leftHand: new THREE.Group(),
          rightHand: new THREE.Group(),
          leftHip: new THREE.Group(),
          rightHip: new THREE.Group(),
          leftKnee: new THREE.Group(),
          rightKnee: new THREE.Group()
        }
      }
    }
  };
}

// =========================================================================
// [Group 1] Personality Profiles across 4 Grids
// =========================================================================
console.log('\n[Group 1] Verifying 4 Arbiter Personality Configurations...');

// Grid 01: Sentinel
const sentinelCfg = ARBITER_CONFIGS.level_01_06;
assert.strictEqual(sentinelCfg.personality, 'SENTINEL');
assert.strictEqual(sentinelCfg.maxShields, 2);
assert.strictEqual(sentinelCfg.difficultyLevel, 6);
assert(sentinelCfg.chargeWeight >= 0.75, 'Sentinel must have high charge weight');

// Grid 02: Sailmaster
const sailmasterCfg = ARBITER_CONFIGS.level_02_07;
assert.strictEqual(sailmasterCfg.personality, 'SAILMASTER');
assert.strictEqual(sailmasterCfg.maxShields, 3);
assert.strictEqual(sailmasterCfg.difficultyLevel, 7);
assert.strictEqual(sailmasterCfg.speed, 14.0, 'Sailmaster must possess high speed (14 m/s)');
assert(sailmasterCfg.aerialWeight >= 0.85, 'Sailmaster must have high aerial weight');

// Grid 03: Leviathan
const leviathanCfg = ARBITER_CONFIGS.level_03_07;
assert.strictEqual(leviathanCfg.personality, 'LEVIATHAN');
assert.strictEqual(leviathanCfg.maxShields, 3);
assert.strictEqual(leviathanCfg.difficultyLevel, 8);
assert(leviathanCfg.bankWeight >= 0.85, 'Leviathan must have high bank shot weight');

// Grid 04: Master Control
const masterControlCfg = ARBITER_CONFIGS.level_04_08;
assert.strictEqual(masterControlCfg.personality, 'MASTER_CONTROL');
assert.strictEqual(masterControlCfg.maxShields, 4);
assert.strictEqual(masterControlCfg.difficultyLevel, 10);
assert(masterControlCfg.chargeWeight >= 0.95 && masterControlCfg.aerialWeight >= 0.95 && masterControlCfg.bankWeight >= 0.95);

console.log('✓ 4 Arbiter personality configurations verified cleanly');

// =========================================================================
// [Group 2] Sentinel Arbiter Heavy Bulwark & Charged Throws
// =========================================================================
console.log('\n[Group 2] Testing Sentinel Bulwark Charged Volley...');

const sentinelFoe = createMockFoe(0, -25);
const sentinelBoss = new ArbiterBossController(sentinelFoe, 'level_01_06');
const mockPlayer = { pos: new THREE.Vector3(0, 0, 0) };

let sentinelFiredCharge = 0;
sentinelBoss.on('volley_disc_fired', (e) => {
  if (e.charge > 0) sentinelFiredCharge = e.charge;
});

// Force volley start
sentinelBoss._startVolley();
assert.strictEqual(sentinelBoss.isFiringVolley, true);

// Step until volley disc is fired
sentinelBoss.update(0.016, mockPlayer, [], (origin, vel, owner, color, curve, charge) => {
  assert(charge >= 0.85, `Sentinel first volley disc must be charged >= 85% (got ${charge})`);
});

assert(sentinelFiredCharge >= 0.85, 'Sentinel must emit charged volley disc');
console.log('✓ Sentinel charged guard-crush throw verified');

// =========================================================================
// [Group 3] Sailmaster Agile Aerialist Apex Jumps
// =========================================================================
console.log('\n[Group 3] Testing Sailmaster Aerial Jump Evasion...');

const sailmasterFoe = createMockFoe(0, -20);
const sailmasterBoss = new ArbiterBossController(sailmasterFoe, 'level_02_07');

let jumpTriggered = false;
sailmasterBoss.on('aerial_jump', (e) => {
  jumpTriggered = true;
  assert(e.vy > 10, 'Jump impulse must elevate boss');
});

// Run steps to trigger aerial jump
const origRandom = Math.random;
Math.random = () => 0.01;
for (let i = 0; i < 60; i++) {
  sailmasterBoss.update(0.016, mockPlayer, []);
  if (jumpTriggered) break;
}
Math.random = origRandom;
assert.strictEqual(jumpTriggered, true, 'Sailmaster must execute aerial jump maneuvers');
console.log('✓ Sailmaster agile aerial jumping verified');

// =========================================================================
// [Group 4] Leviathan Geometric Wall-Bank Volley
// =========================================================================
console.log('\n[Group 4] Testing Leviathan Geometric Wall-Bank Volleys...');

const leviathanFoe = createMockFoe(0, -20);
const leviathanBoss = new ArbiterBossController(leviathanFoe, 'level_03_07');

let bankVolleyFired = false;
leviathanBoss._startVolley();
leviathanBoss.update(0.016, mockPlayer, [], (origin, vel, owner, color, curve, charge) => {
  bankVolleyFired = true;
  // In bank shots, aimDir is reflected off perimeter walls, so curve is set to 0
  assert.strictEqual(curve, 0, 'Leviathan bank shot must use straight specular trajectory');
});

assert.strictEqual(bankVolleyFired, true, 'Leviathan must fire geometric bank volley');
console.log('✓ Leviathan geometric bank-shot volley verified');

// =========================================================================
// [Group 5] Master Control Level 10 Apex AI & Adaptive Counters
// =========================================================================
console.log('\n[Group 5] Testing Master Control Level 10 Adaptive Counters & Phase Transitions...');

const mcFoe = createMockFoe(0, -20);
const mcBoss = new ArbiterBossController(mcFoe, 'level_04_08');

// 1. Frame-perfect parry against standard incoming disc
let parryRaised = false;
mcBoss.on('parry_raised', () => { parryRaised = true; });

const standardDisc = {
  pos: new THREE.Vector3(0, 1.5, -21.8),
  vel: new THREE.Vector3(0, 0, 30), // heading straight at MC
  charge: 0.1,
  owner: 'player'
};

mcBoss.update(0.016, mockPlayer, [standardDisc]);
assert.strictEqual(parryRaised, true, 'Master Control must frame-perfect parry standard throw');
assert.strictEqual(mcFoe.blocking, true, 'Master Control must enter blocking stance');

// 2. Adaptive counter against charged guard crush disc -> NEVER parry, ALWAYS dash evade!
mcBoss.foe.shieldCd = 0;
mcBoss.foe.blocking = false;
mcBoss.dashTimer = 0;
let dashEvaded = false;
mcBoss.on('evaded', () => { dashEvaded = true; });

const crushDisc = {
  pos: new THREE.Vector3(0, 1.5, -23.0),
  vel: new THREE.Vector3(0, 0, 36),
  charge: 0.95, // Guard crush!
  owner: 'player'
};

mcBoss.update(0.016, mockPlayer, [crushDisc]);
assert.strictEqual(dashEvaded, true, 'Master Control must dash-evade incoming guard crush');
assert.strictEqual(mcBoss.isDashing, true, 'Boss must be actively dashing');
assert.strictEqual(mcFoe.blocking, false, 'Boss must not attempt to block guard crush');

// 3. Minion Subroutine Summoning upon Shield Depletion
let minionSummoned = false;
mcBoss.on('summon_minions', (e) => {
  minionSummoned = true;
  assert.strictEqual(e.count, 2, 'Must summon 2 minion subroutines');
});

// Reset invulnerability after dash
mcBoss.invulnerableTimer = 0;
mcBoss.isDashing = false;

// Deplete all 4 shields
mcBoss.onHit(50);
mcBoss.onHit(50);
mcBoss.onHit(50);
mcBoss.onHit(50);
assert.strictEqual(mcBoss.currentShields, 0, 'Shields must be fully depleted');

// Update frame after shield collapse
mcBoss.update(0.016, mockPlayer, []);
assert.strictEqual(minionSummoned, true, 'Master Control must summon minion subroutines in Phase 2');

console.log('✓ Master Control Level 10 adaptive counters and phase transitions verified');

// =========================================================================
// [Group 6] Update Loop Decoupling from updateDuelFoe
// =========================================================================
console.log('\n[Group 6] Verifying Decoupling of Arbiter from updateDuelFoe...');

state.foes = [];
state.gameMode = 'campaign';
state.countdownTimer = 0;

let bossUpdateCalled = false;
const decoupledFoe = createMockFoe(0, -28);
decoupledFoe.bossController = {
  update: () => {
    bossUpdateCalled = true;
  }
};
state.foes.push(decoupledFoe);

// Run updateFoes
updateFoes(0.016);

assert.strictEqual(bossUpdateCalled, true, 'updateFoes must invoke f.bossController.update()');
// Ensure decoupledFoe did not have duel state set by updateDuelFoe
assert.strictEqual(decoupledFoe.state, undefined, 'Arbiter must not have updateDuelFoe state machine attached');

console.log('✓ Arbiter update loop decoupling verified cleanly');

console.log('\n======================================================');
console.log('ALL ARBITER PERSONALITY TESTS PASSED (100% SUCCESS)');
console.log('======================================================');
