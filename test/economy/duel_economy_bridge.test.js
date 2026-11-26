/**
 * test_duel_economy_bridge.test.js
 * Comprehensive unit and integration test suite for DuelEconomyBridge (SPEC-ACHIEVE-001).
 */

import assert from 'assert';
import {
  DuelEconomyBridge,
  DUEL_PAYOUT_CONFIG,
  DuelEconomyEvents
} from '../../src/modes/DuelEconomyBridge.js';
import { StorageManager } from '../../src/core/storage/StorageManager.js';
import { EconomyManager } from '../../src/core/economy/EconomyManager.js';

console.log('--- Running DuelEconomyBridge Test Suite ---');

function createTestContext() {
  const testStorage = new StorageManager({
    storageKey: `tron_test_duel_${Date.now()}_${Math.random()}`,
    backupKey: `tron_test_duel_${Date.now()}_${Math.random()}.bak`,
    debounceMs: 10
  });
  testStorage.load();
  testStorage.set('player.currency.bits', 0);
  testStorage.set('player.xp', 0);

  const testEconomy = new EconomyManager({ storage: testStorage });
  const indicators = [];
  const mockFloatingFn = (amount, label, opts) => {
    indicators.push({ amount, label, opts });
  };

  const bridge = new DuelEconomyBridge({
    storage: testStorage,
    economy: testEconomy,
    floatingIndicatorFn: mockFloatingFn
  });

  return { testStorage, testEconomy, bridge, indicators };
}

// Group 1: High-Skill Maneuver Rewards
console.log('\n[Group 1] Testing In-Combat High-Skill Maneuver Rewards...');

const ctx1 = createTestContext();
let maneuverEvents = [];
ctx1.bridge.on(DuelEconomyEvents.MANEUVER_REWARD, (evt) => maneuverEvents.push(evt));

// 1. Confirmed Parry (40 XP, 0 AC)
const parryRes = ctx1.bridge.rewardParry();
assert.strictEqual(parryRes.bits, 0);
assert.strictEqual(parryRes.credits, 0);
assert.strictEqual(parryRes.xp, 40);
assert.strictEqual(ctx1.testEconomy.getCredits(), 0);
assert.strictEqual(ctx1.testEconomy.getXP(), 40);
assert.strictEqual(ctx1.indicators.length, 1);
assert.strictEqual(ctx1.indicators[0].amount, 40);
assert.strictEqual(ctx1.indicators[0].label, 'PARRY');
assert.strictEqual(ctx1.indicators[0].opts.isXP, true);
assert.strictEqual(maneuverEvents.length, 1);
assert.strictEqual(maneuverEvents[0].maneuver, 'parry');

// 2. Ricochet Hits
// Bounces < 2: no reward
const noBank = ctx1.bridge.rewardRicochetHit(1);
assert.strictEqual(noBank, null);
assert.strictEqual(ctx1.testEconomy.getCredits(), 0, 'Credits should not increase for < 2 bounces');

// 2 Bounces: 30 XP, 0 AC
const bank2 = ctx1.bridge.rewardRicochetHit(2);
assert.strictEqual(bank2.bits, 0);
assert.strictEqual(bank2.credits, 0);
assert.strictEqual(bank2.xp, 30);
assert.strictEqual(ctx1.testEconomy.getCredits(), 0);
assert.strictEqual(ctx1.indicators.length, 2);
assert.strictEqual(ctx1.indicators[1].amount, 30);
assert.strictEqual(ctx1.indicators[1].label, 'DOUBLE BANK');

// 4 Bounces: 30 + (2 * 10) = 50 XP, 0 AC
const bank4 = ctx1.bridge.rewardRicochetHit(4);
assert.strictEqual(bank4.bits, 0);
assert.strictEqual(bank4.credits, 0);
assert.strictEqual(bank4.xp, 50);
assert.strictEqual(ctx1.testEconomy.getCredits(), 0);
assert.strictEqual(ctx1.indicators.length, 3);
assert.strictEqual(ctx1.indicators[2].amount, 50);
assert.strictEqual(ctx1.indicators[2].label, '4x BANK SHOT');

// 3. Curve Elimination (25 XP, 0 AC)
const curveRes = ctx1.bridge.rewardCurveElimination(0.45);
assert.strictEqual(curveRes.bits, 0);
assert.strictEqual(curveRes.credits, 0);
assert.strictEqual(curveRes.xp, 25);
assert.strictEqual(ctx1.testEconomy.getCredits(), 0);
assert.strictEqual(ctx1.indicators.length, 4);
assert.strictEqual(ctx1.indicators[3].amount, 25);
assert.strictEqual(ctx1.indicators[3].label, 'CURVE FRACTURE');
assert.strictEqual(maneuverEvents.length, 4);

