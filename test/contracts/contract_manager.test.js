/**
 * contract_manager.test.js
 * Comprehensive unit & integration test suite for ContractManager:
 * - UTC 24-hour Daily rotation & reset
 * - Individual Daily 250 XP payouts & 500 AC 3/3 Sweep bonus
 * - Career unlock gate (Player Level 5 + Swarm Wave 5)
 * - 3 focused slots (Combat, Endurance, Duel) & shuffle-bag non-repeat exhaustion
 * - Dual-gate promotions (non-stalling when quota met before level gate, instant promotion on level up)
 * - Endless Tier 5 Apex rotation
 * - Telemetry subscriptions (DuelEconomyBridge, SwarmEconomyBridge, CampaignManager, StorageManager)
 * - Re-entrancy / double-claim protection
 */

import assert from 'assert';
import { StorageManager } from '../../src/core/storage/StorageManager.js';
import { EconomyManager } from '../../src/core/economy/EconomyManager.js';
import { DuelEconomyBridge } from '../../src/modes/DuelEconomyBridge.js';
import { SwarmEconomyBridge } from '../../src/modes/SwarmEconomyBridge.js';
import { CampaignManager, CampaignEvents } from '../../src/campaign/CampaignManager.js';
import {
  CONTRACT_FOCUSES,
  CAREER_SLOT_FOCUSES,
  CONTRACT_METRICS,
  CAREER_TIER_REWARDS,
  getCareerBucket
} from '../../src/contracts/ContractRegistry.js';
import {
  ContractManager,
  ContractEvents,
  ContractStatus
} from '../../src/contracts/ContractManager.js';

console.log('--- Running ContractManager Test Suite ---');

function createHarness(startUtcIso = '2026-11-26T12:00:00.000Z') {
  let nowMs = Date.parse(startUtcIso);
  let fanfareCalls = 0;

  const storage = new StorageManager({
    storageKey: `tron_test_contracts_${Math.random().toString(36).slice(2)}`,
    backupKey: `tron_test_contracts_bak_${Math.random().toString(36).slice(2)}`
  });
  storage.load();

  const economy = new EconomyManager({ storage });
  const duelBridge = new DuelEconomyBridge({ storage, economy, floatingIndicatorFn: () => {} });
  const swarmBridge = new SwarmEconomyBridge({ storage, economy });
  const campaignManager = new CampaignManager({ storage, economy });

  const manager = new ContractManager({
    storage,
    economy,
    duelBridge,
    swarmBridge,
    campaignManager,
    playFanfareFn: () => { fanfareCalls++; },
    nowFn: () => nowMs,
    rngFn: () => 0.0
  });
  manager.init();

  return {
    storage,
    economy,
    duelBridge,
    swarmBridge,
    campaignManager,
    manager,
    setNowIso: (iso) => { nowMs = Date.parse(iso); },
    getFanfareCalls: () => fanfareCalls,
    cleanup: () => {
      manager.teardown();
      storage.destroy();
    }
  };
}

