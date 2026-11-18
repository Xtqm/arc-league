# Spec Delta

## MODIFIED Requirements

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

### Requirement: Reward Distribution and Event Emission
The system SHALL execute atomic reward grants upon explicit user claim actions, dispensing Arc Credits via the economy engine, unlocking exclusive cosmetic items via the armory pipeline, playing procedural synth fanfare audio, and recording the unlock in persistent storage.

#### Scenario: Claiming an individual satisfied achievement
- **WHEN** the player activates the `[ CLAIM REWARD ]` action on a claimable achievement
- **THEN** the system awards the configured Arc Credits currency, grants any cosmetic skin to player inventory via `ArmoryManager.unlockRewardItem`, synthesizes procedural crystal fanfare audio, persists the unlock record to storage, and emits `ACHIEVEMENT_UNLOCKED`.

#### Scenario: Unlocking an achievement granting Bits and cosmetics
- **WHEN** `ach_swarm_survivor` or `ach_grid_one_master` is claimed
- **THEN** the system awards the configured Arc Credits currency, grants the cosmetic skin to player inventory via `ArmoryManager.unlockRewardItem`, appends the unlock entry to storage, and emits `ACHIEVEMENT_UNLOCKED`.

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

## ADDED Requirements

### Requirement: Batch Milestone Reward Claiming
The system SHALL provide a batch claim control within the Trophy Matrix modal allowing players to redeem all pending achievement rewards simultaneously.

#### Scenario: Batch claim control display
- **WHEN** two or more achievements are in the claimable state
- **THEN** the Trophy Matrix renders a prominent `[ CLAIM ALL REWARDS ]` button in the header summary area.

#### Scenario: Executing batch claim
- **WHEN** the player clicks `[ CLAIM ALL REWARDS ]`
- **THEN** the system sequentially grants all pending Arc Credits, unlocks all pending cosmetic items, synthesizes procedural fanfare audio, marks all satisfied achievements as unlocked in persistent storage, and transitions all corresponding cards to `[ UNLOCKED ]`.

## REMOVED Requirements

### Requirement: Mid-Combat Neon Toast Notification
**Reason**: Sliding neon HUD banners and loud sound effects during active matches distract players during high-velocity projectile dodging, curving, and parrying maneuvers.
**Migration**: Telemetry evaluations update milestone progress silently in the background; notification pips on the Main Menu and Program Hub alert players when rewards are ready to claim in the Trophy Matrix.
