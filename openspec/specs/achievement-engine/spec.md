# achievement-engine Specification

## Purpose

Establishes the authoritative launch achievement matrix registry, combat telemetry mutation bus, retroactive save state reconciliation, reward distribution pipeline, procedural audio fanfare, and main menu trophy matrix UI modal for Tron Disc Arena (SPEC-ACHIEVE-001).

## Requirements

### Requirement: Authoritative Launch Achievement Matrix Registry
The system SHALL maintain a structured registry defining the six launch achievements with immutable identifiers, display titles, descriptions, target metric thresholds, and associated reward payloads using Arc League terminology and Arc Credits.

#### Scenario: Retrieval of launch achievement definitions
- **WHEN** querying the registry for launch achievements
- **THEN** the system returns records for `ach_first_blood` (1 de-allocation, 100 Arc Credits), `ach_curve_god` (25 curve eliminations, 300 Arc Credits), `ach_parry_king` (50 parries, 250 Arc Credits), `ach_untouchable` (100% integrity clear, 500 Arc Credits), `ach_swarm_survivor` (wave 15, 750 Arc Credits + `disc_corrupted_void`), and `ach_grid_one_master` (18 stars across Circuit 01, 1000 Arc Credits + `chassis_arbiter`).

#### Scenario: Calculation of incremental progress ratio
- **WHEN** evaluating progress for an incremental achievement with a defined numeric target
- **THEN** the system calculates progress as a clamped scalar value between 0.0 and 1.0 representing current metric divided by target threshold.

### Requirement: Telemetry Bus and Reactive Evaluation
The system SHALL observe combat and progression telemetry mutations and evaluate achievement criteria immediately upon metric updates, observing `stats.totalDeallocations` with backward compatibility for legacy `stats.totalDerezzes`, transitioning satisfied achievements into a claimable state without mid-combat audio or HUD popups.

#### Scenario: Evaluation on combat telemetry change
- **WHEN** telemetry signals indicate a change in `stats.totalDeallocations`, `stats.totalDerezzes`, `stats.parriesExecuted`, `stats.curveEliminations`, `stats.swarmHighestWave`, or `campaign.levelRecords`
- **THEN** the system compares updated metrics against locked achievements and transitions any newly satisfied achievements to the claimable state silently without interrupting active gameplay.

#### Scenario: Evaluation on wildcard or batch storage mutation
- **WHEN** storage emits a wildcard mutation path (`*`) resulting from cloud sync, profile import, or batch state hydration
- **THEN** the system re-evaluates all locked achievements against the complete root state and marks any satisfied milestones as claimable.

#### Scenario: Locked achievement unchanged when criteria not met
- **WHEN** a player executes an action that increments a metric below the required threshold (e.g., 20 out of 50 parries)
- **THEN** the system updates the metric progress state without unlocking the achievement or marking it claimable.

### Requirement: Boot-Time Retroactive Reconciliation
The system SHALL inspect existing save state data upon engine initialization to detect and unlock any achievements whose criteria are already satisfied in persistent storage.

#### Scenario: Retroactive unlock for veteran player save state
- **WHEN** the engine boots with a save state where `stats.swarmHighestWave` is 15 or higher but `ach_swarm_survivor` is not marked as unlocked
- **THEN** the system immediately marks `ach_swarm_survivor` as unlocked, distributes the corresponding rewards, and records the unlock in the persistent state.

#### Scenario: No duplicate unlocks on subsequent initializations
- **WHEN** the engine boots with an achievement already recorded in the persistent `achievements` list
- **THEN** the system preserves the existing unlock timestamp and skips duplicate reward distribution.

### Requirement: Reward Distribution and Event Emission
The system SHALL execute atomic reward grants upon explicit user claim actions, dispensing Arc Credits via the economy engine, unlocking exclusive cosmetic items via the armory pipeline, playing procedural synth fanfare audio, and recording the unlock in persistent storage.

#### Scenario: Claiming an individual satisfied achievement
- **WHEN** the player activates the `[ CLAIM REWARD ]` action on a claimable achievement
- **THEN** the system awards the configured Arc Credits currency, grants any cosmetic skin to player inventory via `ArmoryManager.unlockRewardItem`, synthesizes procedural crystal fanfare audio, persists the unlock record to storage, and emits `ACHIEVEMENT_UNLOCKED`.

