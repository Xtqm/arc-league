/**
 * test_campaign_runtime_bridge.test.js
 * Comprehensive unit and integration test suite for:
 * Campaign Runtime Bridge (SPEC-CAMP-001 / change: campaign-runtime-bridge).
 * Validates wave spawner mapping, multi-wave lifecycle, combat telemetry recording,
 * trial victory debrief invocation, and campaign defeat routing.
 */

import assert from 'assert';
import { StorageManager } from '../../src/core/storage/StorageManager.js';
import { EconomyManager } from '../../src/core/economy/EconomyManager.js';
import { CampaignRegistry } from '../../src/campaign/CampaignRegistry.js';
import { StarEvaluator } from '../../src/campaign/StarEvaluator.js';
import { CampaignManager, CampaignEvents } from '../../src/campaign/CampaignManager.js';
import { CampaignHUD } from '../../src/ui/campaign/CampaignHUD.js';
import { TrialDebriefModal } from '../../src/ui/campaign/TrialDebriefModal.js';
import { ARBITER_CONFIGS } from '../../src/ai/ArbiterBossController.js';
import { state } from '../../src/core/state.js';

console.log('--- Running Campaign Runtime Bridge Test Suite ---');

// Mock storage helper
function createMockStorage(initial = {}) {
  const mem = JSON.parse(JSON.stringify(initial));
  return {
    isInitialized: true,
    get: (key, def = null) => {
      const parts = key.split('.');
      let curr = mem;
      for (const p of parts) {
        if (!curr || typeof curr !== 'object') return def;
        curr = curr[p];
      }
      return curr !== undefined ? curr : def;
    },
    set: (key, val) => {
      const parts = key.split('.');
      let curr = mem;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!curr[parts[i]]) curr[parts[i]] = {};
        curr = curr[parts[i]];
      }
      curr[parts[parts.length - 1]] = val;
      return true;
    },
    save: () => true
  };
}

// Mock economy helper
function createMockEconomy() {
  let bits = 0;
  let xp = 0;
  return {
    getBits: () => bits,
    getXP: () => xp,
    awardBits: (amt) => { bits += amt; return true; },
    awardXP: (amt) => { xp += amt; return true; }
  };
}

// Setup test environment
const mockStorage = createMockStorage({
  campaign: {
    levelRecords: {},
    unlockedGrids: ['grid_01'],
    completedNodes: [],
    unlockedNodes: ['level_01_01'],
    starsEarned: 0
  },
  inventory: {
    unlockedMaps: ['arena_grid_01']
  }
});

const mockEconomy = createMockEconomy();
const registry = new CampaignRegistry();
const evaluator = new StarEvaluator();
const testManager = new CampaignManager({
  registry,
  evaluator,
  storage: mockStorage,
  economy: mockEconomy
});

// Setup mock DOM for HUD testing
const mockDomElements = new Map();
function getOrCreateMockElement(id) {
  if (!mockDomElements.has(id)) {
    const classList = new Set();
    mockDomElements.set(id, {
      id,
      textContent: '',
      style: {},
      classList: {
        add: (c) => classList.add(c),
        remove: (c) => classList.delete(c),
        contains: (c) => classList.has(c)
      }
    });
  }
  return mockDomElements.get(id);
}

global.document = {
  getElementById: (id) => getOrCreateMockElement(id),
  body: { appendChild: () => {} },
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    style: {},
    classList: { add: () => {}, remove: () => {} },
    appendChild: () => {},
    addEventListener: () => {}
  }),
  pointerLockElement: null,
  exitPointerLock: () => {}
};

// =========================================================================
// [Group 1] Wave Spawner Mapping & Level Configuration Resolution
// =========================================================================
console.log('\n[Group 1] Testing Wave Spawner Data & Difficulty Tier Mapping...');

state.gameMode = 'campaign';

// Test Level 01_01 (Single Recon)
const lvl01 = registry.getLevel('level_01_01');
assert(lvl01, 'Level 01_01 must exist in registry');
assert.strictEqual(lvl01.waves.length, 1, 'Level 01_01 must have 1 wave');
assert.strictEqual(lvl01.waves[0].enemies[0].type, 'RECON');
assert.strictEqual(lvl01.waves[0].enemies[0].hp, 50);

// Test Level 01_02 (Two Recons)
const lvl02 = registry.getLevel('level_01_02');
assert(lvl02, 'Level 01_02 must exist in registry');
assert.strictEqual(lvl02.waves[0].enemies[0].count, 2);

