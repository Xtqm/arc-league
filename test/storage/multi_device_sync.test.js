/**
 * multi_device_sync.test.js
 * Integration test validating end-to-end cross-device synchronization
 * of campaign progression, star mastery, arena map unlocks, and loadout.
 */

import assert from 'assert';
import { StorageManager, StorageEvents } from '../../src/core/storage/StorageManager.js';
import {
  CloudSyncResolver,
  saveStateToRow,
  rowToSaveState,
  fetchRemoteSaveState,
  upsertRemoteSaveState,
  evaluateMonotonicInvariants
} from '../../src/core/storage/CloudSyncResolver.js';
import { CampaignManager, CampaignEvents } from '../../src/campaign/CampaignManager.js';
import { ArmoryManager, ArmoryEvents } from '../../src/armory/ArmoryManager.js';
import { DuelMapSelector } from '../../src/ui/duel/DuelMapSelector.js';
import { getUnlockedArenaMaps } from '../../src/ui/arenaSelector.js';

console.log('--- Running Multi-Device Cross-Sync Integration Test Suite ---');

const TEST_USER_ID = 'test-pilot-multi-device-uuid-999';

// In-memory Supabase database mock with RLS enforcement
const remoteDatabase = new Map();
const mockSupabaseClient = {
  from(table) {
    assert.strictEqual(table, 'save_states');
    return {
      select() {
        return {
          eq(col, val) {
            return {
              async maybeSingle() {
                if (col === 'user_id' && remoteDatabase.has(val)) {
                  return { data: { ...remoteDatabase.get(val) }, error: null };
                }
                return { data: null, error: null };
              }
            };
          }
        };
      },
      upsert(rowPayload) {
        remoteDatabase.set(rowPayload.user_id, { ...rowPayload });
        return {
          select() {
            return {
              async maybeSingle() {
                return { data: { ...remoteDatabase.get(rowPayload.user_id) }, error: null };
              }
            };
          }
        };
      }
    };
  }
};

// ==========================================
// Scenario: Device A (Desktop PC) Setup
// ==========================================
const storageA = new StorageManager({ storageKey: 'tron_test_dev_a' });
storageA.reset();
storageA.set('player.id', TEST_USER_ID);
storageA.set('player.handle', 'PILOT_DESKTOP');
storageA.set('player.currency.bits', 1200);
storageA.set('player.level', 3);

// Device A progress: Cleared level_01_01 (3 stars), level_01_02 (2 stars)
storageA.set('campaign.completedNodes', ['level_01_01', 'level_01_02']);
storageA.set('campaign.unlockedNodes', ['level_01_01', 'level_01_02', 'level_01_03']);
storageA.set('campaign.unlockedGrids', ['grid_01']);
storageA.set('campaign.starsEarned', 5);
storageA.set('campaign.levelRecords', {
  level_01_01: { levelId: 'level_01_01', gridId: 'grid_01', stars: 3, bestTime: 18.4, highScore: 2400, completed: true },
  level_01_02: { levelId: 'level_01_02', gridId: 'grid_01', stars: 2, bestTime: 32.1, highScore: 1800, completed: true }
});
storageA.set('inventory.unlockedMaps', ['arena_grid_01']);
storageA.set('inventory.discs', ['disc_identity_default', 'disc_neon_cyan']);
storageA.set('inventory.cosmetics', ['trail_cyan_default', 'visor_classic']);
storageA.set('loadout.activeDisc', 'disc_neon_cyan');
storageA.set('loadout.activeArenaSkin', 'arena_grid_01');
storageA.state.lastActiveAt = 1000;
storageA.save({ immediate: true });

// Commit Device A state to Cloud Database
const rowA = saveStateToRow(storageA.state);
await upsertRemoteSaveState(storageA.state, mockSupabaseClient);
assert.ok(remoteDatabase.has(TEST_USER_ID), 'Remote database must hold Device A row');
console.log('✓ Device A committed initial save state to Supabase cloud table');

// ==========================================
// Scenario: Device B (Mobile Phone) Progress
// ==========================================
const storageB = new StorageManager({ storageKey: 'tron_test_dev_b' });
storageB.reset();
storageB.set('player.id', TEST_USER_ID);
storageB.set('player.handle', 'PILOT_MOBILE');
storageB.set('player.currency.bits', 2800); // more bits earned on mobile
storageB.set('player.level', 5); // higher level

// Device B progress: Cleared level_01_01 (2 stars - lower!), but cleared level_01_06 (Arbiter Boss - unlocked Solar Sail!)
storageB.set('campaign.completedNodes', ['level_01_01', 'level_01_06']);
storageB.set('campaign.unlockedNodes', ['level_01_01', 'level_01_02', 'level_01_06', 'level_02_01']);
storageB.set('campaign.unlockedGrids', ['grid_01', 'grid_02']);
storageB.set('campaign.starsEarned', 5);
storageB.set('campaign.levelRecords', {
  level_01_01: { levelId: 'level_01_01', gridId: 'grid_01', stars: 2, bestTime: 15.0, highScore: 2900, completed: true },
  level_01_06: { levelId: 'level_01_06', gridId: 'grid_01', stars: 3, bestTime: 44.2, highScore: 5200, completed: true }
});
storageB.set('inventory.unlockedMaps', ['arena_grid_01', 'arena_solar_sail']);
storageB.set('inventory.discs', ['disc_identity_default', 'disc_solar_orange']);
storageB.set('inventory.cosmetics', ['trail_cyan_default', 'skin_solar_sail']);
storageB.set('loadout.activeDisc', 'disc_solar_orange');
storageB.set('loadout.activeArenaSkin', 'arena_solar_sail');
storageB.state.lastActiveAt = 2000; // newer session
storageB.save({ immediate: true });

