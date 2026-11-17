/**
 * test/ai/bot_combat_brain.test.js
 * Unit and mathematical validation test suite for BotCombatBrain & 10-Level Capability Ladder.
 */

import assert from 'assert';
import * as THREE from '../../vendor/three.module.js';
import {
  BotCombatBrain,
  BOT_CAPABILITIES,
  CAPABILITY_MATRIX,
  CAPABILITY_MIN_LEVELS
} from '../../src/ai/BotCombatBrain.js';

console.log('--- Running Bot Combat Brain & Capability Ladder Test Suite ---');

// =========================================================================
// [Group 1] Capability Matrix & Ladder Unlock Verification (Levels 1 to 10)
// =========================================================================
console.log('\n[Group 1] Testing Capability Matrix across Difficulty Levels 1-10...');

// Level 1: Baseline Aim Lead only
const brainL1 = new BotCombatBrain(1);
assert.strictEqual(brainL1.canLeadAim(), true, 'Level 1 must have AIM_LEAD');
assert.strictEqual(brainL1.canSeekCover(), false, 'Level 1 must not seek cover');
assert.strictEqual(brainL1.canCurve(), false, 'Level 1 must not curve throw');
assert.strictEqual(brainL1.canParry(), false, 'Level 1 must not parry');
assert.strictEqual(brainL1.canCharge(), false, 'Level 1 must not charge throw');
assert.strictEqual(brainL1.canBank(), false, 'Level 1 must not bank ricochet');
assert.strictEqual(brainL1.canAdaptiveCounter(), false, 'Level 1 must not adaptive counter');

// Level 2: Cover Seek unlocked, combat techniques locked
const brainL2 = new BotCombatBrain(2);
assert.strictEqual(brainL2.canLeadAim(), true);
assert.strictEqual(brainL2.canSeekCover(), true, 'Level 2 unlocks COVER_SEEK');
assert.strictEqual(brainL2.canCurve(), false, 'Level 2 curve throws must be locked');
assert.strictEqual(brainL2.canParry(), false, 'Level 2 parry defense must be locked');
assert.strictEqual(brainL2.canCharge(), false, 'Level 2 charged throws must be locked');

// Level 3: Jump Evade unlocked
const brainL3 = new BotCombatBrain(3);
assert.strictEqual(brainL3.canJumpEvade(), true, 'Level 3 unlocks JUMP_EVADE');
assert.strictEqual(brainL3.canDash(), false, 'Level 3 dash must be locked');

// Level 4: Lateral Dash unlocked
const brainL4 = new BotCombatBrain(4);
assert.strictEqual(brainL4.canDash(), true, 'Level 4 unlocks LATERAL_DASH');
assert.strictEqual(brainL4.canParry(), false, 'Level 4 parry must be locked');
assert.strictEqual(brainL4.canCharge(), false, 'Level 4 charge must be locked');

// Level 5: Player-parity combat techniques unlocked (Curve, Parry, Charge)
const brainL5 = new BotCombatBrain(5);
assert.strictEqual(brainL5.canCurve(), true, 'Level 5 unlocks CURVE_THROW');
assert.strictEqual(brainL5.canParry(), true, 'Level 5 unlocks PARRY_DEFENSE');
assert.strictEqual(brainL5.canCharge(), true, 'Level 5 unlocks CHARGED_THROW');
assert.strictEqual(brainL5.canBank(), false, 'Level 5 bank ricochet must be locked');

// Level 6: Wall-Bank Ricochet unlocked
const brainL6 = new BotCombatBrain(6);
assert.strictEqual(brainL6.canBank(), true, 'Level 6 unlocks BANK_RICOCHET');
assert.strictEqual(brainL6.canAerialCombat(), false, 'Level 6 aerial combat must be locked');

// Level 7: Aerial Combat unlocked
const brainL7 = new BotCombatBrain(7);
assert.strictEqual(brainL7.canAerialCombat(), true, 'Level 7 unlocks AERIAL_COMBAT');
assert.strictEqual(brainL7.canAdaptiveCounter(), false, 'Level 7 adaptive counter must be locked');

