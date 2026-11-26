/**
 * apex_trial_registry.test.js
 * Unit tests for ApexTrialRegistry: sporadic 3-7 day event templates, mutator presets,
 * AR scoring weights, percentile bracket payout tiers, and Spark Vault catalog metadata.
 */

import assert from 'assert';
import {
  DAY_MS,
  MIN_TRIAL_DURATION_DAYS,
  MAX_TRIAL_DURATION_DAYS,
  FREE_TICKETS_PER_CYCLE,
  REENTRY_SPARK_COST,
  TRIAL_WINDOW_STATES,
  MUTATOR_PRESETS,
  AR_SCORING_WEIGHTS,
  APEX_BRACKET_TIERS,
  ORDERED_BRACKET_TIERS,
  APEX_TRIAL_TEMPLATES,
  SPORADIC_SCHEDULE_CONFIG,
  SPARK_VAULT_CONFIG,
  SPARK_VAULT_CATALOG_META,
  getAllTrialTemplates,
  getTrialTemplate,
  getBracketTier,
  buildScheduledCycle,
  resolveTrialScheduleWindow,
  getUtcWeekIndex,
  getSparkVaultEligibleItems
} from '../../src/events/ApexTrialRegistry.js';

console.log('--- Running ApexTrialRegistry Test Suite ---');

// 1. Entry Economy Constants
assert.strictEqual(FREE_TICKETS_PER_CYCLE, 1);
assert.strictEqual(REENTRY_SPARK_COST, 2);

// 2. Event Templates (3-7 day duration & valid mutators)
const templates = getAllTrialTemplates();
assert.ok(templates.length >= 4, 'Should define at least 4 sporadic event templates');
for (const tpl of templates) {
  assert.ok(tpl.durationDays >= MIN_TRIAL_DURATION_DAYS && tpl.durationDays <= MAX_TRIAL_DURATION_DAYS,
    `${tpl.id} durationDays=${tpl.durationDays} must be between 3 and 7`);
  assert.ok(tpl.mutators && typeof tpl.mutators === 'object');
  assert.ok(typeof tpl.exclusiveTitle === 'string' && tpl.exclusiveTitle.length > 0);
  assert.ok(tpl.benchmarkThresholds.top1 > tpl.benchmarkThresholds.top10);
  assert.ok(tpl.benchmarkThresholds.top10 > tpl.benchmarkThresholds.top25);
  assert.strictEqual(getTrialTemplate(tpl.id), tpl);
}
assert.strictEqual(getTrialTemplate('nonexistent_id'), null);

// 3. Mutator Presets
assert.ok(MUTATOR_PRESETS.LOW_GRAVITY.gravityScale < 1.0);
assert.ok(MUTATOR_PRESETS.HYPER_VELOCITY.discSpeedMult > 1.0);
assert.ok(MUTATOR_PRESETS.HAZARD_STORM.hazardIntervalMult < 1.0);
assert.strictEqual(MUTATOR_PRESETS.BOSS_GAUNTLET.bossEveryWave, true);

// 4. AR Scoring Weights
assert.ok(AR_SCORING_WEIGHTS.waveCleared > 0);
assert.ok(AR_SCORING_WEIGHTS.survivalSecond > 0);
assert.ok(AR_SCORING_WEIGHTS.fracture > 0);
assert.ok(AR_SCORING_WEIGHTS.parry > 0);
assert.ok(AR_SCORING_WEIGHTS.damageEfficiencyMax > 0);

// 5. Percentile Bracket Payout Tiers
assert.strictEqual(ORDERED_BRACKET_TIERS.length, 4);
assert.strictEqual(APEX_BRACKET_TIERS.APEX_PRIME.sparks, 25);
assert.strictEqual(APEX_BRACKET_TIERS.APEX_PRIME.credits, 3000);
assert.strictEqual(APEX_BRACKET_TIERS.APEX_PRIME.grantsTitle, true);

