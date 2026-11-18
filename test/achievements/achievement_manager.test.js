/**
 * achievement_manager.test.js
 * Integration test suite for AchievementManager (SPEC-ACHIEVE-001).
 */

import assert from 'assert';
import {
  AchievementManager,
  AchievementEvents
} from '../../src/achievements/AchievementManager.js';
import { StorageEvents } from '../../src/core/storage/schema.js';

console.log('--- Running Achievement Manager Test Suite (SPEC-ACHIEVE-001) ---');

// Mock in-memory storage manager
function createMockStorage(initialState = {}) {
  const state = {
    version: '1.0.0',
    player: {
      currency: { bits: 0, sparks: 0 }
    },
    inventory: {
      discSkins: ['disc_default'],
      chassisSkins: ['chassis_default'],
      discs: ['disc_default'],
      cosmetics: ['chassis_default']
    },
    achievements: [],
    stats: {
      totalDerezzes: 0,
      parriesExecuted: 0,
      curveEliminations: 0,
      swarmHighestWave: 1,
      highestWave: 1
    },
    campaign: {
      levelRecords: {},
      starsEarned: 0
    },
    ...initialState
  };

  const listeners = new Map();

  return {
    isInitialized: true,
    state,
    load() { return state; },
    get(path, defaultValue) {
      if (!path) return state;
      const parts = path.split('.');
      let curr = state;
      for (const p of parts) {
        if (curr === null || curr === undefined) return defaultValue;
        curr = curr[p];
      }
      return curr !== undefined ? curr : defaultValue;
    },
    set(path, value) {
      const parts = path.split('.');
      let curr = state;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!curr[parts[i]]) curr[parts[i]] = {};
        curr = curr[parts[i]];
      }
      curr[parts[parts.length - 1]] = value;
      if (listeners.has(StorageEvents.MUTATED)) {
        for (const fn of listeners.get(StorageEvents.MUTATED)) {
          fn({ path, value });
        }
      }
    },
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
      return () => listeners.get(event).delete(handler);
    }
  };
}

// Mock Economy Manager
function createMockEconomy() {
  let bits = 0;
  const history = [];
  return {
    getBits: () => bits,
    awardBits: (amount, source) => {
      bits += amount;
      history.push({ amount, source });
      return true;
    },
    getHistory: () => [...history]
  };
}

// Mock Armory Manager
function createMockArmory() {
  const unlocked = new Set();
  return {
    unlockRewardItem: (category, itemId) => {
      unlocked.add(`${category}:${itemId}`);
      return true;
    },
    isUnlocked: (category, itemId) => unlocked.has(`${category}:${itemId}`),
    getUnlocked: () => Array.from(unlocked)
  };
}

// =========================================================================
// Test Group 1: Boot-Time Retroactive Reconciliation
// =========================================================================
console.log('\n[Group 1] Testing Boot-Time Retroactive Reconciliation...');

const initialStorage = createMockStorage({
  stats: {
    totalDerezzes: 10,
    parriesExecuted: 5,
    curveEliminations: 0,
    swarmHighestWave: 16
  },
  campaign: {
    levelRecords: {
      level_01_01: { stars: 3, completed: true, bestIntegrity: 0.9 },
      level_01_02: { stars: 3, completed: true, bestIntegrity: 0.8 },
      level_01_03: { stars: 3, completed: true, bestIntegrity: 0.75 },
      level_01_04: { stars: 3, completed: true, bestIntegrity: 0.95 },
      level_01_05: { stars: 3, completed: true, bestIntegrity: 0.8 },
      level_01_06: { stars: 3, completed: true, bestIntegrity: 0.85 }
    }
  }
});

const economy1 = createMockEconomy();
const armory1 = createMockArmory();
let toastCount = 0;
let fanfareCount1 = 0;

const manager1 = new AchievementManager({
  storage: initialStorage,
  economy: economy1,
  armory: armory1,
  onUnlockToast: () => { toastCount++; },
  playFanfareFn: () => { fanfareCount1++; }
});

// Boot the manager
manager1.init();

// ach_first_blood (10 derezzes >= 1), ach_swarm_survivor (wave 16 >= 15), ach_grid_one_master (18 stars)
// With claimable lifecycle, achievements are NOT auto-unlocked; they are CLAIMABLE upon boot!
assert.strictEqual(manager1.isUnlocked('ach_first_blood'), false);
assert.strictEqual(manager1.isUnlocked('ach_swarm_survivor'), false);
assert.strictEqual(manager1.isUnlocked('ach_grid_one_master'), false);

