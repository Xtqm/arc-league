/**
 * contract_registry.test.js
 * Unit test suite verifying ContractRegistry completeness, tier gates,
 * focus buckets, and reward payloads.
 */

import assert from 'assert';
import {
  CONTRACT_FOCUSES,
  CAREER_SLOT_FOCUSES,
  CAREER_FOCUS_META,
  DAILY_SLOTS_COUNT,
  DAILY_CONTRACT_REWARD,
  DAILY_SWEEP_REWARD,
  CAREER_UNLOCK_REQUIREMENTS,
  CAREER_TIERS,
  CAREER_TIER_REWARDS,
  DAILY_CONTRACTS,
  CAREER_CONTRACT_BUCKETS,
  getDailyTemplates,
  getDailyTemplate,
  getCareerTierConfig,
  getPromotionGate,
  getCareerBucket,
  getCareerTemplate,
  getAllCareerTemplates,
  getContractTemplate,
  evaluateCareerUnlock
} from '../../src/contracts/ContractRegistry.js';

console.log('--- Running ContractRegistry Test Suite ---');

// Group 1: Daily Contracts Pool & Rewards
console.log('\n[Group 1] Testing Daily Contracts Registry...');
assert.strictEqual(DAILY_SLOTS_COUNT, 3);
assert.deepStrictEqual(DAILY_CONTRACT_REWARD, { credits: 0, bits: 0, sparks: 0, xp: 250 });
assert.deepStrictEqual(DAILY_SWEEP_REWARD, { credits: 500, bits: 500, sparks: 0, xp: 0 });

const dailies = getDailyTemplates();
assert.ok(dailies.length >= 3, 'Must have at least 3 daily templates for 3-slot rotation');

const dailyIds = new Set();
for (const d of dailies) {
  assert.ok(typeof d.id === 'string' && d.id.length > 0);
  assert.ok(!dailyIds.has(d.id), `Duplicate daily template id: ${d.id}`);
  dailyIds.add(d.id);
  assert.ok(typeof d.title === 'string' && d.title.length > 0);
  assert.ok(typeof d.description === 'string' && d.description.length > 0);
  assert.ok(typeof d.metricKey === 'string' && d.metricKey.length > 0);
  assert.ok(typeof d.target === 'number' && d.target > 0);
  assert.strictEqual(d.reward.xp, 250);
  assert.strictEqual(d.reward.credits, 0);
  assert.strictEqual(d.reward.sparks, 0);
  assert.strictEqual(getDailyTemplate(d.id), d);
  assert.strictEqual(getContractTemplate(d.id), d);
}
assert.strictEqual(getDailyTemplate('non_existent'), null);
console.log(`✓ ${dailies.length} Daily Contract templates and rewards validated`);

// Group 2: Career Tiers, Gates & Rewards
console.log('\n[Group 2] Testing Career Tiers, Promotion Gates & Rewards...');
assert.strictEqual(CAREER_UNLOCK_REQUIREMENTS.minLevel, 5);
assert.strictEqual(CAREER_UNLOCK_REQUIREMENTS.minSwarmWave, 5);

assert.strictEqual(CAREER_TIERS.length, 5);
const expectedTiers = [
  { tier: 1, name: 'Rookie', credits: 300, sparks: 1, xp: 300, gate: { nextTier: 2, requiredCompletions: 6, requiredLevel: 10 } },
  { tier: 2, name: 'Contender', credits: 600, sparks: 2, xp: 500, gate: { nextTier: 3, requiredCompletions: 9, requiredLevel: 18 } },
  { tier: 3, name: 'Pro', credits: 1000, sparks: 3, xp: 800, gate: { nextTier: 4, requiredCompletions: 12, requiredLevel: 28 } },
  { tier: 4, name: 'Elite', credits: 1600, sparks: 4, xp: 1200, gate: { nextTier: 5, requiredCompletions: 15, requiredLevel: 40 } },
  { tier: 5, name: 'Apex', credits: 2500, sparks: 5, xp: 1800, gate: null }
];