// Device B syncs: reads Cloud (Device A), merges via Master Grid Protocol, and commits
const remoteForB = await fetchRemoteSaveState(TEST_USER_ID, mockSupabaseClient);
const mergedOnB = CloudSyncResolver.resolve(storageB.state, remoteForB);
storageB.importState(mergedOnB, { source: 'cloud_sync' });
await upsertRemoteSaveState(storageB.state, mockSupabaseClient);
console.log('✓ Device B resolved cloud delta and committed merged state');

// Verify Device B merged state invariants
assert.strictEqual(storageB.get('player.currency.bits'), 2800);
assert.strictEqual(storageB.get('player.level'), 5);
assert.ok(storageB.get('campaign.completedNodes').includes('level_01_01'));
assert.ok(storageB.get('campaign.completedNodes').includes('level_01_02'));
assert.ok(storageB.get('campaign.completedNodes').includes('level_01_06'));
assert.ok(storageB.get('campaign.unlockedGrids').includes('grid_01'));
assert.ok(storageB.get('campaign.unlockedGrids').includes('grid_02'));
assert.strictEqual(storageB.get('campaign.levelRecords.level_01_01.stars'), 3, 'Level 01_01 must preserve Device A 3-star score');
assert.strictEqual(storageB.get('campaign.levelRecords.level_01_01.highScore'), 2900, 'Level 01_01 highScore must take max(2400, 2900) = 2900');
assert.strictEqual(storageB.get('campaign.levelRecords.level_01_01.bestTime'), 15.0, 'Level 01_01 bestTime must take min(18.4, 15.0) = 15.0');
assert.ok(storageB.get('inventory.unlockedMaps').includes('arena_solar_sail'));

// ==========================================
// Scenario: Device A resumes and synchronizes
// ==========================================
// Attach reactive subsystem managers to Device A storage
const campaignA = new CampaignManager({ storage: storageA });
const armoryA = new ArmoryManager({ storage: storageA });
const duelMapA = new DuelMapSelector({ storage: storageA });

let starsUpdatedEventCount = 0;
let loadoutChangedEventCount = 0;
campaignA.on(CampaignEvents.STARS_UPDATED, () => {
  starsUpdatedEventCount++;
});
armoryA.on(ArmoryEvents.LOADOUT_CHANGED, () => {
  loadoutChangedEventCount++;
});

// Device A fetches remote state uploaded by Device B
const remoteForA = await fetchRemoteSaveState(TEST_USER_ID, mockSupabaseClient);
assert.notStrictEqual(remoteForA, null);

const mergedOnA = CloudSyncResolver.resolve(storageA.state, remoteForA);
storageA.importState(mergedOnA, { source: 'cloud_sync' });

console.log('✓ Device A imported merged cloud state');

// 1. Assert reactive event triggers
assert.ok(starsUpdatedEventCount >= 1, 'CampaignManager must emit STARS_UPDATED upon cloud state import');
assert.ok(loadoutChangedEventCount >= 1, 'ArmoryManager must emit LOADOUT_CHANGED upon cloud state import');

// 2. Assert Campaign progression restoration
assert.strictEqual(campaignA.getTotalStars(), 8, 'Total stars on Device A must equal 3 (lvl1) + 2 (lvl2) + 3 (lvl6) = 8');
assert.ok(campaignA.getCompletedLevels().includes('level_01_01'));
assert.ok(campaignA.getCompletedLevels().includes('level_01_02'));
assert.ok(campaignA.getCompletedLevels().includes('level_01_06'));
assert.ok(storageA.get('campaign.unlockedGrids').includes('grid_02'), 'Grid 02 must be unlocked on Device A');

// 3. Assert Arena Map unlock restoration
const unlockedMapsA = getUnlockedArenaMaps(storageA);
assert.ok(unlockedMapsA.includes('arena_grid_01'));
assert.ok(unlockedMapsA.includes('arena_solar_sail'), 'Device A must now have arena_solar_sail unlocked from cloud sync');
assert.strictEqual(duelMapA.isMapUnlocked('arena_solar_sail', storageA), true);

// 4. Assert Loadout resolution
assert.strictEqual(storageA.get('loadout.activeDisc'), 'disc_solar_orange', 'Active disc from more recent session must be restored');
assert.strictEqual(storageA.get('loadout.activeArenaSkin'), 'arena_solar_sail', 'Active arena skin from more recent session must be restored');

// 5. Invariant check: attempting to apply an inferior candidate state fails invariant evaluation
const downgradedState = {
  ...storageA.state,
  campaign: {
    ...storageA.state.campaign,
    starsEarned: 2 // illegal drop from 8
  }
};
const violations = evaluateMonotonicInvariants(downgradedState, storageA.state, 'StorageA');
assert.ok(violations.length > 0, 'evaluateMonotonicInvariants must detect regression');
assert.ok(violations.some(v => v.includes('Campaign starsEarned decreased')));

// Teardown
storageA.destroy();
storageB.destroy();

console.log('--- Multi-Device Cross-Sync Integration Test PASSED CLEANLY ---\n');
