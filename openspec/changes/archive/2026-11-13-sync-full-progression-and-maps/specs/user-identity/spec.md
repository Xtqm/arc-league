# Spec Delta

## MODIFIED Requirements

### Requirement: Monotonic State Synchronization (Master Grid Protocol)
The system SHALL implement the Master Grid Protocol to merge local and cloud save states, guaranteeing strictly non-decreasing progression across all metrics and inventory items.

#### Scenario: Monotonic numerical attribute merge
- **WHEN** synchronizing local and cloud states with differing Bits, Credits, Sparks, Level, or XP values
- **THEN** the resolved state assigns each currency and progression counter as `max(Local, Cloud)`.

#### Scenario: Star mastery matrix union
- **WHEN** synchronizing differing star mastery scores and campaign progress across arena levels
- **THEN** each level's star rating is resolved as `max(Local.stars[lvl], Cloud.stars[lvl])`, `completedNodes = Local.completedNodes ∪ Cloud.completedNodes`, `unlockedNodes = Local.unlockedNodes ∪ Cloud.unlockedNodes`, `unlockedGrids = Local.unlockedGrids ∪ Cloud.unlockedGrids`, and total `starsEarned` reflects the authoritative sum of stars across all merged level records.

#### Scenario: Inventory and cosmetic set union
- **WHEN** merging player inventory collections across devices
- **THEN** the resolved inventory contains the mathematical set union of all unlocked discs, skins, trails, and arena maps (`Local.unlockedMaps ∪ Cloud.unlockedMaps` guaranteeing `'arena_grid_01'`), with consumable items resolved by `max(Local, Cloud)` per item type.

#### Scenario: Achievements set union
- **WHEN** merging unlocked achievements and accolades
- **THEN** the resolved achievements list contains the set union of all earned achievement identifiers (`Local ∪ Cloud`).

#### Scenario: Non-decreasing integrity guarantee
- **WHEN** a cloud synchronization cycle completes
- **THEN** no previously unlocked item, arena map, star rating, cleared node, level tier, or currency amount can be decreased or revoked.

#### Scenario: Loadout configuration resolution
- **WHEN** resolving differing player loadout configurations
- **THEN** the active disc, trail, visor, arena skin, and audio theme are selected from the state with the most recent `lastActiveAt` timestamp, validating that the active selections exist within the resolved inventory and falling back to default items if not owned.

#### Scenario: Telemetry metrics monotonic merge
- **WHEN** merging player telemetry statistics
- **THEN** counters including `matchesPlayed`, `wins`, `losses`, `discsThrown`, `highestWave`, `swarmHighestWave`, `highestScore`, `totalScore`, `totalDerezzes`, `parriesExecuted`, and `curveEliminations` are resolved as `max(Local, Cloud)`.

### Requirement: Cloud Database Persistence and Row-Level Security
The system SHALL persist player save states to a remote PostgreSQL `save_states` table in Supabase protected by Row Level Security (RLS) policies that isolate records strictly to the authenticated user.

#### Scenario: User saves state to remote cloud database
- **WHEN** an authenticated user commits local progress changes while online
- **THEN** the system executes an upsert to the `save_states` table matching the user's primary key (`user_id = auth.uid()`), persisting handle, bits, level, star mastery, inventory, achievements, stats, settings, campaign progress, and loadout.

#### Scenario: User queries own save state from cloud database
- **WHEN** an authenticated user initializes their session while online
- **THEN** the system executes a select query on `save_states` for records where `user_id = auth.uid()` and receives the remote record including campaign and loadout data.

#### Scenario: Cross-user data isolation enforced by RLS
- **WHEN** a client session attempts to select, insert, or update a save state record where `user_id` does not match the active session's `auth.uid()`
- **THEN** the PostgreSQL engine rejects the operation or returns zero rows according to Row Level Security policies.
