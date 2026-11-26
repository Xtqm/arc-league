/**
 * spark_vault_manager.test.js
 * Unit tests for SparkVaultManager:
 * - Deterministic weekly UTC rotation of 1-3 UNLOCK_TYPES.SPARKS items
 * - Repeat appearances across weeks
 * - Disc Dark Matter (75 Sparks) & Void Shuriken (100 Sparks) pricing
 * - Atomic purchase via EconomyManager.spendSparks + ArmoryManager.unlockRewardItem
 * - Purchase rejection for items outside active rotation or insufficient Sparks
 */

import assert from 'assert';
import { StorageManager } from '../../src/core/storage/StorageManager.js';
import { EconomyManager } from '../../src/core/economy/EconomyManager.js';
import { ArmoryManager } from '../../src/armory/ArmoryManager.js';
import { ARMORY_CATEGORIES, UNLOCK_TYPES } from '../../src/armory/ArmoryCatalog.js';
import { WEEK_MS } from '../../src/events/ApexTrialRegistry.js';
import { SparkVaultManager, SparkVaultEvents } from '../../src/events/SparkVaultManager.js';

console.log('--- Running SparkVaultManager Test Suite ---');

function createHarness(options = {}) {
  const storage = new StorageManager({
    storageKey: `tron_test_vault_${Math.random().toString(36).slice(2)}`,
    backupKey: `tron_test_vault_bak_${Math.random().toString(36).slice(2)}`
  });
  storage.load();

  const economy = new EconomyManager({ storage });
  const armory = new ArmoryManager({ storage, economy });

  let nowMs = options.initialNowMs ?? Date.UTC(2026, 0, 5, 12, 0, 0);

  const vault = new SparkVaultManager({
    economy,
    armory,
    nowFn: () => nowMs,
    getEligibleItemsFn: options.getEligibleItemsFn || null
  });

  return {
    storage,
    economy,
    armory,
    vault,
    setNowMs: (v) => { nowMs = v; }
  };
}

// 1. Deterministic weekly UTC rotation (1-3 items) & repeat appearances across weeks
{
  const syntheticPool = [
    { id: 'disc_hex_dark_matter', displayName: 'Dark Matter', category: ARMORY_CATEGORIES.DISC_SKINS, unlockType: UNLOCK_TYPES.SPARKS, cost: 75 },
    { id: 'disc_shuriken_void', displayName: 'Void Shuriken', category: ARMORY_CATEGORIES.DISC_SKINS, unlockType: UNLOCK_TYPES.SPARKS, cost: 100 },
    { id: 'disc_prestige_alpha', displayName: 'Alpha Prestige', category: ARMORY_CATEGORIES.DISC_SKINS, unlockType: UNLOCK_TYPES.SPARKS, cost: 45 },
    { id: 'disc_prestige_beta', displayName: 'Beta Prestige', category: ARMORY_CATEGORIES.DISC_SKINS, unlockType: UNLOCK_TYPES.SPARKS, cost: 50 }
  ];

  const { vault, setNowMs } = createHarness({
    getEligibleItemsFn: () => syntheticPool
  });

  const week10 = 10 * WEEK_MS + 3600 * 1000;
  setNowMs(week10);
  const rot1 = vault.getActiveRotation();
  const rot1Repeat = vault.getActiveRotation();

  assert.ok(rot1.length >= 1 && rot1.length <= 3, `Expected 1-3 items, got ${rot1.length}`);
  assert.deepStrictEqual(
    rot1.map((i) => i.id),
    rot1Repeat.map((i) => i.id),
    'Rotation within the same UTC week must be deterministic'
  );

  // Verify items can reappear across future weeks
  const appearanceCounts = new Map();
  for (let w = 0; w < 24; w++) {
    const items = vault.getActiveRotation(w * WEEK_MS + 1000);
    assert.ok(items.length >= 1 && items.length <= 3, `Week ${w} must have 1-3 items`);
    for (const item of items) {
      appearanceCounts.set(item.id, (appearanceCounts.get(item.id) || 0) + 1);
    }
  }

  for (const item of syntheticPool) {
    assert.ok((appearanceCounts.get(item.id) || 0) >= 2, `Expected ${item.id} to reappear across 24 weeks`);
  }
}

