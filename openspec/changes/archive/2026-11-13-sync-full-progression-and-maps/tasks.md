# Tasks

## 1. Supabase Database Migration

- [x] 1.1 Execute SQL DDL migration adding `campaign` (jsonb) and `loadout` (jsonb) columns with default `'{}'::jsonb` to `public.save_states` table in Supabase, and verify column definitions.

## 2. Expanded Master Grid Protocol & Row Mapping

- [x] 2.1 Update `saveStateToRow` and `rowToSaveState` in `src/core/storage/CloudSyncResolver.js` to handle `campaign`, `loadout`, and structured `inventory` (`unlockedMaps`, `discs`, `cosmetics`, `consumables`) with backward-compatible legacy row translation.
- [x] 2.2 Expand `normalizeSaveState` and `CloudSyncResolver.resolve` in `src/core/storage/CloudSyncResolver.js` to monotonically merge campaign level records, earned stars, node/grid set unions, arena map set unions, loadout selections, and telemetry counters.
- [x] 2.3 Expand `evaluateMonotonicInvariants` to verify campaign stars/nodes and map unlocks cannot decrease, and verify with updated unit tests in `test/storage/cloud_sync_resolver.test.js`.

## 3. StorageManager & AuthManager Unification

- [x] 3.1 Refactor `src/auth/AuthManager.js` to read from and write to `StorageManager` as the single authoritative state, synchronizing `StorageManager.state` in `syncCloudSave()` and retiring redundant `saveState.js` divergence.
- [x] 3.2 Add `importState(mergedState, options)` to `src/core/storage/StorageManager.js` to hydrate incoming cloud states cleanly and emit reactive update events without recursive sync loops.
- [x] 3.3 Wire reactive lifecycle listeners in `CampaignManager.js`, `ArmoryManager.js`, `DuelMapSelector.js`, `arenaSelector.js`, and `authTerminal.js` to re-render stars, unlocked maps, and loadout immediately upon cloud synchronization.

## 4. End-to-End Verification & Test Suite

- [x] 4.1 Create an integration test in `test/storage/multi_device_sync.test.js` validating cross-device synchronization of campaign progress and arena map unlocks.
- [x] 4.2 Run the entire automated test suite (`npm test`) and verify all tests pass with zero regressions.
