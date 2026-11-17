/**
 * test/combat/bot_parry_guard_crush.test.js
 * Unit and integration test suite for Bot Parry Defense, Guard Crush Penetration,
 * Whiff Recovery Windows, and Ping-Pong Rally Deflections.
 */

import assert from 'assert';
import * as THREE from '../../vendor/three.module.js';
import { state } from '../../src/core/state.js';
import { config } from '../../src/core/config.js';
import { spawnDisc, updateDiscs, applyDamageToTarget } from '../../src/entities/Disc.js';
import { BotCombatBrain } from '../../src/ai/BotCombatBrain.js';

console.log('--- Running Bot Parry Defense & Guard Crush Test Suite ---');

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
    yaw: 0, // facing -Z: (0, 0, -1)
    parryTimer: 0,
    blocking: false,
    shieldCd: 0
  };
}

// =========================================================================
// [Group 1] Bot Frontal Parry Interception & Deflection
// =========================================================================
console.log('\n[Group 1] Testing Bot Frontal Parry Interception...');
resetTestState();

// Bot at (0, 0, -10), facing +Z towards player at (0, 0, 0)
// rotation.y = 0 -> facing (0, 0, 1)
const parryBot = {
  pos: new THREE.Vector3(0, 0, -10),
  y: 0,
  vel: new THREE.Vector3(),
  hp: 200,
  maxHp: 200,
  alive: true,
  hasDisc: true,
  difficultyLevel: 6, // Level 6 unlocks PARRY_DEFENSE
  shieldCd: 0,
  hurt: 0,
  obj: {
    rotation: { y: 0 },
    position: new THREE.Vector3(0, 0, -10),
    userData: { backDisc: { visible: true } }
  }
};
state.foes.push(parryBot);

// Spawn direct player disc launched toward bot at (0, 0, -10)
// Disc at (0, 1.5, -8.2), velocity (0, 0, -30) -> distance to bot center is 1.8m <= 2.2m
const playerDisc = spawnDisc(
  new THREE.Vector3(0, 1.5, -8.2),
  new THREE.Vector3(0, 0, -30),
  'player',
  config.CYAN,
  0,
  0.2 // low charge (20%) -> does NOT trigger guard crush
);

const initialSpeed = playerDisc.vel.length();
updateDiscs(0.016);

assert.strictEqual(playerDisc.owner, parryBot, 'Disc owner must transfer to parry bot');
assert.strictEqual(playerDisc.isDeflected, true, 'Disc must be marked as deflected');
assert.strictEqual(parryBot.blocking, true, 'Bot must enter blocking stance');
assert(parryBot.shieldCd > 0.5, `Bot must receive shield cooldown (got ${parryBot.shieldCd})`);
assert(playerDisc.vel.length() >= initialSpeed * 1.25, `Deflected speed must scale by at least 1.25x (was ${initialSpeed}, now ${playerDisc.vel.length()})`);
assert(playerDisc.vel.z > 0, 'Deflected disc velocity must point back toward player (+Z)');
assert.strictEqual(state.lastCombatEvent, 'DEFLECTED');

console.log('✓ Bot frontal parry interception and 1.25x deflection verified');

// =========================================================================
// [Group 2] Bot Parry Whiff Window on Flank / Rear Approaches
// =========================================================================
console.log('\n[Group 2] Testing Bot Parry Whiff Window on Flank / Rear Strikes...');
resetTestState();

// Bot at (0, 0, -10) facing -Z (looking away from player towards arena wall)
// rotation.y = Math.PI -> facing (0, 0, -1)
const flankingBot = {
  pos: new THREE.Vector3(0, 0, -10),
  y: 0,
  vel: new THREE.Vector3(),
  hp: 200,
  maxHp: 200,
  alive: true,
  hasDisc: true,
  difficultyLevel: 7,
  shieldCd: 0,
  hurt: 0,
  obj: {
    rotation: { y: Math.PI }, // facing away from incoming disc
    position: new THREE.Vector3(0, 0, -10),
    userData: { backDisc: { visible: true } }
  }
};
state.foes.push(flankingBot);

// Player disc approaching from (0, 1.5, -8.2) traveling -Z
const flankDisc = spawnDisc(
  new THREE.Vector3(0, 1.5, -8.2),
  new THREE.Vector3(0, 0, -30),
  'player',
  config.CYAN,
  0,
  0.0
);

// Frame 1: Disc enters threat radius and physical impact
const hpBeforeHit = flankingBot.hp;
updateDiscs(0.016);

// Parry fails due to facingDot <= 0.35, bot incurs 0.8s whiff cooldown and takes full unparried damage!
assert.strictEqual(flankDisc.owner, 'player', 'Player should remain disc owner when bot whiffs');
assert(flankingBot.shieldCd >= 0.75, `Bot must incur 0.8s whiff cooldown (got ${flankingBot.shieldCd})`);
assert.strictEqual(flankingBot.blocking || false, false, 'Bot should not successfully block');
assert(flankingBot.hp < hpBeforeHit, 'Bot should take full damage from unparried rear strike');
assert(flankingBot.hurt > 0, 'Bot should enter hurt state');

console.log('✓ Bot parry whiff cooldown and vulnerability on flank strike verified');

