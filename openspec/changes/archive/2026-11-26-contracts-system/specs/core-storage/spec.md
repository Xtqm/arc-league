# Spec Delta

## ADDED Requirements

### Requirement: Contracts Progression Schema Persistence
The system SHALL persist Daily and Career Contract state under `contracts` in `TronSaveState`—including daily reset date, 3 daily slots, daily sweep claimed flag, career unlocked state, current career tier, tier completions count, per-bucket shuffle-bag history, and 3 active career slot records—with schema validation and cloud sync support.

#### Scenario: Initializing default contracts state
- **WHEN** a new save state is created or an older save state without `contracts` is migrated
- **THEN** `StorageManager` initializes `contracts` with empty daily slots, `career.tier = 1`, `career.tierCompletions = 0`, empty shuffle-bag history, and 3 empty career slots without corrupting existing fields.

#### Scenario: Merging contracts state during cloud sync
- **WHEN** local and remote save states synchronize via `CloudSyncResolver`
- **THEN** `career.tier` and `career.unlocked` merge monotonically (`max` / logical OR), and active contract slots resolve consistently from the most recently active profile or higher progress without losing completed Spark rewards.
