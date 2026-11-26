/**
 * apex_trial_manager.test.js
 * Unit tests for ApexTrialManager:
 * - Active vs intermission window resolution
 * - 1 Free Entry Ticket -> 2 Sparks re-entry via EconomyManager.spendSparks
 * - Apex Rating (AR) calculation & personal best retention
 * - Hybrid online/offline leaderboard classification (Top 1% / 10% / 25% / Participant)
 * - Idempotent end-of-cycle payout claiming & exclusive Title unlocking
 */

import assert from 'assert';
import { StorageManager } from '../../src/core/storage/StorageManager.js';
import { EconomyManager } from '../../src/core/economy/EconomyManager.js';
import {
  DAY_MS,
  TRIAL_WINDOW_STATES,
  APEX_BRACKET_TIERS,
  REENTRY_SPARK_COST
} from '../../src/events/ApexTrialRegistry.js';
import { ApexTrialManager, ApexTrialEvents } from '../../src/events/ApexTrialManager.js';

console.log('--- Running ApexTrialManager Test Suite ---');

function createHarness(options = {}) {
  const storage = new StorageManager({
    storageKey: `tron_test_events_${Math.random().toString(36).slice(2)}`,
    backupKey: `tron_test_events_bak_${Math.random().toString(36).slice(2)}`
  });
  storage.load();

  const economy = new EconomyManager({ storage });
  let nowMs = options.initialNowMs ?? Date.UTC(2026, 0, 2, 12, 0, 0); // Day 1 of slot 0 (active)

  const manager = new ApexTrialManager({
    storage,
    economy,
    nowFn: () => nowMs,
    customSchedule: options.customSchedule || null,
    supabaseClient: options.supabaseClient || null
  });

  return {
    storage,
    economy,
    manager,
    setNowMs: (v) => { nowMs = v; },
    getNowMs: () => nowMs
  };
}

// 1. Active vs Intermission Window Resolution
{
  const customSchedule = [
    {
      cycleId: 'cycle_test_1',
      templateId: 'trial_zero_g_nexus',
      startsAt: 100 * DAY_MS,
      endsAt: 104 * DAY_MS
    },
    {
      cycleId: 'cycle_test_2',
      templateId: 'trial_hyper_velocity',
      startsAt: 110 * DAY_MS,
      endsAt: 115 * DAY_MS
    }
  ];

  const { manager, setNowMs } = createHarness({
    initialNowMs: 101 * DAY_MS,
    customSchedule
  });

  assert.strictEqual(manager.isTrialActive(), true);
  const active = manager.getActiveTrial();
  assert.strictEqual(active.cycleId, 'cycle_test_1');
  assert.strictEqual(manager.getTimeRemainingMs(), 3 * DAY_MS);

  // Move to intermission
  setNowMs(106 * DAY_MS);
  assert.strictEqual(manager.isTrialActive(), false);
  const status = manager.getScheduleStatus();
  assert.strictEqual(status.state, TRIAL_WINDOW_STATES.INTERMISSION);
  assert.strictEqual(status.previousCycle.cycleId, 'cycle_test_1');
  assert.strictEqual(status.nextCycle.cycleId, 'cycle_test_2');
  assert.strictEqual(manager.getTimeRemainingMs(), 4 * DAY_MS);

  const blockedEntry = manager.enterTrial();
  assert.strictEqual(blockedEntry.success, false);
  assert.strictEqual(blockedEntry.reason, 'NO_ACTIVE_TRIAL');
}

