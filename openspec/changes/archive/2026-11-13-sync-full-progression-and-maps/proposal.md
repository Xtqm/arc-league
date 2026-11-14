# Proposal

## Why

Currently, player progress in League Circuit (Campaign Mode) and arena map unlocks (`inventory.unlockedMaps`) are stored strictly in local-only `StorageManager` persistence (`localStorage['tron_save_state']`), completely disconnected from `AuthManager` and the Supabase cloud synchronization pipeline. When a player logs in across different devices (or browser instances), their completed campaign nodes, earned stars, and unlocked arenas are not restored, while other fields like inventory are truncated or dropped due to legacy flat-array assumptions in `CloudSyncResolver`.

This change establishes `StorageManager` as the single authoritative source of truth across all game systems, eliminates the split between `saveState.js` and `StorageManager.js`, expands the Master Grid Protocol to resolve full campaign and inventory state, and persists complete progression to Supabase.

## What Changes

- **Unify Runtime Save State**: Retire the legacy disconnected `TronSaveState` from `saveState.js` and bind `AuthManager` directly to `StorageManager`, making `StorageManager` the sole engine for game state, local persistence, and cloud synchronization.
- **Expand Master Grid Protocol in `CloudSyncResolver`**:
  - **Campaign**: Merges `levelRecords` monotonically (`stars = max(L, C)`, `highScore = max(L, C)`, `bestTime = min(L, C)`), recalculates `starsEarned`, and takes set unions of `completedNodes`, `unlockedNodes`, and `unlockedGrids`.
  - **Inventory**: Supports structured inventory, merging set unions for `unlockedMaps` (preserving `'arena_grid_01'`), `discs`, and `cosmetics`, and element-wise max for `consumables`.
  - **Loadout**: Resolves `activeDisc`, `activeTrail`, `activeVisor`, `activeArenaSkin`, and `audioTheme` using `lastActiveAt` recency with fallback verification against merged inventory.
  - **Telemetry**: Monotonically resolves all combat metrics (`totalDerezzes`, `parriesExecuted`, `curveEliminations`, `totalScore`, etc.).
- **Supabase Cloud Schema Expansion**:
  - Add `campaign` (JSONB) and `loadout` (JSONB) columns to the `public.save_states` table.
  - Update `saveStateToRow` and `rowToSaveState` mapping functions to serialize and deserialize complete `StorageManager` state while maintaining full backward compatibility with legacy row shapes.
- **Reactive In-Game Re-hydration**:
  - When cloud sync completes or authentication state resolves, `StorageManager` imports the merged state and broadcasts update events, prompting `CampaignManager`, `ArmoryManager`, `DuelMapSelector`, and the HUD to re-render without requiring a full page reload.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `user-identity`: Expands the Master Grid Protocol monotonic state synchronization requirements to cover full campaign progression, structured inventory with arena maps, loadout, and telemetry, and updates cloud database persistence expectations.
- `core-storage`: Extends core storage requirements to mandate cloud-ready state synchronization lifecycle events and authoritative integration with `AuthManager`.

## Impact

- **Storage Engine**: `src/core/storage/StorageManager.js`, `src/core/storage/schema.js`, `src/core/storage/CloudSyncResolver.js`.
- **Authentication**: `src/auth/AuthManager.js`, `src/auth/saveState.js`.
- **UI & Gameplay Bridges**: `src/campaign/CampaignManager.js`, `src/armory/ArmoryManager.js`, `src/ui/authTerminal.js`, `src/ui/duel/DuelMapSelector.js`, `src/ui/arenaSelector.js`.
- **Database**: `public.save_states` table in Supabase (DDL migration adding `campaign` and `loadout` JSONB columns).
