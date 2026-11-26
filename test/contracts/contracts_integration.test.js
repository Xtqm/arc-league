/**
 * contracts_integration.test.js
 * End-to-end integration tests for the Contracts System:
 * - Full Tier 1 -> Tier 5 dual-gate progression & scarce Spark/AC/XP payouts
 * - Storage telemetry mutations (totalDerezzes, discsDeflected)
 * - Cross-device CloudSyncResolver merge + StorageManager.importState + ContractManager reconciliation
 * - Monotonic invariant enforcement against contract regressions
 * - ContractsModal Sweep claim & reactive #contractsBtn pip integration
 */

import assert from 'assert';
import { StorageManager } from '../../src/core/storage/StorageManager.js';
import { CloudSyncResolver, evaluateMonotonicInvariants } from '../../src/core/storage/CloudSyncResolver.js';
import { EconomyManager } from '../../src/core/economy/EconomyManager.js';
import { ContractManager } from '../../src/contracts/ContractManager.js';
import { CONTRACT_METRICS, CAREER_TIER_REWARDS } from '../../src/contracts/ContractRegistry.js';
import { ContractsModal } from '../../src/ui/modals/ContractsModal.js';
import { updateContractsPip } from '../../src/ui/menus.js';

console.log('--- Running Contracts System End-to-End Integration Test Suite ---');

// =========================================================================
// Group 1: Full Tier 1 -> Tier 5 Dual-Gate Career Progression Chain
// =========================================================================
console.log('\n[Group 1] Testing Full Tier 1 -> Tier 5 Dual-Gate Progression...');
{
  const storage = new StorageManager({
    storageKey: `tron_integ_tier_${Math.random().toString(36).slice(2)}`,
    backupKey: `tron_integ_tier_bak_${Math.random().toString(36).slice(2)}`
  });
  storage.load();
  storage.set('player.level', 5, { immediate: true });
  storage.set('stats.swarmHighestWave', 5, { immediate: true });

  const economy = new EconomyManager({ storage });
  const manager = new ContractManager({
    storage,
    economy,
    duelBridge: null,
    swarmBridge: null,
    campaignManager: null,
    playFanfareFn: () => {},
    nowFn: () => Date.parse('2026-11-26T15:00:00.000Z'),
    rngFn: () => 0.25
  });
  manager.init();

  const gates = [
    { tier: 1, quota: 6, level: 10, nextTier: 2 },
    { tier: 2, quota: 9, level: 18, nextTier: 3 },
    { tier: 3, quota: 12, level: 28, nextTier: 4 },
    { tier: 4, quota: 15, level: 40, nextTier: 5 }
  ];

  for (const g of gates) {
    storage.set('player.level', g.level, { immediate: true });
    for (let i = 0; i < g.quota; i++) {
      const slot = manager.getCareerState().slots[0];
      assert.strictEqual(slot.tier, g.tier, `Expected Tier ${g.tier} before completing quota ${i + 1}/${g.quota}`);
      manager.recordMetric(slot.metricKey, slot.target);
      const sparksBefore = economy.getSparks();
      const creditsBefore = economy.getCredits();
      const res = manager.claimCareerContract(0);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.reward.sparks, CAREER_TIER_REWARDS[g.tier].sparks);
      assert.strictEqual(res.reward.credits, CAREER_TIER_REWARDS[g.tier].credits);
      assert.strictEqual(economy.getSparks() - sparksBefore, CAREER_TIER_REWARDS[g.tier].sparks);
      assert.ok(economy.getCredits() - creditsBefore >= CAREER_TIER_REWARDS[g.tier].credits);

      if (i === g.quota - 1) {
        assert.ok(res.promoted && res.promoted.newTier === g.nextTier, `Expected promotion to Tier ${g.nextTier}`);
        assert.strictEqual(res.nextSlot.tier, g.nextTier);
      } else {
        assert.strictEqual(res.promoted, null);
      }
    }
  }

  // Verify Tier 5 Apex loops endlessly with 2500 AC + 5 Sparks + 1800 XP
  const apexState = manager.getCareerState();
  assert.strictEqual(apexState.tier, 5);
  assert.strictEqual(apexState.tierName, 'Apex');
  assert.strictEqual(apexState.promotionGate, null);

  for (let i = 0; i < 4; i++) {
    const slot = manager.getCareerState().slots[0];
    assert.strictEqual(slot.tier, 5);
    manager.recordMetric(slot.metricKey, slot.target);
    const res = manager.claimCareerContract(0);
    assert.strictEqual(res.success, true);
    assert.deepStrictEqual(res.reward, { ...CAREER_TIER_REWARDS[5] });
    assert.strictEqual(res.nextSlot.tier, 5);
  }

  manager.teardown();
  storage.destroy();
}
console.log('✓ Full Tier 1 -> Tier 5 dual-gate promotion chain and Tier 5 Apex endless rotation verified');