// =========================================================================
// Group 1: UTC 24h Daily Rotation, 250 XP Claim & 500 AC Sweep Bonus
// =========================================================================
console.log('\n[Group 1] Testing UTC 24h Daily Rotation, Individual Claims & 500 AC Sweep Bonus...');
{
  const h = createHarness('2026-11-26T23:59:50.000Z');
  // Start at Level 3 (next level threshold 1163 XP > 750 total daily XP) so level-up milestones don't obscure AC assertions
  h.storage.set('player.level', 3, { immediate: true });
  const daily1 = h.manager.getDailyState();

  assert.strictEqual(daily1.dateKey, '2026-11-26');
  assert.strictEqual(daily1.slots.length, 3);
  assert.strictEqual(new Set(daily1.slots.map((s) => s.id)).size, 3, 'Daily contracts must be 3 distinct templates');
  assert.strictEqual(daily1.msUntilReset, 10000);
  assert.strictEqual(daily1.sweepClaimable, false);
  assert.strictEqual(daily1.sweepClaimed, false);

  // Advance progress on all 3 daily slots
  for (const slot of daily1.slots) {
    h.manager.recordMetric(slot.metricKey, slot.target);
  }

  // Pip should reflect 3 daily claims + 1 sweep bonus = 4
  assert.strictEqual(h.manager.getPendingClaimCount(), 4);
  assert.strictEqual(h.manager.hasClaimableRewards(), true);
  assert.strictEqual(h.manager.isDailySweepClaimable(), true);

  // Claim slot 0: awards 250 XP and 0 AC, 0 Sparks
  const creditsBefore = h.economy.getCredits();
  const sparksBefore = h.economy.getSparks();
  const xpBefore = h.economy.getXP();

  const claim0 = h.manager.claimDailyContract(0);
  assert.strictEqual(claim0.success, true);
  assert.strictEqual(claim0.reward.xp, 250);
  assert.strictEqual(claim0.reward.credits, 0);
  assert.strictEqual(claim0.reward.sparks, 0);
  assert.strictEqual(h.economy.getCredits(), creditsBefore, 'Individual daily contract awards 0 AC');
  assert.strictEqual(h.economy.getSparks(), sparksBefore, 'Individual daily contract awards 0 Sparks');
  assert.strictEqual(h.economy.getXP(), xpBefore + 250);

  // Double-claim must fail
  assert.strictEqual(h.manager.claimDailyContract(0).success, false);

  // Claim slots 1 and 2
  assert.strictEqual(h.manager.claimDailyContract(1).success, true);
  assert.strictEqual(h.manager.claimDailyContract(2).success, true);

  // Claim 500 AC Daily Sweep Bonus (0 Sparks, 0 XP)
  const sweepRes = h.manager.claimDailySweep();
  assert.strictEqual(sweepRes.success, true);
  assert.strictEqual(sweepRes.reward.credits, 500);
  assert.strictEqual(sweepRes.reward.sparks, 0);
  assert.strictEqual(h.economy.getCredits(), creditsBefore + 500);
  assert.strictEqual(h.economy.getSparks(), sparksBefore);
  assert.strictEqual(h.manager.getPendingClaimCount(), 0);
  assert.strictEqual(h.manager.claimDailySweep().success, false, 'Sweep bonus can only be claimed once per UTC day');

  // Cross UTC midnight -> 2026-11-27
  let rotatedEvent = null;
  h.manager.on(ContractEvents.DAILY_ROTATED, (evt) => { rotatedEvent = evt; });
  h.setNowIso('2026-11-27T00:00:01.000Z');
  const daily2 = h.manager.getDailyState();

  assert.strictEqual(daily2.dateKey, '2026-11-27');
  assert.ok(rotatedEvent && rotatedEvent.dateKey === '2026-11-27');
  assert.strictEqual(daily2.sweepClaimed, false);
  assert.ok(daily2.slots.every((s) => s.progress === 0 && !s.claimed && s.status === ContractStatus.ACTIVE));

  h.cleanup();
}
console.log('✓ UTC 24h daily reset, 250 XP claims, and 500 AC sweep bonus verified');