// =========================================================================
// [Group 3] Guard Crush Shattering against Blocking Bots (Charge >= 85%)
// =========================================================================
console.log('\n[Group 3] Testing Guard Crush Shattering on Charged Throws (>= 85%)...');
resetTestState();

// Bot at (0, 0, -10) facing incoming disc (0, 0, 1)
const blockingBot = {
  pos: new THREE.Vector3(0, 0, -10),
  y: 0,
  vel: new THREE.Vector3(),
  hp: 200,
  maxHp: 200,
  alive: true,
  hasDisc: true,
  difficultyLevel: 8,
  shieldCd: 0,
  hurt: 0,
  obj: {
    rotation: { y: 0 },
    position: new THREE.Vector3(0, 0, -10),
    userData: { backDisc: { visible: true } }
  }
};
state.foes.push(blockingBot);

// High-charge throw: charge = 0.90 (90%) >= 85% guard crush threshold
const chargedDisc = spawnDisc(
  new THREE.Vector3(0, 1.5, -8.2),
  new THREE.Vector3(0, 0, -36),
  'player',
  config.WHITE,
  0,
  0.90
);

const hpBeforeCrush = blockingBot.hp;
updateDiscs(0.016);

assert.strictEqual(state.lastCombatEvent, 'GUARD_CRUSH', 'Combat event must be GUARD_CRUSH');
assert.strictEqual(blockingBot.isStaggered, true, 'Bot must enter stagger state');
assert.strictEqual(blockingBot.hurt, 0.8, 'Bot stagger duration must be 0.8s');
assert(blockingBot.shieldCd >= 1.0, 'Bot shield must be locked down (>= 1.0s)');
assert(blockingBot.hp < hpBeforeCrush, `Bot must take full charged damage (was ${hpBeforeCrush}, now ${blockingBot.hp})`);
assert.strictEqual(chargedDisc.returning, true, 'Disc must rebound after crushing guard');

console.log('✓ Guard crush shattering against blocking bots verified');

// =========================================================================
// [Group 4] Escalating Ping-Pong Deflection Rallies
// =========================================================================
console.log('\n[Group 4] Testing Ping-Pong Deflection Rally Speed Escalation...');
resetTestState();

const rallyBot = {
  pos: new THREE.Vector3(0, 0, -15),
  y: 0,
  vel: new THREE.Vector3(),
  hp: 500,
  maxHp: 500,
  alive: true,
  hasDisc: true,
  difficultyLevel: 9,
  shieldCd: 0,
  hurt: 0,
  obj: {
    rotation: { y: 0 }, // facing +Z towards player
    position: new THREE.Vector3(0, 0, -15),
    userData: { backDisc: { visible: true } }
  }
};
state.foes.push(rallyBot);

// 1. Player throws disc at bot
const rallyDisc = spawnDisc(
  new THREE.Vector3(0, 1.5, -13.2),
  new THREE.Vector3(0, 0, -30),
  'player',
  config.CYAN,
  0,
  0.3
);

const speed0 = rallyDisc.vel.length();

// Frame 1: Bot intercepts & parries
updateDiscs(0.016);
assert.strictEqual(rallyDisc.owner, rallyBot);
assert.strictEqual(rallyDisc.rallyHits, 1);
const speed1 = rallyDisc.vel.length();
assert(speed1 >= speed0 * 1.25 - 1e-4, `Rally speed 1 must scale (speed0=${speed0}, speed1=${speed1})`);

// 2. Disc travels back to player at (0, 0, 0)
// Set player to block
state.player.blocking = true;
state.player.hasDisc = true;
state.player.parryTimer = 0.5;
rallyDisc.pos.set(0, 1.5, -1.0); // directly in front of player
rallyDisc.vel.set(0, 0, speed1);

// Frame 2: Player parries disc back to bot
updateDiscs(0.016);
assert.strictEqual(rallyDisc.owner, 'player');
assert.strictEqual(rallyDisc.isDeflected, true);
assert.strictEqual(rallyDisc.rallyHits, 2);
const speed2 = rallyDisc.vel.length();
assert(speed2 >= speed1 * 1.25 - 1e-4, `Rally speed 2 must scale (speed1=${speed1}, speed2=${speed2})`);

// 3. Clear bot shield cooldown so bot can parry again in the rally
rallyBot.shieldCd = 0;
rallyBot.blocking = false;
rallyDisc.pos.set(0, 1.5, -13.2); // back within 2.2m of bot
rallyDisc.vel.set(0, 0, -speed2);

// Frame 3: Bot parries disc a second time
updateDiscs(0.016);
assert.strictEqual(rallyDisc.owner, rallyBot);
assert.strictEqual(rallyDisc.rallyHits, 3);
const speed3 = rallyDisc.vel.length();
assert(speed3 >= speed2 * 1.25 - 1e-4, `Rally speed 3 must scale (speed2=${speed2}, speed3=${speed3})`);

console.log(`✓ 3-hit rally speed escalated: ${speed0.toFixed(1)} -> ${speed1.toFixed(1)} -> ${speed2.toFixed(1)} -> ${speed3.toFixed(1)} m/s`);

console.log('\n======================================================');
console.log('ALL BOT PARRY & GUARD CRUSH TESTS PASSED (100% SUCCESS)');
console.log('======================================================');