#### Scenario: Unlocking an achievement granting Bits and cosmetics
- **WHEN** `ach_swarm_survivor` or `ach_grid_one_master` is claimed
- **THEN** the system awards the configured Arc Credits currency, grants the cosmetic skin to player inventory via `ArmoryManager.unlockRewardItem`, appends the unlock entry to storage, and emits `ACHIEVEMENT_UNLOCKED`.

### Requirement: Batch Milestone Reward Claiming
The system SHALL provide a batch claim control within the Trophy Matrix modal allowing players to redeem all pending achievement rewards simultaneously.

#### Scenario: Batch claim control display
- **WHEN** two or more achievements are in the claimable state
- **THEN** the Trophy Matrix renders a prominent `[ CLAIM ALL REWARDS ]` button in the header summary area.

#### Scenario: Executing batch claim
- **WHEN** the player clicks `[ CLAIM ALL REWARDS ]`
- **THEN** the system sequentially grants all pending Arc Credits, unlocks all pending cosmetic items, synthesizes procedural fanfare audio, marks all satisfied achievements as unlocked in persistent storage, and transitions all corresponding cards to `[ UNLOCKED ]`.

### Requirement: Procedural Synth Fanfare Audio
The system SHALL synthesize a celebratory procedural multi-tone synth fanfare using the Web Audio API upon achievement unlock.

#### Scenario: Audio fanfare synthesis on unlock
- **WHEN** an achievement unlock sequence executes and an active audio context is available
- **THEN** the system synthesizes an ascending harmonic chime sequence without requesting external audio files.

### Requirement: Diegetic Main Menu Trophy Matrix UI Modal
The system SHALL provide an interactive modal accessible from the main menu and Program Hub displaying player achievement progression, completion percentage, unlocked timestamps, reward previews, and interactive claim controls.

#### Scenario: Initial page load rendering of Achievements navigation button
- **WHEN** the main menu renders upon initial application load
- **THEN** `#achievementsBtn` is present in `#mainMenuButtons` with compatibility bindings, while the primary player access point is elevated to the Program Hub `[ DIRECTIVES ]` tab.

#### Scenario: Inspection of Trophy Matrix modal
- **WHEN** the user opens the Achievements modal or activates `[ DIRECTIVES ]` in the Program Hub
- **THEN** the system performs active reconciliation against root storage state, displays overall completion percentage, a badge grid of all launch achievements, current progress bars, visual previews of unlockable cosmetic skins, and interactive `[ CLAIM REWARD ]` buttons on claimable cards.

#### Scenario: Trophy Matrix dismiss control in Program Hub
- **WHEN** the Trophy Matrix view is displayed within the Program Hub modal
- **THEN** internal return/dismiss buttons (`[ ESC // CLOSE ]`) are omitted, leaving modal exit exclusively to the Hub's top-right dismiss control.

#### Scenario: Claiming reward updates card presentation
- **WHEN** a player claims an achievement reward within the Trophy Matrix modal
- **THEN** the card transitions immediately from claimable state to `[ UNLOCKED ]`, the progress bar reflects 100% completion with a neon cyan glow, and notification indicators update in real-time.

### Requirement: Steamworks Platform Achievement Forwarding
The system SHALL dispatch achievement unlock commands to the Steamworks platform API whenever an achievement unlocks during gameplay or retroactive reconciliation, while safely falling back to local-only unlocking if Steam is unavailable.

#### Scenario: Mid-game achievement unlock forward
- **WHEN** an achievement unlock criteria is satisfied during active gameplay
- **THEN** the system triggers local rewards and toasts, and concurrently dispatches an activation request for the corresponding Steam achievement identifier via the desktop bridge.

#### Scenario: Retroactive reconciliation synchronization
- **WHEN** the engine detects previously unlocked achievements on boot that have not yet been synchronized with Steamworks
- **THEN** the system activates the corresponding Steam achievements without re-granting in-game currency or cosmetics.

#### Scenario: Offline or web execution unlock
- **WHEN** an achievement unlocks while the Steamworks connection is inactive, offline, or running in a web browser
- **THEN** the local achievement unlock, rewards, fanfare, and toast execute successfully without errors or delays.
