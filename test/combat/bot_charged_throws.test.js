/**
 * test/combat/bot_charged_throws.test.js
 * Test suite verifying Bot throw charge coiling, kinematic integration,
 * charge windups, and guard crushing against blocking players.
 */

import assert from 'assert';
import * as THREE from '../../vendor/three.module.js';
import { state } from '../../src/core/state.js';
import { config } from '../../src/core/config.js';
import { spawnDisc, updateDiscs } from '../../src/entities/Disc.js';
import { updateDuelFoe, updateFoes } from '../../src/entities/Bot.js';
import { BotCombatBrain } from '../../src/ai/BotCombatBrain.js';

console.log('--- Running Bot Charged Throws & Guard Crush Test Suite ---');

function resetTestState() {
  state.discs = [];
  state.foes = [];
  state.gameMode = 'duel_ai';
  state.running = true;
  state.time = 1.0;
  state.player = {
    pos: new THREE.Vector3(0, 0, 0),
    y: 0,
    vel: new THREE.Vector3(0, 0, 0),
    alive: true,
    hp: 100,
    maxHp: 100,
    hasDisc: true,
    yaw: 0,
    parryTimer: 0,
    blocking: false,
    shieldCd: 0
  };
}

// =========================================================================
// [Group 1] Bot Charge Coiling Lifecycle & Throw Release
// =========================================================================
console.log('\n[Group 1] Testing Bot Charge Coiling Lifecycle & Throw Release...');
resetTestState();

const chargingBot = {
  pos: new THREE.Vector3(0, 0, -20),
  y: 0,
  vel: new THREE.Vector3(),
  hp: 200,
  maxHp: 200,
  alive: true,
  hasDisc: true,
  difficultyLevel: 6, // Level 6 unlocks CHARGED_THROW
  cd: 0, // ready to throw
  baseCd: 1.0,
  strafe: 1,
  strafeT: 1.0,
  strafeRate: 1.0,
  hurt: 0,
  skill: 0.9,
  isBoss: true,
  speed: 10.5,
  jumpChance: 0,
  state: 'ATTACK',
  peekDir: 1,
  grounded: true,
  jumps: 0,
  shieldCd: 0,
  obj: {
    rotation: { x: 0, y: 0, z: 0 },
    position: new THREE.Vector3(0, 0, -20),
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
state.foes.push(chargingBot);

// Player is actively blocking -> forces bot with canCharge() to initiate throw charging
state.player.blocking = true;
state.player.parryTimer = 1.0;

// Frame 1: Bot evaluates attack and initiates charge coiling
updateDuelFoe(chargingBot, 0.016);

assert.strictEqual(chargingBot.isChargingThrow, true, 'Bot must enter isChargingThrow state');
assert.strictEqual(chargingBot.throwCharge, 0, 'throwCharge must initialize at 0');
assert.strictEqual(state.discs.length, 0, 'Disc must not be launched during initial charge');

// Frame 2: Accumulate charge duration
updateDuelFoe(chargingBot, 0.016);
assert(chargingBot.chargeDuration > 0, 'chargeDuration must begin accumulating');

// Accumulate charge over 0.9s (simulating windup)
const chargeSteps = Math.ceil(0.9 / 0.016);
for (let s = 0; s < chargeSteps; s++) {
  if (!chargingBot.isChargingThrow) break;
  updateDuelFoe(chargingBot, 0.016);
}

// Check that charged disc was launched!
assert.strictEqual(chargingBot.isChargingThrow, false, 'Charging state must reset upon throw');
assert.strictEqual(chargingBot.hasDisc, false, 'Bot must no longer hold disc');
assert.strictEqual(state.discs.length, 1, 'Charged disc must be spawned');

const launchedDisc = state.discs[0];
assert(launchedDisc.charge >= 0.85, `Spawned disc charge must be >= 85% (got ${launchedDisc.charge})`);
assert(launchedDisc.vel.length() > 28, 'Charged disc must have elevated launch velocity');

console.log(`✓ Bot charge windup coiling and high-charge throw release verified (charge: ${(launchedDisc.charge * 100).toFixed(0)}%)`);

// =========================================================================
// [Group 2] Bot Charged Throw Breaking Player Parry (Guard Crush)
// =========================================================================
console.log('\n[Group 2] Testing Bot Charged Throw Guard-Crushing Blocking Player...');
resetTestState();

// Player blocking at (0, 0, 0)
state.player.blocking = true;
state.player.hasDisc = true;
state.player.parryTimer = 1.0;
state.player.yaw = 0; // facing -Z (0, 0, -1)

const playerHpBefore = state.player.hp;

const dummyFoe = { pos: new THREE.Vector3(0, 0, -20), y: 0, alive: true };
state.foes.push(dummyFoe);

// Bot disc launched with 90% charge heading straight at player's front
const guardCrushDisc = spawnDisc(
  new THREE.Vector3(0, 1.5, -1.0), // directly in front of player
  new THREE.Vector3(0, 0, 36),     // traveling +Z directly into player's shield
  dummyFoe,
  config.ORANGE,
  0,
  0.90 // >= 85% charge
);

// Frame 1: Disc strikes player's blocking shield
updateDiscs(0.016);

assert.strictEqual(state.lastCombatEvent, 'GUARD_CRUSH', 'Combat event must be GUARD_CRUSH');
assert.strictEqual(state.player.blocking, false, 'Player blocking must be shattered');
assert.strictEqual(state.player.parryTimer, 0, 'Player parry timer must be cleared');
assert(state.player.shieldCd >= 1.0, `Player shield must incur cooldown lockout (got ${state.player.shieldCd})`);
assert(state.player.hp < playerHpBefore, `Player must take full charged damage (was ${playerHpBefore}, now ${state.player.hp})`);
assert.strictEqual(guardCrushDisc.owner, dummyFoe, 'Disc must not be deflected to player ownership');

console.log('✓ Bot charged throw breaking player guard verified cleanly');

// =========================================================================
// [Group 3] Interrupting Bot Charge Windup on Hit
// =========================================================================
console.log('\n[Group 3] Testing Interruption of Bot Charge Windup when Hit...');
resetTestState();

const interruptBot = {
  pos: new THREE.Vector3(0, 0, -20),
  y: 0,
  vel: new THREE.Vector3(),
  hp: 200,
  maxHp: 200,
  alive: true,
  hasDisc: true,
  difficultyLevel: 7,
  cd: 0,
  isChargingThrow: true,
  throwCharge: 0.5,
  chargeDuration: 0.5,
  targetChargeTime: 0.9,
  hurt: 0.5, // Bot took damage / staggered!
  obj: {
    rotation: { x: 0, y: 0, z: 0 },
    position: new THREE.Vector3(0, 0, -20),
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
state.foes.push(interruptBot);

// Update frame while hurt
updateDuelFoe(interruptBot, 0.016);

assert.strictEqual(interruptBot.isChargingThrow, false, 'Charge must be canceled when bot is hurt');
assert.strictEqual(interruptBot.throwCharge, 0, 'throwCharge must reset to 0');
assert.strictEqual(interruptBot.chargeDuration, 0, 'chargeDuration must reset to 0');

console.log('✓ Bot charge windup canceled on hit stagger verified');

console.log('\n======================================================');
console.log('ALL BOT CHARGED THROWS TESTS PASSED (100% SUCCESS)');
console.log('======================================================');