// =========================================================================
// Group 2: Career Unlock Gate (Lv 5 + Swarm Wave 5)
// =========================================================================
console.log('\n[Group 2] Testing Career Unlock Prerequisites (Lv 5 + Swarm W5)...');
{
  const h = createHarness();

  // Initially Level 1, Swarm Wave 1 -> locked
  let career = h.manager.getCareerState();
  assert.strictEqual(career.unlocked, false);
  assert.ok(career.slots.every((s) => s === null));

  // Level 5 alone (Swarm Wave 3) -> still locked
  h.storage.set('player.level', 5, { immediate: true });
  h.storage.set('stats.swarmHighestWave', 3, { immediate: true });
  career = h.manager.getCareerState();
  assert.strictEqual(career.unlocked, false);

  // Reach Swarm Wave 5 -> unlocks immediately and populates all 3 focus slots!
  let unlockedEvt = null;
  h.manager.on(ContractEvents.CAREER_UNLOCKED, (evt) => { unlockedEvt = evt; });
  h.storage.set('stats.swarmHighestWave', 5, { immediate: true });

  career = h.manager.getCareerState();
  assert.ok(unlockedEvt, 'CAREER_UNLOCKED event must fire when both prerequisites are met');
  assert.strictEqual(career.unlocked, true);
  assert.strictEqual(career.tier, 1);
  assert.strictEqual(career.tierName, 'Rookie');
  assert.strictEqual(career.slots[0].focus, CONTRACT_FOCUSES.COMBAT);
  assert.strictEqual(career.slots[1].focus, CONTRACT_FOCUSES.ENDURANCE);
  assert.strictEqual(career.slots[2].focus, CONTRACT_FOCUSES.DUEL);

  h.cleanup();
}
console.log('✓ Career unlock gate (Lv 5 + Swarm W5) and 3-focus initial deal verified');

// =========================================================================
// Group 3: Shuffle-Bag Exhaustion & No-Repeat Replacement
// =========================================================================
console.log('\n[Group 3] Testing Shuffle-Bag Exhaustion & Non-Repeat Replacement...');
{
  const h = createHarness();
  h.storage.set('player.level', 5, { immediate: true });
  h.storage.set('stats.swarmHighestWave', 5, { immediate: true });
  h.manager.checkCareerUnlock();

  const tier1CombatPool = getCareerBucket(1, CONTRACT_FOCUSES.COMBAT);
  const poolSize = tier1CombatPool.length;
  assert.ok(poolSize >= 3);

  const drawnIdsCycle1 = [];
  for (let i = 0; i < poolSize; i++) {
    const slot = h.manager.getCareerState().slots[0];
    drawnIdsCycle1.push(slot.id);
    h.manager.recordMetric(slot.metricKey, slot.target);
    // Keep level < 10 so tier stays 1 throughout shuffle-bag test
    const res = h.manager.claimCareerContract(0);
    assert.strictEqual(res.success, true);
  }

  assert.strictEqual(
    new Set(drawnIdsCycle1).size,
    poolSize,
    'Every template in the Tier 1 Combat bucket must be drawn once before reshuffling'
  );

  // Next draw (after exhaustion) must reshuffle without repeating the immediately preceding contract
  const postExhaustionSlot = h.manager.getCareerState().slots[0];
  assert.ok(tier1CombatPool.some((t) => t.id === postExhaustionSlot.id));
  assert.notStrictEqual(
    postExhaustionSlot.id,
    drawnIdsCycle1[drawnIdsCycle1.length - 1],
    'Post-reshuffle draw must avoid immediate consecutive duplicate'
  );

  h.cleanup();
}
console.log('✓ Per-bucket shuffle-bag exhaustion and non-repeating rotation verified');