// Pending claim count and claimable list
assert.strictEqual(manager1.getPendingClaimCount(), 3);
const claimable1 = manager1.getClaimableAchievements();
assert.strictEqual(claimable1.length, 3);
assert.deepStrictEqual(claimable1.map(a => a.id).sort(), ['ach_first_blood', 'ach_grid_one_master', 'ach_swarm_survivor'].sort());

// No rewards granted prior to explicit claim
assert.strictEqual(economy1.getBits(), 0);
assert.strictEqual(armory1.isUnlocked('discSkins', 'disc_corrupted_void'), false);
assert.strictEqual(toastCount, 0, 'No toasts should be shown during silent boot reconciliation');
assert.strictEqual(fanfareCount1, 0, 'No audio fanfare should be played during boot reconciliation');

// Claim individual achievement: ach_first_blood
const claimedFirstBlood = manager1.claimReward('ach_first_blood');
assert.strictEqual(claimedFirstBlood, true);
assert.strictEqual(manager1.isUnlocked('ach_first_blood'), true);
assert.strictEqual(economy1.getBits(), 100);
assert.strictEqual(fanfareCount1, 1, 'Crystal fanfare should play on individual claim');
assert.strictEqual(manager1.getPendingClaimCount(), 2);

// Claim remaining achievements in batch: ach_swarm_survivor and ach_grid_one_master
const batchClaimed1 = manager1.claimAllRewards();
assert.strictEqual(batchClaimed1.length, 2);
assert.strictEqual(manager1.getPendingClaimCount(), 0);
assert.strictEqual(manager1.isUnlocked('ach_swarm_survivor'), true);
assert.strictEqual(manager1.isUnlocked('ach_grid_one_master'), true);

// Rewards: 100 + 750 + 1000 = 1850 Bits
assert.strictEqual(economy1.getBits(), 1850);

// Cosmetic rewards unlocked
assert.ok(armory1.isUnlocked('discSkins', 'disc_corrupted_void'));
assert.ok(armory1.isUnlocked('chassisSkins', 'chassis_arbiter'));
assert.strictEqual(fanfareCount1, 2, 'Fanfare should play once for batch claim');

console.log('✓ Group 1: Retroactive boot reconciliation, claimable status, and claim pipeline verified.');

// =========================================================================
// Test Group 2: Idempotence & Duplicate Prevention
// =========================================================================
console.log('\n[Group 2] Testing Duplicate Unlock & Reward Prevention...');

const historyLengthBefore = economy1.getHistory().length;
const newlyReconciled = manager1.reconcileAchievements();
assert.strictEqual(newlyReconciled.length, 0, 'No new achievements should be claimable');
assert.strictEqual(economy1.getHistory().length, historyLengthBefore, 'No duplicate rewards should be granted');

// Explicit duplicate claim calls return false / empty
assert.strictEqual(manager1.claimReward('ach_first_blood'), false);
assert.strictEqual(manager1.claimAllRewards().length, 0);
assert.strictEqual(manager1.unlock('ach_first_blood'), false);

console.log('✓ Group 2: Duplicate prevention verified.');

// =========================================================================
// Test Group 3: Runtime Reactive Mutation Evaluation (Distraction-Free)
// =========================================================================
console.log('\n[Group 3] Testing Runtime Reactive Telemetry Mutation (Distraction-Free Combat)...');

const economy2 = createMockEconomy();
const armory2 = createMockArmory();
const storage2 = createMockStorage();
const toastEvents = [];
const unlockEvents = [];
let fanfareCount2 = 0;

const manager2 = new AchievementManager({
  storage: storage2,
  economy: economy2,
  armory: armory2,
  onUnlockToast: (ach) => { toastEvents.push(ach); },
  playFanfareFn: () => { fanfareCount2++; }
});

manager2.on(AchievementEvents.ACHIEVEMENT_UNLOCKED, (e) => {
  unlockEvents.push(e);
});

manager2.init();
assert.strictEqual(manager2.getCompletionStats().unlocked, 0);
assert.strictEqual(manager2.getPendingClaimCount(), 0);

