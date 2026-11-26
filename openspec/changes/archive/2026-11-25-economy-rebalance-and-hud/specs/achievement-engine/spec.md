# Spec Delta

## MODIFIED Requirements

### Requirement: Authoritative Launch Achievement Matrix Registry
The system SHALL maintain a structured registry defining the six launch achievements with immutable identifiers, display titles, descriptions, target metric thresholds, and associated reward payloads using Arc League Fracture terminology, Arc Credits, and Sparks.

#### Scenario: Retrieval of launch achievement definitions
- **WHEN** querying the registry for launch achievements
- **THEN** the system returns records for `ach_first_blood` (1 Fracture, 100 AC), `ach_curve_god` (25 Curve Fractures, 300 AC), `ach_parry_king` (50 Parries, 500 AC), `ach_untouchable` (100% integrity Tour clear, 250 AC), `ach_swarm_survivor` (Hardcore Swarm Wave 15 clear, 750 AC + `disc_corrupted_void`), and `ach_grid_one_master` (full mastery of all stars across Sectors 1–4, 2,500 AC + 5 Sparks + `chassis_arbiter`).

#### Scenario: Calculation of incremental progress ratio
- **WHEN** evaluating progress for an incremental achievement with a defined numeric target
- **THEN** the system calculates progress as a clamped scalar value between 0.0 and 1.0 representing current metric divided by target threshold.

### Requirement: Telemetry Bus and Reactive Evaluation
The system SHALL observe combat and progression telemetry mutations and evaluate achievement criteria immediately upon metric updates, observing `stats.totalDeallocations` (with backward compatibility for legacy `stats.totalDerezzes`), `stats.hardcoreSwarmHighestWave`, and full Sectors 1–4 `campaign.levelRecords`, transitioning satisfied achievements into a claimable state without mid-combat audio or HUD popups.

#### Scenario: Evaluation on combat telemetry change
- **WHEN** telemetry signals indicate a change in `stats.totalDeallocations`, `stats.totalDerezzes`, `stats.parriesExecuted`, `stats.curveEliminations`, `stats.hardcoreSwarmHighestWave`, or `campaign.levelRecords`
- **THEN** the system compares updated metrics against locked achievements (ensuring Standard Swarm waves do not satisfy `ach_swarm_survivor` and requiring all Sectors 1–4 stars for `ach_grid_one_master`) and transitions newly satisfied achievements to the claimable state silently.

#### Scenario: Evaluation on wildcard or batch storage mutation
- **WHEN** storage emits a wildcard mutation path (`*`) resulting from cloud sync, profile import, or batch state hydration
- **THEN** the system re-evaluates all locked achievements against the complete root state and marks any satisfied milestones as claimable.

#### Scenario: Locked achievement unchanged when criteria not met
- **WHEN** a player completes Wave 15 only in Standard Swarm or masters only Sector 1 without Sectors 2–4
- **THEN** `ach_swarm_survivor` and `ach_grid_one_master` remain locked until Hardcore Wave 15 and full Sectors 1–4 mastery are satisfied respectively.

### Requirement: Boot-Time Retroactive Reconciliation
The system SHALL inspect existing save state data upon engine initialization to detect and unlock any achievements whose criteria are already satisfied in persistent storage.

#### Scenario: Retroactive unlock for veteran player save state
- **WHEN** the engine boots with a save state where `stats.hardcoreSwarmHighestWave` is 15 or higher (or Sectors 1–4 are fully mastered) and the corresponding achievement is not yet recorded
- **THEN** the system transitions the satisfied achievement into unlocked/claimable state according to its current criteria without duplicating prior unlocks.

#### Scenario: No duplicate unlocks on subsequent initializations
- **WHEN** the engine boots with an achievement already recorded in the persistent `achievements` list
- **THEN** the system preserves the existing unlock timestamp and skips duplicate reward distribution.

### Requirement: Reward Distribution and Event Emission
The system SHALL execute atomic reward grants upon explicit user claim actions, dispensing Arc Credits and Sparks via the economy engine, unlocking exclusive cosmetic items via the armory pipeline, playing procedural synth fanfare audio, and recording the unlock in persistent storage.

#### Scenario: Claiming an individual satisfied achievement
- **WHEN** the player activates the `[ CLAIM REWARD ]` action on a claimable achievement
- **THEN** the system awards the configured Arc Credits and any Sparks reward, grants any cosmetic skin via `ArmoryManager.unlockRewardItem`, synthesizes procedural crystal fanfare audio, persists the unlock record, and emits `ACHIEVEMENT_UNLOCKED`.

#### Scenario: Unlocking an achievement granting Bits and cosmetics
- **WHEN** `ach_swarm_survivor` or `ach_grid_one_master` is claimed
- **THEN** the system awards the configured Arc Credits (750 AC or 2,500 AC), awards 5 Sparks for `ach_grid_one_master`, grants `disc_corrupted_void` or `chassis_arbiter` via `ArmoryManager.unlockRewardItem`, appends the unlock entry to storage, and emits `ACHIEVEMENT_UNLOCKED`.
