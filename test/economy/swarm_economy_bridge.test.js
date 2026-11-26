/**
 * test_swarm_economy_bridge.test.js
 * Unit and integration tests for SwarmEconomyBridge (SPEC-ACHIEVE-001).
 */

import assert from 'assert';
import {
  SwarmEconomyBridge,
  SWARM_ECONOMY_CONFIG,
  SwarmEconomyEvents
} from '../../src/modes/SwarmEconomyBridge.js';
import { StorageManager } from '../../src/core/storage/StorageManager.js';
import { EconomyManager } from '../../src/core/economy/EconomyManager.js';

console.log('--- Running SwarmEconomyBridge Test Suite ---');

// Mock in-memory test setup
function createTestEnvironment(initialWaveRecord = 1) {
  const testStorage = new StorageManager({
    storageKey: `tron_test_swarm_${Date.now()}_${Math.random()}`,
    backupKey: `tron_test_swarm_${Date.now()}_${Math.random()}.bak`,
    debounceMs: 10
  });
  testStorage.load();
  testStorage.set('stats.swarmHighestWave', initialWaveRecord);
  testStorage.set('player.currency.bits', 0);
  testStorage.set('player.xp', 0);

  const testEconomy = new EconomyManager({ storage: testStorage });
  const bridge = new SwarmEconomyBridge({
    storage: testStorage,
    economy: testEconomy
  });

  return { testStorage, testEconomy, bridge };
}

// Group 1: Deterministic Math Calculations
console.log('\n[Group 1] Testing Wave Payout & Streak Scaling Math...');

const { bridge: testBridge } = createTestEnvironment();

// Wave 1, streak 1 (Standard Swarm: 5 AC / 20 XP base)
const p1 = testBridge.calculateWavePayout(1, 1);
assert.strictEqual(p1.wave, 1);
assert.strictEqual(p1.streak, 1);
assert.strictEqual(p1.waveCredits, 5, 'Base yield for wave 1 must be 5 AC');
assert.strictEqual(p1.waveXP, 20);
assert.strictEqual(p1.isMilestone, false);
assert.strictEqual(p1.totalCredits, 5);
assert.strictEqual(p1.totalXP, 20);

// Wave 3, streak 3: streakMultiplier = 1 + (2 * 0.10) = 1.20 -> floor(5 * 1.20) = 6 AC, floor(20 * 1.20) = 24 XP
const p3 = testBridge.calculateWavePayout(3, 3);
assert.strictEqual(p3.waveCredits, 6);
assert.strictEqual(p3.waveXP, 24);
assert.strictEqual(p3.isMilestone, false);

// Wave 5, streak 5: Milestone chest unlocked!
// Base wave: floor(5 * 1.40) = 7 AC, floor(20 * 1.40) = 28 XP
// Milestone chest tier 1: 50 AC, 150 XP
const p5 = testBridge.calculateWavePayout(5, 5);
assert.strictEqual(p5.isMilestone, true);
assert.strictEqual(p5.tier, 1);
assert.strictEqual(p5.milestoneCredits, 50);
assert.strictEqual(p5.milestoneXP, 150);
assert.strictEqual(p5.totalCredits, p5.waveCredits + 50);
assert.strictEqual(p5.totalXP, p5.waveXP + 150);

// Wave 10, streak 10: Milestone chest tier 2: 100 AC, 300 XP
const p10 = testBridge.calculateWavePayout(10, 10);
assert.strictEqual(p10.isMilestone, true);
assert.strictEqual(p10.tier, 2);
assert.strictEqual(p10.milestoneCredits, 100);
assert.strictEqual(p10.milestoneXP, 300);

// Wave 16+, streak 16: Capped at 2.5x multiplier (floor(5 * 2.5) = 12 AC, floor(20 * 2.5) = 50 XP)
const p20 = testBridge.calculateWavePayout(20, 20);
assert.strictEqual(p20.streakMultiplier, 2.5);
assert.strictEqual(p20.waveCredits, 12);
assert.strictEqual(p20.waveXP, 50);
assert.strictEqual(p20.milestoneCredits, 200);
assert.strictEqual(p20.milestoneXP, 600);

// Hardcore Swarm Math: 0 AC, 65 XP base (capped at 2.5x), Sparks milestones
const hc1 = testBridge.calculateWavePayout(1, 1, { isHardcore: true });
assert.strictEqual(hc1.totalCredits, 0);
assert.strictEqual(hc1.waveXP, 65);
assert.strictEqual(hc1.totalSparks, 0);

const hc5 = testBridge.calculateWavePayout(5, 5, { isHardcore: true });
assert.strictEqual(hc5.totalCredits, 0);
assert.strictEqual(hc5.milestoneSparks, 1);
assert.strictEqual(hc5.milestoneXP, 200);

const hc10 = testBridge.calculateWavePayout(10, 10, { isHardcore: true });
assert.strictEqual(hc10.milestoneSparks, 2);
assert.strictEqual(hc10.milestoneXP, 400);