// 2. Free Entry Ticket vs 2-Spark Re-Entry
{
  const { economy, manager } = createHarness();
  const active = manager.getActiveTrial();
  assert.ok(active, 'Default schedule slot 0 should be active on 2026-01-02');

  let enteredEvents = 0;
  manager.on(ApexTrialEvents.TRIAL_ENTERED, () => { enteredEvents += 1; });

  // First entry: uses Free Ticket (0 Sparks spent)
  const check1 = manager.canEnterTrial();
  assert.strictEqual(check1.allowed, true);
  assert.strictEqual(check1.usesFreeTicket, true);
  assert.strictEqual(check1.costSparks, 0);

  const entry1 = manager.enterTrial();
  assert.strictEqual(entry1.success, true);
  assert.strictEqual(entry1.usesFreeTicket, true);
  assert.strictEqual(entry1.sparksSpent, 0);
  assert.strictEqual(entry1.record.freeTicketUsed, true);
  assert.strictEqual(entry1.record.attempts, 1);

  // Second entry with 0 Sparks: rejected
  const check2 = manager.canEnterTrial();
  assert.strictEqual(check2.allowed, false);
  assert.strictEqual(check2.reason, 'INSUFFICIENT_SPARKS');
  assert.strictEqual(check2.costSparks, REENTRY_SPARK_COST);

  const entry2Fail = manager.enterTrial();
  assert.strictEqual(entry2Fail.success, false);
  assert.strictEqual(entry2Fail.reason, 'INSUFFICIENT_SPARKS');

  // Award 3 Sparks, re-enter -> 2 Sparks deducted, 1 remaining
  economy.awardSparks(3, 'test_grant');
  const entry2 = manager.enterTrial();
  assert.strictEqual(entry2.success, true);
  assert.strictEqual(entry2.usesFreeTicket, false);
  assert.strictEqual(entry2.sparksSpent, 2);
  assert.strictEqual(entry2.record.attempts, 2);
  assert.strictEqual(economy.getSparks(), 1);
  assert.strictEqual(enteredEvents, 2);
}

// 3. Apex Rating (AR) Calculation & Personal Best Retention
{
  const { manager } = createHarness();
  const active = manager.getActiveTrial();

  const run1 = await manager.recordRunResult(active.cycleId, {
    wavesCleared: 5,
    survivalSeconds: 180,
    fractures: 12,
    parries: 4,
    ricochetFractures: 2,
    hpRemainingRatio: 0.75,
    victory: false
  });
  assert.ok(run1.ar > 0);
  assert.strictEqual(run1.bestAR, run1.ar);
  assert.strictEqual(run1.isNewBest, true);

  // Lower score run should NOT overwrite bestAR
  const run2 = await manager.recordRunResult(active.cycleId, {
    wavesCleared: 1,
    survivalSeconds: 20,
    fractures: 2,
    parries: 0,
    ricochetFractures: 0,
    hpRemainingRatio: 0.0,
    victory: false
  });
  assert.ok(run2.ar < run1.ar);
  assert.strictEqual(run2.bestAR, run1.ar);
  assert.strictEqual(run2.isNewBest, false);
}

// 4. Hybrid Online/Offline Leaderboard Classification & Standings
{
  const { manager } = createHarness();
  const active = manager.getActiveTrial();

  // Offline benchmark thresholds on trial_zero_g_nexus: top1=3600, top10=2400, top25=1500
  assert.strictEqual(manager.classifyBracket(4000, active.cycleId).tier.id, APEX_BRACKET_TIERS.APEX_PRIME.id);
  assert.strictEqual(manager.classifyBracket(2600, active.cycleId).tier.id, APEX_BRACKET_TIERS.MASTER.id);
  assert.strictEqual(manager.classifyBracket(1600, active.cycleId).tier.id, APEX_BRACKET_TIERS.CONTENDER.id);
  assert.strictEqual(manager.classifyBracket(300, active.cycleId).tier.id, APEX_BRACKET_TIERS.PARTICIPANT.id);
  assert.strictEqual(manager.classifyBracket(0, active.cycleId).tier, null);

  // Online percentile classification with 100 entries
  const online100 = Array.from({ length: 100 }, (_, i) => ({ bestAR: (i + 1) * 100 }));
  assert.strictEqual(manager.classifyBracket(10000, active.cycleId, online100).tier.id, APEX_BRACKET_TIERS.APEX_PRIME.id);
  assert.strictEqual(manager.classifyBracket(9200, active.cycleId, online100).tier.id, APEX_BRACKET_TIERS.MASTER.id);
  assert.strictEqual(manager.classifyBracket(8000, active.cycleId, online100).tier.id, APEX_BRACKET_TIERS.CONTENDER.id);
  assert.strictEqual(manager.classifyBracket(2000, active.cycleId, online100).tier.id, APEX_BRACKET_TIERS.PARTICIPANT.id);

  // Offline standings fallback
  await manager.recordRunResult(active.cycleId, { wavesCleared: 3, survivalSeconds: 100, fractures: 6, parries: 2 });
  const standings = await manager.getLeaderboardStandings(active.cycleId);
  assert.strictEqual(standings.source, 'benchmark');
  assert.ok(standings.entries.some((e) => e.isPlayer));
}