// =========================================================================
// Group 2: Multi-Device Cloud Merge & Monotonic Invariants
// =========================================================================
console.log('\n[Group 2] Testing Cloud Sync Merge & Monotonic Invariants...');
{
  const keyA = `tron_integ_devA_${Math.random().toString(36).slice(2)}`;
  const keyB = `tron_integ_devB_${Math.random().toString(36).slice(2)}`;
  const storeA = new StorageManager({ storageKey: keyA, backupKey: `${keyA}.bak` });
  const storeB = new StorageManager({ storageKey: keyB, backupKey: `${keyB}.bak` });
  storeA.load();
  storeB.load();

  // Device A: Lv 10, Swarm W6, Tier 2 Career unlocked, completed 1 daily slot
  storeA.set('player.id', 'pilot-sync-01', { immediate: true });
  storeA.set('player.level', 10, { immediate: true });
  storeA.set('stats.swarmHighestWave', 6, { immediate: true });
  const econA = new EconomyManager({ storage: storeA });
  const mgrA = new ContractManager({
    storage: storeA,
    economy: econA,
    duelBridge: null,
    swarmBridge: null,
    campaignManager: null,
    playFanfareFn: () => {},
    nowFn: () => Date.parse('2026-11-26T14:00:00.000Z'),
    rngFn: () => 0
  });
  mgrA.init();

  // Force identical daily templates across A and B for same-day convergence test
  const sharedDaily = storeA.get('contracts.daily');
  sharedDaily.slots[0].progress = sharedDaily.slots[0].target;
  sharedDaily.slots[0].status = 'claimable';
  storeA.set('contracts.daily', sharedDaily, { immediate: true });

  const careerA = storeA.get('contracts.career');
  careerA.tier = 2;
  careerA.tierCompletions = 2;
  careerA.slots[0].tier = 2;
  careerA.slots[0].progress = careerA.slots[0].target;
  careerA.slots[0].status = 'claimable'; // Pending Spark reward on Device A!
  storeA.set('contracts.career', careerA, { immediate: true });
  storeA.state.lastActiveAt = 1000;

  // Device B: newer session on same UTC day, completed daily slot 1 & 2, Career still Tier 1
  storeB.set('player.id', 'pilot-sync-01', { immediate: true });
  storeB.set('player.level', 8, { immediate: true });
  storeB.set('stats.swarmHighestWave', 5, { immediate: true });
  const econB = new EconomyManager({ storage: storeB });
  const mgrB = new ContractManager({
    storage: storeB,
    economy: econB,
    duelBridge: null,
    swarmBridge: null,
    campaignManager: null,
    playFanfareFn: () => {},
    nowFn: () => Date.parse('2026-11-26T16:00:00.000Z'),
    rngFn: () => 0
  });
  mgrB.init();

  const dailyB = JSON.parse(JSON.stringify(sharedDaily));
  dailyB.slots[0].progress = 0;
  dailyB.slots[0].status = 'active';
  dailyB.slots[1].progress = dailyB.slots[1].target;
  dailyB.slots[1].status = 'claimable';
  dailyB.slots[2].progress = dailyB.slots[2].target;
  dailyB.slots[2].status = 'claimable';
  storeB.set('contracts.daily', dailyB, { immediate: true });
  storeB.state.lastActiveAt = 2000;

  // Resolve via CloudSyncResolver and import into Device B
  const resolved = CloudSyncResolver.resolve(storeB.state, storeA.state);
  storeB.importState(resolved, { source: 'cloud_sync', immediate: true });

  assert.strictEqual(mgrB.getCareerState().unlocked, true);
  assert.strictEqual(mgrB.getCareerState().tier, 2, 'Higher Career tier from Device A preserved');
  assert.strictEqual(mgrB.getCareerState().slots[0].claimable, true, 'Pending Tier 2 Spark reward preserved');
  assert.strictEqual(mgrB.isDailySweepClaimable(), true, 'Combined 3/3 Daily completion enables Sweep bonus');

  // Monotonic invariants must reject contract regressions
  const badTierDrop = JSON.parse(JSON.stringify(resolved));
  badTierDrop.contracts.career.tier = 1;
  const violations = evaluateMonotonicInvariants(badTierDrop, resolved, 'Resolved');
  assert.ok(violations.some((v) => v.includes('Career contract tier decreased')));

  const badUnlockDrop = JSON.parse(JSON.stringify(resolved));
  badUnlockDrop.contracts.career.unlocked = false;
  const unlockViolations = evaluateMonotonicInvariants(badUnlockDrop, resolved, 'Resolved');
  assert.ok(unlockViolations.some((v) => v.includes('Career contracts unlocked flag was revoked')));

  mgrA.teardown();
  mgrB.teardown();
  storeA.destroy();
  storeB.destroy();
}
console.log('✓ Multi-device CloudSyncResolver merge and monotonic invariant enforcement verified');

