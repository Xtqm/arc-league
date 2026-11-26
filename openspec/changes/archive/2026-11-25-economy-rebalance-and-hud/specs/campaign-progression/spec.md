# Spec Delta

## MODIFIED Requirements

### Requirement: Differentiated Economy Payouts for First-Time vs Repeat Clears
The system SHALL award distinct Arc Credits, XP, and Sparks payouts depending on whether a clear is a first-time completion or a repeat clear, distinguishing regular trials from Sector Arbiter encounters and granting progressive Sparks on first-time 3-star Arbiter clears.

#### Scenario: First-time clear payout for standard trial
- **WHEN** a player completes a standard trial for the first time
- **THEN** the system credits first-time clear rewards (100 to 250 Arc Credits and base XP) via the economy engine.

#### Scenario: First-time clear payout for Arbiter boss
- **WHEN** a player completes an Arbiter boss level for the first time
- **THEN** the system credits premium boss rewards (500 Arc Credits and elite XP) via the economy engine.

#### Scenario: Progressive Sparks bonus on first-time 3-star Arbiter clear
- **WHEN** a player earns a 3-star rating on a Sector Arbiter boss for the first time in Sectors 1 through 4 (`level_01_06`, `level_02_07`, `level_03_07`, or `level_04_08`)
- **THEN** the system awards 1 Spark for Sector 1, 2 Sparks for Sector 2, 3 Sparks for Sector 3, or 4 Sparks for Sector 4 (10 Sparks total across all 4 Sectors), granted once per Arbiter.

#### Scenario: Repeat clear payout for standard trial
- **WHEN** a player completes a previously cleared standard trial
- **THEN** the system credits repeat clear rewards (20 to 75 Arc Credits and reduced XP) via the economy engine.

#### Scenario: Repeat clear payout for Arbiter boss
- **WHEN** a player completes a previously cleared Arbiter boss level
- **THEN** the system credits repeat boss rewards (75 Arc Credits and repeat boss XP) via the economy engine without re-granting first-time 3-star Sparks.

### Requirement: Live In-Combat Objective Header and Floating Accrual Indicators
The system SHALL display an in-combat mission objective header tracking remaining hostiles, live integrity status, and mastery criteria, and SHALL route confirmed maneuver XP accruals to the top-left tactical XP log without spawning center-screen `+Bits` popups.

#### Scenario: Tracking remaining hostile sub-routines
- **WHEN** hostile units are present or fractured in combat
- **THEN** the header displays the count of remaining active hostiles, updating immediately as bots are eliminated.

#### Scenario: Visualizing live Program Integrity percentage
- **WHEN** the player takes damage or remains at high integrity
- **THEN** the header displays current integrity percentage, rendering in standard cyan while at or above 75% and transitioning to warning amber/red when falling below the Star 2 threshold.

#### Scenario: Monitoring active mastery threshold
- **WHEN** a trial with time or trickshot criteria is active
- **THEN** the header updates the elapsed combat time and displays confirmed curve or ricochet hits against the Star 3 threshold.

#### Scenario: Spawning kinetic floating Bit indicators
- **WHEN** an enemy is fractured via a confirmed curve throw, ricochet bounce, or shield parry during a trial
- **THEN** the system pushes the XP accrual entry to the top-left tactical XP log (`#tl`) without spawning floating currency text over the central combat viewport.

### Requirement: Post-Trial Victory and Debrief Modal
The system SHALL provide a post-trial debrief modal presenting trial outcome, sequential animated star ignition with audio chimes, itemized Arc Credits, Sparks, and XP reward breakdowns, and direct trial navigation controls.

#### Scenario: Presenting debrief outcome and metrics
- **WHEN** a trial completes successfully
- **THEN** the debrief modal opens, releasing pointer lock and displaying elapsed time, final integrity %, confirmed trickshots, and cleared status.

#### Scenario: Animating sequential star ignition
- **WHEN** the victory debrief renders earned stars (1 to 3)
- **THEN** the system ignites each earned star sequentially with staggered animation delays accompanied by rising procedural audio chimes.

#### Scenario: Itemizing Bit and XP payouts
- **WHEN** trial rewards are presented
- **THEN** the system itemizes the payout breakdown into Base Clear, Integrity Bonus, and Mastery Bonus, displaying total Arc Credits, Sparks (when earned), and XP awarded without legacy `BITS` wording.

#### Scenario: Advancing via Next Trial control
- **WHEN** the player activates the "NEXT TRIAL" control
- **THEN** the system advances to the next unlocked level, resets arena tiles and Three.js entities, re-captures pointer lock, and starts the next trial countdown.

#### Scenario: Retrying via Retry Trial control
- **WHEN** the player activates the "RETRY TRIAL" control
- **THEN** the system re-initializes the current level, resets arena tiles and combat entities, re-captures pointer lock, and restarts the trial.

#### Scenario: Returning to grid navigation
- **WHEN** the player activates the "RETURN TO GRID" control
- **THEN** the debrief modal dismisses, the simulation remains halted with pointer lock released, and the Level Node Matrix renders.