// Execute 50 parries in combat
storage2.set('stats.parriesExecuted', 50);

// Mid-combat check: criteria satisfied, but NO toast and NO mid-combat unlock
assert.strictEqual(manager2.isUnlocked('ach_parry_king'), false, 'Should remain locked until claimed');
assert.strictEqual(manager2.getPendingClaimCount(), 1, 'Should transition to claimable state');
assert.strictEqual(economy2.getBits(), 0, 'No bits awarded mid-combat');
assert.strictEqual(toastEvents.length, 0, 'Zero toasts during active combat');
assert.strictEqual(fanfareCount2, 0, 'Zero audio fanfare during active combat');
assert.strictEqual(unlockEvents.length, 0, 'No unlock events until explicitly claimed');

// Complete a trial with 100% integrity
storage2.set('campaign.levelRecords.level_01_01', {
  completed: true,
  bestIntegrity: 1.0,
  stars: 3
});

assert.strictEqual(manager2.isUnlocked('ach_untouchable'), false);
assert.strictEqual(manager2.getPendingClaimCount(), 2);
assert.strictEqual(toastEvents.length, 0, 'Toasts remain suppressed mid-combat');
assert.strictEqual(fanfareCount2, 0, 'Fanfare remains suppressed mid-combat');

// Player visits Trophy Matrix and claims ach_parry_king
const claimedParry = manager2.claimReward('ach_parry_king');
assert.strictEqual(claimedParry, true);
assert.strictEqual(manager2.isUnlocked('ach_parry_king'), true);
assert.strictEqual(economy2.getBits(), 250);
assert.strictEqual(manager2.getPendingClaimCount(), 1);
assert.strictEqual(fanfareCount2, 1);
assert.strictEqual(unlockEvents.length, 1);
assert.strictEqual(unlockEvents[0].achievementId, 'ach_parry_king');

// Player claims rest in batch
const claimedBatch = manager2.claimAllRewards();
assert.deepStrictEqual(claimedBatch, ['ach_untouchable']);
assert.strictEqual(manager2.isUnlocked('ach_untouchable'), true);
assert.strictEqual(economy2.getBits(), 250 + 500); // 750 Bits total
assert.strictEqual(manager2.getPendingClaimCount(), 0);
assert.strictEqual(fanfareCount2, 2);

console.log('✓ Group 3: Distraction-free combat evaluation and Trophy Matrix claiming verified.');

// =========================================================================
// Test Group 4: Matrix Status & Completion Percentage
// =========================================================================
console.log('\n[Group 4] Testing Matrix Status and Completion Stats...');

const stats = manager2.getCompletionStats();
assert.strictEqual(stats.total, 6);
assert.strictEqual(stats.unlocked, 2); // ach_parry_king and ach_untouchable
assert.strictEqual(stats.percentage, 33); // 2/6 = 33%

const matrix = manager2.getMatrixStatus();
assert.strictEqual(matrix.length, 6);

const parryStatus = matrix.find(a => a.id === 'ach_parry_king');
assert.ok(parryStatus);
assert.strictEqual(parryStatus.unlocked, true);
assert.strictEqual(parryStatus.status, 'CLAIMED');
assert.strictEqual(parryStatus.progress.ratio, 1.0);

const curveStatus = matrix.find(a => a.id === 'ach_curve_god');
assert.ok(curveStatus);
assert.strictEqual(curveStatus.unlocked, false);
assert.strictEqual(curveStatus.status, 'LOCKED');
assert.strictEqual(curveStatus.progress.ratio, 0);

// Test wildcard mutation handling
const storageWildcard = createMockStorage();
const managerWildcard = new AchievementManager({ storage: storageWildcard });
managerWildcard.init();
storageWildcard.state.stats.totalDerezzes = 1;
storageWildcard.set('*', storageWildcard.state);
assert.strictEqual(managerWildcard.getPendingClaimCount(), 1);
assert.strictEqual(managerWildcard.getClaimableAchievements()[0].id, 'ach_first_blood');
console.log('✓ Wildcard storage mutation evaluation verified.');

console.log('✓ Group 4: Matrix status and completion percentage validated.');

console.log('\n======================================================');
console.log('ALL ACHIEVEMENT MANAGER TESTS PASSED CLEANLY (100%)');
console.log('======================================================');