// =========================================================================
// Group 3: Storage Stats Telemetry -> Sweep Bonus -> Modal + Pip Sync
// =========================================================================
console.log('\n[Group 3] Testing Stats Mutations, Sweep Claim & Pip Lifecycle...');
{
  const prevDoc = global.document;
  const prevWin = global.window;

  const btn = {
    id: 'contractsBtn',
    children: [],
    querySelector(sel) {
      return sel === '.neon-pip-dot' ? this.children.find((c) => c.className === 'neon-pip-dot') || null : null;
    },
    appendChild(child) {
      this.children.push(child);
      child.parentNode = this;
    },
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) this.children.splice(idx, 1);
    }
  };

  const createdById = new Map();
  global.document = {
    body: {
      style: {},
      appendChild(el) {
        if (el && el.id) createdById.set(el.id, el);
      }
    },
    getElementById: (id) => (id === 'contractsBtn' ? btn : (createdById.get(id) || null)),
    createElement: (tag) => ({
      tagName: tag.toUpperCase(),
      id: '',
      style: { display: 'none' },
      className: '',
      innerHTML: '',
      textContent: '',
      title: '',
      setAttribute() {},
      addEventListener() {},
      querySelector: () => null,
      querySelectorAll: () => [],
      remove() {
        if (this.parentNode) this.parentNode.removeChild(this);
      }
    })
  };
  global.window = { addEventListener() {}, removeEventListener() {} };

  const storage = new StorageManager({
    storageKey: `tron_integ_sweep_${Math.random().toString(36).slice(2)}`,
    backupKey: `tron_integ_sweep_bak_${Math.random().toString(36).slice(2)}`
  });
  storage.load();
  storage.set('player.level', 4, { immediate: true });

  const economy = new EconomyManager({ storage });
  const manager = new ContractManager({
    storage,
    economy,
    duelBridge: null,
    swarmBridge: null,
    campaignManager: null,
    playFanfareFn: () => {},
    nowFn: () => Date.parse('2026-11-26T18:00:00.000Z'),
    rngFn: () => 0
  });
  manager.init();

  // Force a daily slot tracking DEALLOCATIONS and another tracking DISCS_DEFLECTED
  const raw = storage.get('contracts');
  raw.daily.slots = [
    { id: 'daily_derez_8', templateId: 'daily_derez_8', type: 'daily', slotIndex: 0, metricKey: CONTRACT_METRICS.DEALLOCATIONS, progress: 0, target: 8, status: 'active', claimed: false },
    { id: 'daily_deflect_5', templateId: 'daily_deflect_5', type: 'daily', slotIndex: 1, metricKey: CONTRACT_METRICS.DISCS_DEFLECTED, progress: 0, target: 5, status: 'active', claimed: false },
    { id: 'daily_tour_clear_1', templateId: 'daily_tour_clear_1', type: 'daily', slotIndex: 2, metricKey: CONTRACT_METRICS.TOUR_CLEAR, progress: 0, target: 1, status: 'active', claimed: false }
  ];
  storage.set('contracts', raw, { immediate: true });

  // Mutate StorageManager stats directly (simulating Bot.js derezzes)
  storage.set('stats.totalDerezzes', 8, { immediate: true });
  storage.set('stats.discsDeflected', 5, { immediate: true });
  manager.recordMetric(CONTRACT_METRICS.TOUR_CLEAR, 1);

  assert.strictEqual(manager.getPendingClaimCount(), 4);
  assert.strictEqual(updateContractsPip(manager), true);

  const modal = new ContractsModal({ contracts: manager });
  modal.show();
  assert.ok(modal.container.innerHTML.includes('[ CLAIM 500 AC SWEEP ]'));

  // Claim all 3 dailies + 500 AC sweep
  const creditsBefore = economy.getCredits();
  manager.claimDailyContract(0);
  manager.claimDailyContract(1);
  manager.claimDailyContract(2);
  const sweep = manager.claimDailySweep();
  assert.strictEqual(sweep.success, true);
  assert.strictEqual(economy.getCredits(), creditsBefore + 500);

  assert.strictEqual(updateContractsPip(manager), false);
  assert.strictEqual(btn.querySelector('.neon-pip-dot'), null);

  modal.hide({ skipMenuCallback: true });
  manager.teardown();
  storage.destroy();
  global.document = prevDoc;
  global.window = prevWin;
}
console.log('✓ Stats telemetry mutations, 500 AC sweep claim, and reactive pip lifecycle verified');

console.log('\n======================================================');
console.log('ALL CONTRACTS INTEGRATION TESTS PASSED (100% SUCCESS)');
console.log('======================================================\n');