// =========================================================================
// Group 4: Dual-Gate Career Promotions & Non-Stalling Quota Overflow
// =========================================================================
console.log('\n[Group 4] Testing Dual-Gate Promotions & Non-Stalling Behaviour...');
{
  const h = createHarness();
  h.storage.set('player.level', 5, { immediate: true });
  h.storage.set('stats.swarmHighestWave', 5, { immediate: true });
  h.manager.checkCareerUnlock();

  // Complete 7 Tier 1 contracts while player level stays < 10 (e.g. Lv 6)
  // Wait: XP from Tier 1 contracts (300 XP each) could level up player from Lv 5!
  // Let's keep level pinned or verify what happens before Lv 10:
  // At Lv 5: Lv 5->6 takes 2380 XP, so 7 * 300 = 2100 XP keeps player at Lv 5 (< 10)!
  for (let i = 0; i < 7; i++) {
    const slot = h.manager.getCareerState().slots[0];
    assert.strictEqual(slot.tier, 1, 'Must keep drawing Tier 1 contracts without stalling when level < 10');
    h.manager.recordMetric(slot.metricKey, slot.target);
    const res = h.manager.claimCareerContract(0);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.reward.credits, 300);
    assert.strictEqual(res.reward.sparks, 1);
    assert.strictEqual(res.reward.xp, 300);
    assert.strictEqual(res.promoted, null);
  }

  const preLevelState = h.manager.getCareerState();
  assert.strictEqual(preLevelState.tier, 1);
  assert.strictEqual(preLevelState.tierCompletions, 7);
  assert.strictEqual(preLevelState.quotaMet, true);
  assert.strictEqual(preLevelState.levelMet, false);
  assert.strictEqual(preLevelState.awaitingLevelGate, true);

  // Now reach Level 10 via EconomyManager / storage -> immediate promotion to Tier 2 (Contender)!
  let promotedEvt = null;
  h.manager.on(ContractEvents.CAREER_TIER_PROMOTED, (evt) => { promotedEvt = evt; });
  h.storage.set('player.level', 10, { immediate: true });

  assert.ok(promotedEvt, 'CAREER_TIER_PROMOTED must fire once level gate is met');
  assert.strictEqual(promotedEvt.previousTier, 1);
  assert.strictEqual(promotedEvt.newTier, 2);

  const promotedState = h.manager.getCareerState();
  assert.strictEqual(promotedState.tier, 2);
  assert.strictEqual(promotedState.tierName, 'Contender');
  assert.strictEqual(promotedState.tierCompletions, 0);

  // Claiming the existing Tier 1 slot 0 pays Tier 1 reward and immediately deals a Tier 2 replacement!
  const oldTier1Slot = promotedState.slots[0];
  h.manager.recordMetric(oldTier1Slot.metricKey, oldTier1Slot.target);
  const transitionClaim = h.manager.claimCareerContract(0);
  assert.strictEqual(transitionClaim.success, true);
  assert.strictEqual(transitionClaim.reward.credits, 300, 'Previously dealt Tier 1 slot retains Tier 1 reward');
  assert.strictEqual(transitionClaim.nextSlot.tier, 2, 'Replacement slot draws from newly promoted Tier 2');

  // Verify Tier 5 Apex endless rotation
  h.storage.set('player.level', 50, { immediate: true });
  const raw = h.storage.get('contracts');
  raw.career.tier = 5;
  raw.career.tierCompletions = 20;
  raw.career.slots[0] = null;
  h.storage.set('contracts', raw, { immediate: true });
  h.manager.checkCareerUnlock({ silent: true });

  const apexSlot = h.manager.getCareerState().slots[0];
  assert.strictEqual(apexSlot.tier, 5);
  h.manager.recordMetric(apexSlot.metricKey, apexSlot.target);
  const apexClaim = h.manager.claimCareerContract(0);
  assert.strictEqual(apexClaim.success, true);
  assert.deepStrictEqual(apexClaim.reward, { ...CAREER_TIER_REWARDS[5] });
  assert.strictEqual(apexClaim.nextSlot.tier, 5, 'Tier 5 Apex loops endlessly without capping');

  h.cleanup();
}
console.log('✓ Dual-gate promotions, non-stalling overflow, and Tier 5 Apex endless loop verified');