for (const exp of expectedTiers) {
  const cfg = getCareerTierConfig(exp.tier);
  assert.ok(cfg, `Missing config for Tier ${exp.tier}`);
  assert.strictEqual(cfg.name, exp.name);
  assert.strictEqual(cfg.reward.credits, exp.credits);
  assert.strictEqual(cfg.reward.bits, exp.credits);
  assert.strictEqual(cfg.reward.sparks, exp.sparks);
  assert.strictEqual(cfg.reward.xp, exp.xp);
  assert.deepStrictEqual(CAREER_TIER_REWARDS[exp.tier], cfg.reward);
  assert.deepStrictEqual(getPromotionGate(exp.tier), exp.gate);
}
console.log('✓ All 5 Career Tiers, dual gates (6/Lv10, 9/Lv18, 12/Lv28, 15/Lv40), and reward payloads validated');

// Group 3: Career Focus Buckets Completeness
console.log('\n[Group 3] Testing Career Focus Buckets (Tiers 1-5 x 3 Focuses)...');
assert.deepStrictEqual(CAREER_SLOT_FOCUSES, [
  CONTRACT_FOCUSES.COMBAT,
  CONTRACT_FOCUSES.ENDURANCE,
  CONTRACT_FOCUSES.DUEL
]);
assert.strictEqual(CAREER_FOCUS_META.combat.label, 'Combat Precision');
assert.strictEqual(CAREER_FOCUS_META.endurance.label, 'Swarm & Tour');
assert.strictEqual(CAREER_FOCUS_META.duel.label, 'Duel Competitive');

const careerIds = new Set();
for (let tier = 1; tier <= 5; tier++) {
  for (const focus of CAREER_SLOT_FOCUSES) {
    const bucket = getCareerBucket(tier, focus);
    assert.ok(Array.isArray(bucket) && bucket.length >= 3, `Tier ${tier} focus "${focus}" must have at least 3 templates`);
    for (const c of bucket) {
      assert.ok(!careerIds.has(c.id), `Duplicate career template id: ${c.id}`);
      assert.ok(!dailyIds.has(c.id), `ID collision with daily template: ${c.id}`);
      careerIds.add(c.id);
      assert.strictEqual(c.tier, tier);
      assert.strictEqual(c.focus, focus);
      assert.ok(typeof c.title === 'string' && c.title.length > 0);
      assert.ok(typeof c.description === 'string' && c.description.length > 0);
      assert.ok(typeof c.metricKey === 'string' && c.metricKey.length > 0);
      assert.ok(typeof c.target === 'number' && c.target > 0);
      assert.deepStrictEqual(c.reward, CAREER_TIER_REWARDS[tier]);
      assert.strictEqual(getCareerTemplate(c.id), c);
      assert.strictEqual(getContractTemplate(c.id), c);
    }
  }
}
assert.strictEqual(getAllCareerTemplates().length, careerIds.size);
assert.strictEqual(Object.keys(CAREER_CONTRACT_BUCKETS).length, 5);
console.log(`✓ All 15 Career buckets populated with ${careerIds.size} unique templates`);

// Group 4: Career Unlock Gate Evaluation
console.log('\n[Group 4] Testing Career Unlock Prerequisite Evaluation...');
assert.strictEqual(evaluateCareerUnlock({ player: { level: 4 }, stats: { swarmHighestWave: 10 } }).unlocked, false);
assert.strictEqual(evaluateCareerUnlock({ player: { level: 10 }, stats: { swarmHighestWave: 4 } }).unlocked, false);
assert.strictEqual(evaluateCareerUnlock({ player: { level: 5 }, stats: { swarmHighestWave: 5 } }).unlocked, true);
assert.strictEqual(evaluateCareerUnlock({ player: { level: 12 }, stats: { swarmHighestWave: 8 } }).unlocked, true);
console.log('✓ Career unlock gate (Lv 5 + Swarm W5) evaluated accurately');

console.log('\n======================================================');
console.log('ALL CONTRACT REGISTRY TESTS PASSED (100% SUCCESS)');
console.log('======================================================\n');