const hc15 = testBridge.calculateWavePayout(15, 15, { isHardcore: true });
assert.strictEqual(hc15.milestoneSparks, 3);
assert.strictEqual(hc15.milestoneXP, 600);

const hc20 = testBridge.calculateWavePayout(20, 20, { isHardcore: true });
assert.strictEqual(hc20.streakMultiplier, 2.5);
assert.strictEqual(hc20.waveXP, Math.floor(65 * 2.5));
assert.strictEqual(hc20.milestoneSparks, 5);
assert.strictEqual(hc20.milestoneXP, 1000);

const hc30 = testBridge.calculateWavePayout(30, 30, { isHardcore: true });
assert.strictEqual(hc30.milestoneSparks, 10);
assert.strictEqual(hc30.milestoneXP, 2000);

console.log('✓ Wave payout math, compound streak scaling, and milestone chests verified');

// Group 2: Wave Processing, Economy Crediting & Event Emission
console.log('\n[Group 2] Testing Wave Processing & Economy Integration...');

const { testStorage, testEconomy, bridge } = createTestEnvironment(3);

let payoutEvents = [];
let milestoneEvents = [];
let recordEvents = [];

bridge.on(SwarmEconomyEvents.WAVE_PAYOUT, (e) => payoutEvents.push(e));
bridge.on(SwarmEconomyEvents.MILESTONE_CHEST_UNLOCKED, (e) => milestoneEvents.push(e));
bridge.on(SwarmEconomyEvents.SURVIVAL_RECORD_UPDATED, (e) => recordEvents.push(e));

// Complete wave 1 (lower than record of 3)
const res1 = bridge.processWaveCompletion(1, { isHardcore: false });
assert.strictEqual(res1.success, true);
assert.strictEqual(res1.streak, 1);
assert.strictEqual(res1.newRecord, false);
assert.strictEqual(testEconomy.getCredits(), 5);
assert.strictEqual(payoutEvents.length, 1);
assert.strictEqual(milestoneEvents.length, 0);
assert.strictEqual(recordEvents.length, 0);
assert.strictEqual(testStorage.get('stats.swarmHighestWave'), 3, 'Record should not change when wave < record');

// Complete wave 2
bridge.processWaveCompletion(2);
assert.strictEqual(bridge.streak, 2);
assert.strictEqual(testStorage.get('stats.swarmHighestWave'), 3);

// Complete wave 4 (exceeds record of 3 -> new record!)
const res4 = bridge.processWaveCompletion(4);
assert.strictEqual(res4.newRecord, true);
assert.strictEqual(recordEvents.length, 1);
assert.strictEqual(recordEvents[0].newRecord, 4);
assert.strictEqual(testStorage.get('stats.swarmHighestWave'), 4);
assert.strictEqual(testStorage.get('stats.highestWave'), 4);

// Complete wave 5 (Milestone chest!)
const res5 = bridge.processWaveCompletion(5, { isHardcore: false });
assert.strictEqual(res5.newRecord, true);
assert.strictEqual(res5.payout.isMilestone, true);
assert.strictEqual(milestoneEvents.length, 1);
assert.strictEqual(milestoneEvents[0].wave, 5);
assert.strictEqual(milestoneEvents[0].tier, 1);
assert.strictEqual(testStorage.get('stats.swarmHighestWave'), 5);

// Hardcore Swarm processing: awards Sparks and records stats.hardcoreSwarmHighestWave
const hcEnv = createTestEnvironment(1);
const hcRes5 = hcEnv.bridge.processWaveCompletion(5, { isHardcore: true });
assert.strictEqual(hcRes5.isHardcore, true);
assert.strictEqual(hcRes5.newRecord, true);
assert.strictEqual(hcRes5.payout.totalCredits, 0);
assert.strictEqual(hcEnv.testEconomy.getCredits(), 50, '265 XP triggers Level 2 milestone (+50 AC)');
assert.strictEqual(hcEnv.testEconomy.getSparks(), 1);
assert.strictEqual(hcEnv.testStorage.get('stats.hardcoreSwarmHighestWave'), 5);
assert.strictEqual(hcEnv.testStorage.get('stats.swarmHighestWave'), 1, 'Hardcore wave must not overwrite standard swarmHighestWave');

console.log('✓ Economy crediting, milestone event dispatch, and record updating verified');

// Group 3: Streak Resetting
console.log('\n[Group 3] Testing Streak Resetting...');

assert.strictEqual(bridge.streak, 4);
bridge.resetStreak();
assert.strictEqual(bridge.streak, 0);

// Next completion starts streak at 1
const resAfterReset = bridge.processWaveCompletion(1);
assert.strictEqual(resAfterReset.streak, 1);
assert.strictEqual(resAfterReset.payout.streak, 1);

console.log('✓ Streak reset verified cleanly');

console.log('\n======================================================');
console.log('ALL SWARM ECONOMY BRIDGE TESTS PASSED (100% SUCCESS)');
console.log('======================================================');