// =========================================================================
// Group 5: Telemetry Bridge Integration (Duel, Swarm, Tour, Storage)
// =========================================================================
console.log('\n[Group 5] Testing Live Telemetry Bridge Subscriptions...');
{
  const h = createHarness();
  h.storage.set('player.level', 12, { immediate: true });
  h.storage.set('stats.swarmHighestWave', 5, { immediate: true });
  h.manager.checkCareerUnlock();

  // Set deterministic active slots across all 3 focuses + daily
  const contracts = h.storage.get('contracts');
  contracts.daily.slots = [
    { id: 'daily_parry_3', templateId: 'daily_parry_3', type: 'daily', slotIndex: 0, metricKey: CONTRACT_METRICS.PARRY, progress: 0, target: 3, status: ContractStatus.ACTIVE, claimed: false },
    { id: 'daily_ricochet_2', templateId: 'daily_ricochet_2', type: 'daily', slotIndex: 1, metricKey: CONTRACT_METRICS.RICOCHET, progress: 0, target: 2, status: ContractStatus.ACTIVE, claimed: false },
    { id: 'daily_tour_clear_1', templateId: 'daily_tour_clear_1', type: 'daily', slotIndex: 2, metricKey: CONTRACT_METRICS.TOUR_CLEAR, progress: 0, target: 1, status: ContractStatus.ACTIVE, claimed: false }
  ];
  contracts.career.tier = 2;
  contracts.career.slots = [
    { id: 'c2_combat_curve', templateId: 'c2_combat_curve', type: 'career', slotIndex: 0, focus: CONTRACT_FOCUSES.COMBAT, tier: 2, metricKey: CONTRACT_METRICS.CURVE_KILL, progress: 0, target: 8, status: ContractStatus.ACTIVE, claimed: false },
    { id: 'c2_endurance_hardcore', templateId: 'c2_endurance_hardcore', type: 'career', slotIndex: 1, focus: CONTRACT_FOCUSES.ENDURANCE, tier: 2, metricKey: CONTRACT_METRICS.HARDCORE_SWARM_WAVE, progress: 0, target: 5, status: ContractStatus.ACTIVE, claimed: false },
    { id: 'c2_duel_ai_tier', templateId: 'c2_duel_ai_tier', type: 'career', slotIndex: 2, focus: CONTRACT_FOCUSES.DUEL, tier: 2, metricKey: CONTRACT_METRICS.DUEL_AI_HIGH_TIER_WIN, params: { minAiTier: 3 }, progress: 0, target: 3, status: ContractStatus.ACTIVE, claimed: false }
  ];
  h.storage.set('contracts', contracts, { immediate: true });

  // 1. DuelEconomyBridge maneuvers
  h.duelBridge.rewardParry();
  h.duelBridge.rewardParry();
  h.duelBridge.rewardParry();
  h.duelBridge.rewardRicochetHit(2);
  h.duelBridge.rewardRicochetHit(3);
  h.duelBridge.rewardCurveElimination(0.8);

  // 2. DuelEconomyBridge AI session payouts: Tier 1-2 shouldn't satisfy minAiTier: 3, Tier 3-4 should!
  h.duelBridge.settleAIPracticeSession(2, { startTier: 1 });
  assert.strictEqual(h.manager.getCareerState().slots[2].progress, 0, 'Tier 1-2 AI clears must not count toward Tier 3+ contract');
  h.duelBridge.settleAIPracticeSession(2, { startTier: 3 });
  assert.strictEqual(h.manager.getCareerState().slots[2].progress, 2, 'Tier 3-4 AI clears must count as 2 toward Tier 3+ contract');

  // 3. SwarmEconomyBridge wave payout (Hardcore)
  h.swarmBridge.processWaveCompletion(4, { isHardcore: true });
  h.swarmBridge.processWaveCompletion(5, { isHardcore: true });

  // 4. CampaignManager trial completion
  h.campaignManager.emit(CampaignEvents.TRIAL_COMPLETED, { levelId: 'level_01_02', stars: 3, success: true });

  const daily = h.manager.getDailyState();
  const career = h.manager.getCareerState();

  assert.strictEqual(daily.slots[0].status, ContractStatus.CLAIMABLE);
  assert.strictEqual(daily.slots[1].status, ContractStatus.CLAIMABLE);
  assert.strictEqual(daily.slots[2].status, ContractStatus.CLAIMABLE);
  assert.strictEqual(daily.sweepClaimable, true);

  assert.strictEqual(career.slots[0].progress, 1);
  assert.strictEqual(career.slots[1].progress, 2);
  assert.strictEqual(career.slots[2].progress, 2);

  h.cleanup();
}
console.log('✓ Duel, Swarm, and Campaign telemetry bridge listeners verified');

console.log('\n======================================================');
console.log('ALL CONTRACT MANAGER TESTS PASSED (100% SUCCESS)');
console.log('======================================================\n');