// Level 10: Apex Master Control with Adaptive Counter
const brainL10 = new BotCombatBrain(10);
assert.strictEqual(brainL10.canAdaptiveCounter(), true, 'Level 10 unlocks ADAPTIVE_COUNTER');
const l10Caps = brainL10.getCapabilities();
assert.strictEqual(l10Caps.length, 10, 'Level 10 must have all 10 capabilities');

console.log('✓ Capability Matrix and gates 1-10 verified cleanly');

// =========================================================================
// [Group 2] Entity Difficulty Resolution
// =========================================================================
console.log('\n[Group 2] Testing Entity Difficulty Resolution...');

assert.strictEqual(BotCombatBrain.resolveDifficulty(1), 1);
assert.strictEqual(BotCombatBrain.resolveDifficulty(10), 10);
assert.strictEqual(BotCombatBrain.resolveDifficulty(15), 10, 'Clamps upper bound');
assert.strictEqual(BotCombatBrain.resolveDifficulty(-3), 1, 'Clamps lower bound');

// Bot object with difficultyLevel
assert.strictEqual(BotCombatBrain.resolveDifficulty({ difficultyLevel: 7 }), 7);

// Bot object with skill float
assert.strictEqual(BotCombatBrain.resolveDifficulty({ skill: 0.0 }), 1);
assert.strictEqual(BotCombatBrain.resolveDifficulty({ skill: 1.0 }), 10);
assert.strictEqual(BotCombatBrain.canParry({ skill: 0.9 }), true);
assert.strictEqual(BotCombatBrain.canParry({ skill: 0.1 }), false);

// Arbiter Boss entities
assert.strictEqual(BotCombatBrain.resolveDifficulty({ isArbiter: true, gridId: 'grid_01' }), 6);
assert.strictEqual(BotCombatBrain.resolveDifficulty({ isArbiter: true, gridId: 'grid_04' }), 10);
assert.strictEqual(BotCombatBrain.canAdaptiveCounter({ isArbiter: true, gridId: 'grid_04' }), true);

console.log('✓ Entity difficulty resolution verified cleanly');

// =========================================================================
// [Group 3] 2D Geometric Specular Wall-Bank Reflection Solver
// =========================================================================
console.log('\n[Group 3] Testing 2D Specular Wall-Bank Ray Reflection Mathematics...');

const arenaLim = 44.5;
const fromPos = { x: 0, z: 0 };
const toPos = { x: 0, z: -20 };

const out = {};
const result = BotCombatBrain.calculateBankShot(fromPos, toPos, out, {
  arenaLim,
  preferredWall: 'RIGHT',
  checkObstacles: false
});

assert.strictEqual(result.valid, true, 'Bank shot should find valid solution in empty arena');
assert(result.bouncePoint instanceof THREE.Vector3, 'Bounce point must be a Vector3');
assert(result.aimDir instanceof THREE.Vector3, 'AimDir must be a Vector3');
assert(result.reflectedDir instanceof THREE.Vector3, 'ReflectedDir must be a Vector3');

// Symmetrical shot from (0,0) to (0,-20)
// Reflecting off RIGHT wall (X = 44.5):
// Virtual image of target (0, -20) across X = 44.5 is (89, -20).
// Ray from (0,0) to (89, -20):
// t = 44.5 / 89 = 0.5.
// z = 0 + 0.5 * (-20 - 0) = -10.
// So bounce point must be at X = 44.5, Z = -10 (or -44.5, -10 for LEFT wall).
const bounceX = Math.abs(result.bouncePoint.x);
const bounceZ = result.bouncePoint.z;
assert(Math.abs(bounceX - arenaLim) < 1e-3, `Bounce point X must be at arena wall (got ${bounceX})`);
assert(Math.abs(bounceZ - (-10)) < 1e-3, `Bounce point Z must be at midpoint -10 (got ${bounceZ})`);

// Validate specular reflection condition:
// Incident vector: (bouncePoint - fromPos)
const incX = result.bouncePoint.x - fromPos.x;
const incZ = result.bouncePoint.z - fromPos.z;
// Reflected vector pointing from bouncePoint to toPos:
const reflX = toPos.x - result.bouncePoint.x;
const reflZ = toPos.z - result.bouncePoint.z;