// 5. Idempotent Cycle Payout Claiming (Top 1% Title + Sparks + AC, and Participant XP)
{
  const customSchedule = [
    {
      cycleId: 'cycle_payout_top1',
      templateId: 'trial_zero_g_nexus',
      startsAt: 10 * DAY_MS,
      endsAt: 14 * DAY_MS
    }
  ];

  const { storage, economy, manager, setNowMs } = createHarness({
    initialNowMs: 11 * DAY_MS,
    customSchedule
  });

  // High score run -> Top 1% Apex Prime (>= 3600)
  await manager.recordRunResult('cycle_payout_top1', {
    wavesCleared: 10,
    survivalSeconds: 300,
    fractures: 15,
    parries: 6,
    ricochetFractures: 2,
    hpRemainingRatio: 1.0,
    victory: true
  });

  // Cannot claim while cycle is still active (without force)
  const activeClaim = manager.claimCycleRewards('cycle_payout_top1');
  assert.strictEqual(activeClaim.success, false);
  assert.strictEqual(activeClaim.reason, 'CYCLE_STILL_ACTIVE');

  // Move past cycle end
  setNowMs(15 * DAY_MS);
  const claimable = manager.getClaimableCycles();
  assert.strictEqual(claimable.length, 1);
  assert.strictEqual(claimable[0].cycleId, 'cycle_payout_top1');

  const claim1 = manager.claimCycleRewards('cycle_payout_top1');
  assert.strictEqual(claim1.success, true);
  assert.strictEqual(claim1.tier.id, APEX_BRACKET_TIERS.APEX_PRIME.id);
  assert.strictEqual(claim1.rewards.sparks, 25);
  assert.strictEqual(claim1.rewards.credits, 3000);
  assert.strictEqual(claim1.rewards.titleUnlocked, 'APEX PRIME: ZERO-G');

  assert.strictEqual(economy.getSparks(), 25);
  assert.strictEqual(economy.getCredits(), 3000);
  assert.ok(storage.get('player.titles', []).includes('APEX PRIME: ZERO-G'));

  // Duplicate claim is idempotent / rejected
  const claim2 = manager.claimCycleRewards('cycle_payout_top1');
  assert.strictEqual(claim2.success, false);
  assert.strictEqual(claim2.reason, 'ALREADY_CLAIMED');
  assert.strictEqual(economy.getSparks(), 25);
  assert.strictEqual(manager.getClaimableCycles().length, 0);
}

// 6. Participant Payout (1 Spark + 250 AC + 500 XP)
{
  const { economy, manager } = createHarness();
  const active = manager.getActiveTrial();

  await manager.recordRunResult(active.cycleId, {
    wavesCleared: 0,
    survivalSeconds: 25,
    fractures: 1,
    parries: 0
  });

  const claim = manager.claimCycleRewards(active.cycleId, { force: true });
  assert.strictEqual(claim.success, true);
  assert.strictEqual(claim.tier.id, APEX_BRACKET_TIERS.PARTICIPANT.id);
  assert.strictEqual(claim.rewards.sparks, 1);
  assert.strictEqual(claim.rewards.credits, 250);
  assert.strictEqual(claim.rewards.xp, 500);
  assert.strictEqual(claim.rewards.titleUnlocked, null);
  assert.strictEqual(economy.getSparks(), 1);
  // 250 AC payout + 50 AC Level 2 milestone from 500 XP
  assert.ok(economy.getCredits() >= 250);
  assert.ok(economy.getLevel() >= 2);
}

console.log('✅ ApexTrialManager tests passed!');