assert.strictEqual(APEX_BRACKET_TIERS.MASTER.sparks, 12);
assert.strictEqual(APEX_BRACKET_TIERS.MASTER.credits, 1500);
assert.strictEqual(APEX_BRACKET_TIERS.MASTER.grantsTitle, false);

assert.strictEqual(APEX_BRACKET_TIERS.CONTENDER.sparks, 6);
assert.strictEqual(APEX_BRACKET_TIERS.CONTENDER.credits, 750);

assert.strictEqual(APEX_BRACKET_TIERS.PARTICIPANT.sparks, 1);
assert.strictEqual(APEX_BRACKET_TIERS.PARTICIPANT.credits, 250);
assert.strictEqual(APEX_BRACKET_TIERS.PARTICIPANT.xp, 500);

assert.strictEqual(getBracketTier('apex_prime'), APEX_BRACKET_TIERS.APEX_PRIME);
assert.strictEqual(getBracketTier('invalid'), null);

// 6. Sporadic Window Resolution (Active vs Intermission)
const slot0 = buildScheduledCycle(0);
assert.strictEqual(slot0.startsAt, SPORADIC_SCHEDULE_CONFIG.epochMs);
assert.strictEqual(slot0.endsAt - slot0.startsAt, slot0.durationDays * DAY_MS);

const activeWin = resolveTrialScheduleWindow(slot0.startsAt + DAY_MS);
assert.strictEqual(activeWin.state, TRIAL_WINDOW_STATES.ACTIVE);
assert.strictEqual(activeWin.activeCycle.cycleId, slot0.cycleId);
assert.ok(activeWin.nextCycle);

const intermissionWin = resolveTrialScheduleWindow(slot0.endsAt + DAY_MS);
assert.strictEqual(intermissionWin.state, TRIAL_WINDOW_STATES.INTERMISSION);
assert.strictEqual(intermissionWin.activeCycle, null);
assert.strictEqual(intermissionWin.previousCycle.cycleId, slot0.cycleId);
assert.ok(intermissionWin.nextCycle.startsAt > intermissionWin.nowMs);

// Custom schedule override
const customSchedule = [
  { cycleId: 'custom_1', templateId: 'trial_hyper_velocity', startsAt: 1000 * DAY_MS, endsAt: 1005 * DAY_MS }
];
const customActive = resolveTrialScheduleWindow(1002 * DAY_MS, customSchedule);
assert.strictEqual(customActive.state, TRIAL_WINDOW_STATES.ACTIVE);
assert.strictEqual(customActive.activeCycle.cycleId, 'custom_1');
const customIntermission = resolveTrialScheduleWindow(1006 * DAY_MS, customSchedule);
assert.strictEqual(customIntermission.state, TRIAL_WINDOW_STATES.INTERMISSION);
assert.strictEqual(customIntermission.previousCycle.cycleId, 'custom_1');

// 7. Spark Vault Rotation Catalog Metadata
assert.strictEqual(SPARK_VAULT_CONFIG.minWeeklyItems, 1);
assert.strictEqual(SPARK_VAULT_CONFIG.maxWeeklyItems, 3);
assert.strictEqual(SPARK_VAULT_CONFIG.allowRepeatRotations, true);
assert.strictEqual(SPARK_VAULT_CATALOG_META.disc_hex_dark_matter.sparksCost, 75);
assert.strictEqual(SPARK_VAULT_CATALOG_META.disc_shuriken_void.sparksCost, 100);

const eligible = getSparkVaultEligibleItems();
assert.ok(eligible.some((i) => i.id === 'disc_hex_dark_matter' && i.cost === 75));
assert.ok(eligible.some((i) => i.id === 'disc_shuriken_void' && i.cost === 100));

assert.strictEqual(getUtcWeekIndex(0), 0);
assert.strictEqual(getUtcWeekIndex(7 * DAY_MS), 1);

console.log('✅ ApexTrialRegistry tests passed!');