// Angle of incidence with wall normal: normal on RIGHT wall is (-1, 0)
// dx is negated, dz is preserved!
assert.strictEqual(Math.sign(incX), -Math.sign(reflX), 'X velocity must reverse direction on vertical wall bounce');
assert.strictEqual(Math.sign(incZ), Math.sign(reflZ), 'Z velocity must preserve direction on vertical wall bounce');

// Distance calculation
const expectedDist = Math.hypot(result.bouncePoint.x - fromPos.x, result.bouncePoint.z - fromPos.z) +
                     Math.hypot(toPos.x - result.bouncePoint.x, toPos.z - result.bouncePoint.z);
assert(Math.abs(result.totalDist - expectedDist) < 1e-3, 'Total distance calculation must match geometry');

console.log('✓ Specular reflection mathematics verified cleanly');

// =========================================================================
// [Group 4] Bank-Shot Obstacle Occlusion & Clearance
// =========================================================================
console.log('\n[Group 4] Testing Bank-Shot Obstacle Occlusion...');

// Place obstacles blocking right wall bounce (X = 44.5, Z = -10) and bottom wall (Z = -44.5)
const blockedPillars = [
  { x: 30, z: -7, r: 2.0 }, // blocks ray to right wall
  { x: 0, z: -30, r: 2.1 }  // blocks ray to bottom wall
];

const obstructedResult = BotCombatBrain.calculateBankShot(fromPos, toPos, {}, {
  arenaLim,
  checkObstacles: true,
  obstacles: blockedPillars
});

assert.strictEqual(obstructedResult.valid, true, 'Should find alternative wall (LEFT) when RIGHT wall is blocked');
assert.strictEqual(obstructedResult.wall, 'LEFT', 'Must select unblocked LEFT wall');
assert(obstructedResult.bouncePoint.x < 0, 'Must bounce off negative X boundary');

// Block both LEFT and RIGHT walls
const doubleBlockedPillars = [
  { x: 30, z: -7, r: 2.0 },
  { x: -30, z: -7, r: 2.0 }
];
const topOrBottomResult = BotCombatBrain.calculateBankShot(fromPos, toPos, {}, {
  arenaLim,
  checkObstacles: true,
  obstacles: doubleBlockedPillars
});
// When X walls are blocked, it either finds TOP/BOTTOM or marks invalid
if (topOrBottomResult.valid) {
  assert(topOrBottomResult.wall === 'TOP' || topOrBottomResult.wall === 'BOTTOM');
}

console.log('✓ Obstacle occlusion and alternative path selection verified');

// =========================================================================
// [Group 5] Rear Hemisphere Strike Detection & Allocation-Free Re-use
// =========================================================================
console.log('\n[Group 5] Testing Rear Strike Detection & In-Place Scratch Re-use...');

// Target at (0, -20) facing toward bottom wall (0, -1)
// Bank shot arriving from bottom wall (0, -44.5) travels in +Z direction toward target at (0, -20)
// Since target is looking toward the incoming disc (facing -Z), this strikes the front hemisphere.
const facingBottomWall = { x: 0, z: -1 };
const frontCheck = BotCombatBrain.calculateBankShot(fromPos, toPos, out, {
  arenaLim,
  checkObstacles: false,
  targetFacing: facingBottomWall
});
assert.strictEqual(frontCheck.isRearStrike, false, 'Should detect front strike when target faces incoming disc');

// Target facing along positive Z (0, 1) - looking away from bottom wall
// Disc arriving from bottom wall strikes target from behind!
const facingArenaCenter = { x: 0, z: 1 };
const rearCheck = BotCombatBrain.calculateBankShot(fromPos, toPos, out, {
  arenaLim,
  checkObstacles: false,
  targetFacing: facingArenaCenter
});
assert.strictEqual(rearCheck.isRearStrike, true, 'Should detect rear hemisphere strike when disc strikes from behind');

// Check that the exact same out object was mutated in place (zero garbage)
assert.strictEqual(rearCheck, out, 'calculateBankShot must return the passed in outResult object');
assert.strictEqual(out.isRearStrike, true);

console.log('✓ Rear strike detection and allocation-free memory re-use verified');

console.log('\n======================================================');
console.log('ALL BOT COMBAT BRAIN TESTS PASSED (100% SUCCESS)');
console.log('======================================================');