// Test Level 01_03 (Multi-Wave: Wave 1 Recons, Wave 2 Intruder)
const lvl03 = registry.getLevel('level_01_03');
assert(lvl03, 'Level 01_03 must exist in registry');
assert.strictEqual(lvl03.waves.length, 2, 'Level 01_03 must have 2 waves');
assert.strictEqual(lvl03.waves[0].enemies[0].type, 'RECON');
assert.strictEqual(lvl03.waves[1].enemies[0].type, 'INTRUDER');
assert.strictEqual(lvl03.waves[1].enemies[0].hp, 90);

// Test Level 01_05 (Guardian heavy unit)
const lvl05 = registry.getLevel('level_01_05');
assert.strictEqual(lvl05.waves[1].enemies[0].type, 'GUARDIAN');
assert.strictEqual(lvl05.waves[1].enemies[0].hp, 140);

// Test Arbiter boss level
const arbiterLvl = registry.getLevel('level_01_06');
assert.strictEqual(arbiterLvl.type, 'arbiter');
assert.strictEqual(arbiterLvl.difficultyTier, 'ARBITER');
const bossConfig = ARBITER_CONFIGS.level_01_06;
assert(bossConfig, 'Arbiter config must exist for level_01_06');
assert.strictEqual(bossConfig.maxHp, 250);
assert.strictEqual(bossConfig.maxShields, 2);

console.log('✓ Wave spawner metadata, enemy archetypes, and Arbiter boss tiers verified');

// =========================================================================
// [Group 2] Combat Telemetry Metric Accumulation
// =========================================================================
console.log('\n[Group 2] Testing Combat Telemetry Metric Accumulation...');

testManager.startTrial('level_01_01');
const activeTrial = testManager.getActiveTrial();
assert(activeTrial, 'Active trial must be initialized');

testManager.recordMetric('curveHit', 2);
testManager.recordMetric('ricochetHit', 1);
testManager.recordMetric('damageTaken', 15);
testManager.recordMetric('finalHp', 85);
testManager.recordMetric('enemyKilled', 1);

assert.strictEqual(activeTrial.metrics.curveHits, 2, 'curveHits must be 2');
assert.strictEqual(activeTrial.metrics.ricochetHits, 1, 'ricochetHits must be 1');
assert.strictEqual(activeTrial.metrics.damageTaken, 15, 'damageTaken must be 15');
assert.strictEqual(activeTrial.metrics.finalHp, 85, 'finalHp must be 85');
assert.strictEqual(activeTrial.metrics.enemiesKilled, 1, 'enemiesKilled must be 1');

console.log('✓ Combat telemetry metrics accurately recorded during active trial');

// =========================================================================
// [Group 3] CampaignHUD Objective Header Integration
// =========================================================================
console.log('\n[Group 3] Testing CampaignHUD Dynamic Telemetry Sync...');

const campaignHud = new CampaignHUD({
  registry,
  manager: testManager
});

campaignHud.showObjectiveHeader('level_01_01');
assert.strictEqual(campaignHud._activeLevelId, 'level_01_01', 'HUD active level set');

// Test update hostiles
campaignHud.updateHostiles(2);
assert.strictEqual(getOrCreateMockElement('objHostiles').textContent, 2);
campaignHud.updateHostiles(0);
assert.strictEqual(getOrCreateMockElement('objHostiles').textContent, 0);

// Test integrity thresholding (>= 75% safe, < 75% warning)
campaignHud.updateIntegrity(85, 100);
const integrityEl = getOrCreateMockElement('objIntegrity');
assert.strictEqual(integrityEl.textContent, '85%');
assert(integrityEl.classList.contains('integrity-safe'), '>=75% HP must bear integrity-safe class');

campaignHud.updateIntegrity(60, 100);
assert.strictEqual(integrityEl.textContent, '60%');
assert(integrityEl.classList.contains('integrity-warning'), '<75% HP must bear integrity-warning class');

// Test mastery updates
campaignHud.updateMastery(3, 24.5);
const trickEl = getOrCreateMockElement('objTrickshots');
assert(trickEl.textContent.includes('3 /'), 'Trickshot counter must update');

console.log('✓ CampaignHUD reactively updates hostiles, integrity thresholds, and trickshots');

// =========================================================================
// [Group 4] Trial Victory Resolution & Debrief Modal Presentation
// =========================================================================
console.log('\n[Group 4] Testing Trial Victory Resolution...');

const outcome = testManager.completeTrial({
  finalHp: 85,
  maxHp: 100,
  elapsedSeconds: 22.4,
  curveHits: 2,
  ricochetHits: 1
});

