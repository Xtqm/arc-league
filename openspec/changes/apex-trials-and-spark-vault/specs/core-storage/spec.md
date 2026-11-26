# Spec Delta

## ADDED Requirements

### Requirement: Apex Trials and Spark Vault State Persistence
The system SHALL persist Apex Trials participation (`apexTrials` branch containing per-cycle free ticket usage, run count, personal best Apex Rating, claimed cycle payouts) and unlocked/equipped prestige Titles (`player.titles`, `player.equippedTitle`) in `TronSaveState` with schema migration and monotonic cloud sync support.

#### Scenario: Initializing default Apex Trials and Titles fields
- **WHEN** a new save state initializes or a legacy save without `apexTrials` or `player.titles` loads
- **THEN** `StorageManager` populates `apexTrials: { cycles: {} }`, `player.titles: []`, and `player.equippedTitle: null` without altering existing progression.

#### Scenario: Monotonic cloud sync for event titles and best AR
- **WHEN** local and remote save states synchronize via `CloudSyncResolver`
- **THEN** `player.titles` merges via set union (`Local ∪ Cloud`), `bestAR` per cycle resolves via `max(Local, Cloud)`, and `claimed` / `freeTicketUsed` flags preserve `Local || Cloud` to prevent duplicate cycle reward claims.