console.log('✓ Confirmed parries, multi-ricochet strikes, and curve eliminations verified');

// Group 2: Match Outcome & AI Practice Session-End Payouts
console.log('\n[Group 2] Testing Duel Match Outcome & AI Practice Session Payouts...');

const ctx2 = createTestContext();
let matchEvents = [];
ctx2.bridge.on(DuelEconomyEvents.MATCH_PAYOUT, (evt) => matchEvents.push(evt));

// AI mid-run victory: suppressed (0 AC, 0 XP, deferred to session end)
const aiMid = ctx2.bridge.processMatchOutcome('victory', 'ai');
assert.strictEqual(aiMid.credits, 0);
assert.strictEqual(aiMid.xp, 0);
assert.strictEqual(aiMid.deferred, true);
assert.strictEqual(ctx2.testEconomy.getCredits(), 0);
assert.strictEqual(matchEvents.length, 0);

// AI Practice Defeat at 0 tiers: 0 AC + 25 XP, atomic no double-payout
const aiState0 = { gameMode: 'duel_ai', sessionTiersCleared: 0, duelTier: 1, aiPracticeSettled: false };
const aiSettle0 = ctx2.bridge.settleAIPracticeFromState(aiState0, 'defeat');
assert.strictEqual(aiSettle0.credits, 0);
assert.strictEqual(aiSettle0.xp, 25);
assert.strictEqual(aiState0.aiPracticeSettled, true);
assert.strictEqual(aiState0.sessionTiersCleared, 0);
assert.strictEqual(ctx2.bridge.settleAIPracticeFromState(aiState0, 'exit'), null, 'Must prevent double payout');
assert.strictEqual(ctx2.testEconomy.getCredits(), 0);
assert.strictEqual(ctx2.testEconomy.getXP(), 25);

// AI Practice Exit after 3 tiers cleared (Tiers 1-3): 3 * 25 = 75 AC, 3 * 80 = 240 XP
const aiState3 = { gameMode: 'duel_ai', sessionTiersCleared: 3, duelTier: 4, aiPracticeSettled: false };
const aiSettle3 = ctx2.bridge.settleAIPracticeFromState(aiState3, 'exit');
assert.strictEqual(aiSettle3.credits, 75);
assert.strictEqual(aiSettle3.xp, 240);
assert.strictEqual(aiState3.sessionTiersCleared, 0);

// AI Practice Tier 6+ (startTier 6, 2 tiers cleared): 2 * 35 = 70 AC, 2 * 100 = 200 XP
const aiSettle6Plus = ctx2.bridge.settleAIPracticeSession(2, { startTier: 6, outcome: 'defeat' });
assert.strictEqual(aiSettle6Plus.credits, 70);
assert.strictEqual(aiSettle6Plus.xp, 200);

// Multiplayer Victory: 120 AC + 300 XP
const ctxMp = createTestContext();
const multiVic = ctxMp.bridge.processMatchOutcome('victory', 'multiplayer');
assert.strictEqual(multiVic.credits, 120);
assert.strictEqual(multiVic.xp, 300);
assert.strictEqual(ctxMp.testEconomy.getLevel(), 2, '300 XP crosses 250 XP -> Level 2');
assert.strictEqual(ctxMp.testEconomy.getCredits(), 170, '120 (Win) + 50 (Level 2 Milestone) = 170 AC');

// Multiplayer Defeat: 15 AC + 80 XP
const multiDef = ctxMp.bridge.processMatchOutcome('defeat', 'multiplayer');
assert.strictEqual(multiDef.credits, 15);
assert.strictEqual(multiDef.xp, 80);
assert.strictEqual(ctxMp.testEconomy.getCredits(), 185, '170 + 15 defeat AC = 185 AC');

console.log('✓ AI Practice session-end & Ranked PvP victory/defeat payouts verified');

// Group 3: Default Singleton & Event Unsubscription
console.log('\n[Group 3] Testing Default Singleton & Listener Lifecycle...');

const ctx3 = createTestContext();
let triggerCount = 0;
const unsub = ctx3.bridge.on(DuelEconomyEvents.MANEUVER_REWARD, () => {
  triggerCount++;
});

ctx3.bridge.rewardParry();
assert.strictEqual(triggerCount, 1);

unsub();
ctx3.bridge.rewardParry();
assert.strictEqual(triggerCount, 1, 'Unsubscribed listener should not be called');

console.log('✓ Listener lifecycle and unsubscription verified cleanly');

console.log('\n======================================================');
console.log('ALL DUEL ECONOMY BRIDGE TESTS PASSED (100% SUCCESS)');
console.log('======================================================');