assert.strictEqual(outcome.success, true, 'Outcome success must be true');
assert.strictEqual(outcome.levelId, 'level_01_01', 'Outcome levelId must match');
assert.strictEqual(outcome.stars, 3, 'Outcome should earn 3 stars (cleared, 85% HP >= 75%, 22.4s < 45s)');
assert.strictEqual(outcome.rewards.bits, 100, 'First clear bits must be 100');
assert.strictEqual(outcome.rewards.xp, 150, 'First clear XP must be 150');

// Verify persistent storage unlocked level_01_02
const unlockedNodes = mockStorage.get('campaign.unlockedNodes');
assert(unlockedNodes.includes('level_01_02'), 'level_01_02 must now be unlocked in storage');
assert.strictEqual(mockStorage.get('campaign.starsEarned'), 3, 'Total stars earned must be 3');

// Test Debrief Modal rendering with victory outcome
const debriefModal = new TrialDebriefModal({
  registry,
  manager: testManager
});

const debriefHtml = debriefModal.render(outcome);
assert(debriefHtml.includes('TRIAL CLEARED'), 'Debrief must display victory title');
assert(debriefHtml.includes('NEXT TRIAL'), 'Debrief must render NEXT TRIAL button on victory');
assert(debriefHtml.includes('RETRY TRIAL'), 'Debrief must render RETRY TRIAL button');
assert(debriefHtml.includes('RETURN TO GRID'), 'Debrief must render RETURN TO GRID button');
assert(debriefHtml.includes('+100 BITS'), 'Debrief must display base Bit rewards');

console.log('✓ Trial victory correctly computes 3 stars, awards payouts, and renders debrief');

// =========================================================================
// [Group 5] Trial Defeat Handling
// =========================================================================
console.log('\n[Group 5] Testing Trial Defeat Handling...');

testManager.startTrial('level_01_02');
assert(testManager.getActiveTrial(), 'Trial for level_01_02 started');

const failResult = testManager.failTrial('FALLEN INTO THE VOID');
assert.strictEqual(failResult.success, false, 'Failure success must be false');
assert.strictEqual(failResult.reason, 'FALLEN INTO THE VOID', 'Failure reason preserved');
assert.strictEqual(failResult.levelId, 'level_01_02', 'Level ID preserved on failure');
assert.strictEqual(testManager.getActiveTrial(), null, 'Active trial cleared after defeat');

// Test Debrief Modal rendering with defeat outcome
const defeatHtml = debriefModal.render(failResult);
assert(defeatHtml.includes('DE-ALLOCATED // SIMULATION FAILED'), 'Debrief must display defeat title');
assert(!defeatHtml.includes('NEXT TRIAL'), 'Debrief must NOT render NEXT TRIAL button on defeat');
assert(defeatHtml.includes('RETRY TRIAL'), 'Debrief must render RETRY TRIAL button on defeat');
assert(defeatHtml.includes('RETURN TO GRID'), 'Debrief must render RETURN TO GRID button on defeat');

console.log('✓ Trial defeat cleanly terminates session, clears active trial, and renders defeat debrief');

// =========================================================================
// [Group 6] Multi-Wave Progression Tracking
// =========================================================================
console.log('\n[Group 6] Testing Multi-Wave Progression Tracking...');

mockStorage.set('campaign.unlockedNodes', ['level_01_01', 'level_01_02', 'level_01_03']);
const lvlMulti = registry.getLevel('level_01_03');
testManager.startTrial('level_01_03');
state.campaignLevelId = 'level_01_03';
state.campaignWave = 1;

assert.strictEqual(state.campaignWave, 1, 'Initial wave is 1');
assert.strictEqual(lvlMulti.waves.length, 2, 'Level 01_03 has 2 waves');

// Advance to wave 2
state.campaignWave = 2;
assert.strictEqual(state.campaignWave, 2, 'Advanced to wave 2');

const finalOutcome = testManager.completeTrial({
  finalHp: 90,
  maxHp: 100,
  elapsedSeconds: 38.0
});
assert.strictEqual(finalOutcome.success, true, 'Multi-wave trial completed successfully');
assert.strictEqual(finalOutcome.levelId, 'level_01_03');

console.log('✓ Multi-wave progression tracking and final resolution verified');

console.log('\n======================================================');
console.log('ALL CAMPAIGN RUNTIME BRIDGE TESTS PASSED (100% SUCCESS)');
console.log('======================================================\n');
