# Spec Delta

## MODIFIED Requirements

### Requirement: Active Trial Lifecycle Orchestration
The system SHALL manage the active trial lifecycle across initiation, wave spawning, telemetry capture, successful resolution, and failure states in the live combat simulation.

#### Scenario: Starting a trial
- **WHEN** `startTrial(levelId)` is invoked for an unlocked level
- **THEN** an active trial session is initialized, capturing the start timestamp, resetting telemetry counters, locking in the level configuration, applying sector theme and hazards, and commencing a countdown timer.

#### Scenario: Spawning configured trial enemy waves
- **WHEN** the trial countdown completes
- **THEN** the system spawns the hostile sub-routines configured in the level's wave definition with authoritative difficulty tiers, counts, and health pools (or deploys the Rival Arbiter boss encounter if the level is an Arbiter trial).

#### Scenario: Recording live gameplay metrics during a trial
- **WHEN** combat events occur (damage taken, enemy de-rezzed, curve throw hit, ricochet hit) and are reported via `recordMetric(type, amount)`
- **THEN** the active trial session accumulates the metrics for post-trial evaluation and dynamically updates the in-combat tactical objective HUD.

#### Scenario: Completing a trial successfully
- **WHEN** all hostile sub-routines in a trial are eliminated
- **THEN** the trial terminates, evaluates telemetry against 1 to 3 Star criteria, awards Bit and XP payouts, updates persistent storage, and renders the post-trial victory debrief modal with sequential animated star ignition.

#### Scenario: Failing a trial
- **WHEN** player integrity drops to 0 or the player falls into the arena void during a campaign trial
- **THEN** the trial session terminates as a defeat via `failTrial(reason)`, halts combat, and presents the post-trial debrief modal displaying defeat status with Retry Trial and Return to Grid options without awarding completion stars or clear payouts.