// 2. Default catalog integration: Dark Matter (75) & Void Shuriken (100)
{
  const { economy, armory, vault } = createHarness();
  const pool = vault.getEligiblePool();
  const darkMatter = pool.find((i) => i.id === 'disc_hex_dark_matter');
  const voidShuriken = pool.find((i) => i.id === 'disc_shuriken_void');

  assert.ok(darkMatter, 'Dark Matter must be in eligible Spark Vault pool');
  assert.strictEqual(darkMatter.cost, 75);
  assert.ok(voidShuriken, 'Void Shuriken must be in eligible Spark Vault pool');
  assert.strictEqual(voidShuriken.cost, 100);

  // Find a week where disc_hex_dark_matter is active
  let targetWeekMs = null;
  for (let w = 0; w < 20; w++) {
    const ts = w * WEEK_MS + 1000;
    if (vault.isItemInRotation('disc_hex_dark_matter', ts)) {
      targetWeekMs = ts;
      break;
    }
  }
  assert.ok(targetWeekMs !== null, 'Should find a week featuring disc_hex_dark_matter');

  // Insufficient Sparks rejection
  const failCheck = vault.canPurchase('disc_hex_dark_matter', targetWeekMs);
  assert.strictEqual(failCheck.allowed, false);
  assert.strictEqual(failCheck.reason, 'INSUFFICIENT_SPARKS');

  const failPurchase = vault.purchaseItem('disc_hex_dark_matter', targetWeekMs);
  assert.strictEqual(failPurchase.success, false);
  assert.strictEqual(failPurchase.reason, 'INSUFFICIENT_SPARKS');
  assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.DISC_SKINS, 'disc_hex_dark_matter'), false);

  // Grant 100 Sparks and purchase Dark Matter (75 Sparks)
  economy.awardSparks(100, 'test_grant');
  let purchasedEvents = 0;
  vault.on(SparkVaultEvents.VAULT_PURCHASED, () => { purchasedEvents += 1; });

  const okPurchase = vault.purchaseItem('disc_hex_dark_matter', targetWeekMs);
  assert.strictEqual(okPurchase.success, true);
  assert.strictEqual(okPurchase.sparksSpent, 75);
  assert.strictEqual(economy.getSparks(), 25);
  assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.DISC_SKINS, 'disc_hex_dark_matter'), true);
  assert.strictEqual(purchasedEvents, 1);

  // Cannot re-purchase already owned item
  const dupPurchase = vault.purchaseItem('disc_hex_dark_matter', targetWeekMs);
  assert.strictEqual(dupPurchase.success, false);
  assert.strictEqual(dupPurchase.reason, 'ALREADY_OWNED');
  assert.strictEqual(economy.getSparks(), 25);
}

// 3. Reject purchase for item NOT in active weekly rotation
{
  const syntheticPool = [
    { id: 'disc_hex_dark_matter', displayName: 'Dark Matter', category: ARMORY_CATEGORIES.DISC_SKINS, unlockType: UNLOCK_TYPES.SPARKS, cost: 75 },
    { id: 'disc_shuriken_void', displayName: 'Void Shuriken', category: ARMORY_CATEGORIES.DISC_SKINS, unlockType: UNLOCK_TYPES.SPARKS, cost: 100 },
    { id: 'disc_prestige_alpha', displayName: 'Alpha Prestige', category: ARMORY_CATEGORIES.DISC_SKINS, unlockType: UNLOCK_TYPES.SPARKS, cost: 45 },
    { id: 'disc_prestige_beta', displayName: 'Beta Prestige', category: ARMORY_CATEGORIES.DISC_SKINS, unlockType: UNLOCK_TYPES.SPARKS, cost: 50 }
  ];

  const { economy, armory, vault } = createHarness({
    getEligibleItemsFn: () => syntheticPool
  });
  economy.awardSparks(500, 'test_grant');

  // Find a week where disc_shuriken_void is NOT in active rotation
  let offWeekMs = null;
  for (let w = 0; w < 30; w++) {
    const ts = w * WEEK_MS + 1000;
    if (!vault.isItemInRotation('disc_shuriken_void', ts)) {
      offWeekMs = ts;
      break;
    }
  }
  assert.ok(offWeekMs !== null, 'Should find a week where disc_shuriken_void is not active');

  const offWeekPurchase = vault.purchaseItem('disc_shuriken_void', offWeekMs);
  assert.strictEqual(offWeekPurchase.success, false);
  assert.strictEqual(offWeekPurchase.reason, 'NOT_IN_ACTIVE_ROTATION');
  assert.strictEqual(economy.getSparks(), 500);
  assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.DISC_SKINS, 'disc_shuriken_void'), false);
}

// 4. Snapshot and countdown calculation
{
  const { vault } = createHarness();
  const ts = 5 * WEEK_MS + 1000;
  const snap = vault.getSnapshot(ts);
  assert.strictEqual(snap.weekIndex, 5);
  assert.strictEqual(snap.msUntilRotation, WEEK_MS - 1000);
  assert.ok(Array.isArray(snap.items) && snap.items.length >= 1);
}

console.log('✓ All SparkVaultManager tests passed!');
