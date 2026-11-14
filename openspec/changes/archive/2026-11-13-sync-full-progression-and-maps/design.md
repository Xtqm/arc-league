# Design

## Context

See `proposal.md` for background and motivation. The game currently maintains two independent persistence layers:
1. `StorageManager` (`src/core/storage/`): Handles runtime game data including `campaign` (`completedNodes`, `unlockedNodes`, `unlockedGrids`, `levelRecords`, `starsEarned`) and `inventory.unlockedMaps`.
2. `AuthManager` & `saveState.js` (`src/auth/`): Handles user identity and syncs a legacy, truncated `TronSaveState` to Supabase's `public.save_states` table.

Because `StorageManager` is not bridged to `AuthManager` and `CloudSyncResolver`, campaign stars/nodes and map unlocks never reach the cloud and cannot sync across devices.

## Goals / Non-Goals

**Goals:**
- Consolidate game persistence around `StorageManager` as the single authoritative source of truth.
- Expand `CloudSyncResolver` Master Grid Protocol to merge full campaign progression, structured inventory (including arena maps), loadout selections, and telemetry statistics.
- Expand the Supabase `public.save_states` schema with `campaign` and `loadout` JSONB columns while retaining 100% backward compatibility with all 587 existing database records.
- Wire `AuthManager` and `StorageManager` reactively so that remote cloud merges immediately re-hydrate `CampaignManager`, `ArmoryManager`, `DuelMapSelector`, and the HUD without page reloads.

**Non-Goals:**
- Modifying peer-to-peer multiplayer signaling or room matching (Firebase WebRTC signaling remains intact).
- Normalizing save state into separate relational tables (JSONB columns are retained for atomic single-row upserts).

## Decisions

### 1. Unified Single Store Architecture
- **Decision**: Make `StorageManager` the sole engine for game state and persistence. When an authenticated session is active, `AuthManager` uses `StorageManager.state` as the payload for `syncCloudSave()`, and merges incoming remote states directly into `StorageManager`.
- **Rationale**: Eliminates synchronization divergence, duplicate keys in `localStorage`, and manual ad-hoc field copying between stores.
- **Alternatives Considered**:
  - *Bi-directional synchronizer between two separate stores*: High complexity, prone to race conditions and circular event loops.

### 2. Database Schema Expansion & Backward Compatibility
- **Decision**: Add `campaign` and `loadout` as `JSONB NOT NULL DEFAULT '{}'::jsonb` columns to `public.save_states`.
- **Rationale**: `inventory`, `stats`, `achievements`, and `settings` are already JSONB columns. Adding `campaign` and `loadout` aligns the database schema directly with `StorageManager.state`.
- **Backward Compatibility**: In `rowToSaveState(row)`:
  - If `row.inventory` is a legacy string array (e.g., `["disc_default"]`), convert it to `{ discs: row.inventory, cosmetics: [], consumables: {}, unlockedMaps: ['arena_grid_01'] }`.
  - If `row.campaign` is missing or empty, gracefully default to `{ completedNodes: [], unlockedNodes: ['level_01_01'], unlockedGrids: ['grid_01'], starsEarned: 0, levelRecords: {} }`.
  - If `row.loadout` is missing, default to standard starter cosmetics.

### 3. Expanded Master Grid Protocol Resolution Rules
- **Decision**: In `CloudSyncResolver.resolve(local, cloud)`:
  - **Campaign Level Records**: For every level ID across Local and Cloud:
    - `stars = Math.max(localRecord.stars, cloudRecord.stars)`
    - `highScore = Math.max(localRecord.highScore, cloudRecord.highScore)`
    - `bestTime = Math.min(localRecord.bestTime, cloudRecord.bestTime)` (ignoring 0/null)
  - **Campaign Nodes & Grids**: Mathematical set union:
    - `completedNodes = union(local.completedNodes, cloud.completedNodes)`
    - `unlockedNodes = union(local.unlockedNodes, cloud.unlockedNodes)`
    - `unlockedGrids = union(local.unlockedGrids, cloud.unlockedGrids)` (guaranteeing `grid_01`)
    - `starsEarned = sum of merged levelRecords stars`
  - **Inventory**: Mathematical set union per slot:
    - `unlockedMaps = union(local.unlockedMaps, cloud.unlockedMaps)` (guaranteeing `arena_grid_01`)
    - `discs = union(local.discs, cloud.discs)`
    - `cosmetics = union(local.cosmetics, cloud.cosmetics)`
    - `consumables = max per item key`
  - **Loadout**: Select from the state with the highest `lastActiveAt`, validating that selections exist in the merged inventory (falling back to defaults if not owned).
  - **Currencies & Stats**: Monotonic `Math.max()` across all numeric fields.

### 4. Reactive Gameplay Re-hydration
- **Decision**: When `CloudSyncResolver` resolves an incoming remote state, `StorageManager.importState(mergedState)` is invoked with an internal `{ source: 'cloud_sync' }` flag.
- **Rationale**: Prevents re-triggering a redundant cloud upload while emitting `StorageEvents.MUTATED` and `StorageEvents.INITIALIZED`, allowing `CampaignManager.init()`, `updateArenaSelectControls()`, and HUD elements to refresh instantly.

## Risks / Trade-offs

- **[Risk] Existing Supabase records have legacy flat inventory arrays.**
  → *Mitigation*: Defensive normalization in `rowToSaveState` and `normalizeSaveState` detects array vs object inventory format and normalizes automatically.
- **[Risk] Concurrent tab or offline mutation race conditions.**
  → *Mitigation*: Monotonic Master Grid Protocol guarantees that merging states in any order always converges to the same non-decreasing high watermark.
- **[Risk] Campaign stars total desynchronization from level records.**
  → *Mitigation*: `starsEarned` is authoritatively computed from the sum of resolved `levelRecords` stars during merge.

## Migration Plan

1. Apply Supabase SQL migration:
   ```sql
   ALTER TABLE public.save_states
     ADD COLUMN IF NOT EXISTS campaign jsonb NOT NULL DEFAULT '{}'::jsonb,
     ADD COLUMN IF NOT EXISTS loadout jsonb NOT NULL DEFAULT '{}'::jsonb;
   ```
2. Refactor `CloudSyncResolver.js` to implement expanded Master Grid Protocol rules and row mappings.
3. Wire `AuthManager.js` to persist to and hydrate from `StorageManager`.
4. Update UI and gameplay listeners to refresh on storage mutation events.
5. Verify with automated unit and integration tests.
