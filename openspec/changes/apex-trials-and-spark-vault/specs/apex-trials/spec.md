# Spec Delta

## Purpose

Establishes the sporadic 3–7 day Apex Trials competitive event system, free-ticket and 2-Spark re-entry economy, mutator gameplay modifiers, Apex Rating (AR) leaderboard scoring, and end-of-cycle Spark and Title payouts.

## ADDED Requirements

### Requirement: Sporadic Apex Trial Event Schedule and Mutators
The system SHALL manage an event calendar of sporadic competitive Apex Trials lasting 3 to 7 days each, configuring per-event arena mutators (such as low gravity, hyper-velocity discs, hazard storms, or elite gauntlet waves) and exposing active/upcoming status in the `APEX TRIALS` modal.

#### Scenario: Active Apex Trial display on menu and modal
- **WHEN** an Apex Trial is within its active 3–7 day window
- **THEN** the main menu `APEX TRIALS` button displays an active indicator and opening the modal shows the event title, remaining time countdown, active mutators, and leaderboard tiers.

#### Scenario: Intermission state between sporadic events
- **WHEN** no Apex Trial is currently active
- **THEN** the `APEX TRIALS` modal remains accessible for reviewing past standings, claiming pending end-of-cycle rewards, and browsing the weekly Spark Vault while disabling event deployment until the next scheduled trial.

### Requirement: Free Entry Ticket and 2-Spark Re-Entry Economy
The system SHALL grant every player 1 Free Entry Ticket per active Apex Trial cycle and require spending 2 Sparks via `EconomyManager.spendSparks` for each additional score-chasing attempt in that cycle.

#### Scenario: Entering an Apex Trial using the Free Entry Ticket
- **WHEN** a player launches an active Apex Trial for the first time in that event cycle
- **THEN** the system consumes the cycle's 1 Free Entry Ticket (`0 Sparks` deducted) and starts the mutator-configured Apex Trial match.

#### Scenario: Re-entering an Apex Trial by spending 2 Sparks
- **WHEN** a player who has already used their Free Entry Ticket launches another run of the active Apex Trial
- **THEN** the system verifies `EconomyManager.canAffordSparks(2)`, deducts 2 Sparks atomically via `spendSparks`, and starts the run (or rejects launch with an insufficient Sparks prompt if balance < 2).

### Requirement: Apex Rating Scoring Engine and Leaderboard Standings
The system SHALL calculate an event run's **Apex Rating (AR)** from survival waves/time, precision fractures, parries, and damage efficiency, retain the player's highest AR for the cycle, and rank standings on the event leaderboard.

#### Scenario: Completing an Apex Trial run and recording personal best AR
- **WHEN** an Apex Trial run ends in victory, clear, or fracture
- **THEN** the system computes the run's Apex Rating (AR), updates the player's personal best AR for the active cycle if higher, and updates leaderboard placement.

#### Scenario: Leaderboard bracket classification
- **WHEN** evaluating a player's rank percentile against active event standings
- **THEN** the system classifies the player into `Apex Prime` (Top 1%), `Master` (Top 10%), `Contender` (Top 25%), or `Participant` (any recorded AR > 0).

### Requirement: End-of-Cycle Tiered Spark, Credit, and Title Payouts
The system SHALL distribute placement rewards once per completed Apex Trial cycle based on final leaderboard tier, granting exclusive unbuyable Titles to `Apex Prime` (Top 1%) finishers.

#### Scenario: Claiming Top 1% Apex Prime rewards
- **WHEN** an event cycle concludes with the player ranked in the Top 1% (`Apex Prime`) and the player claims cycle results
- **THEN** the system awards 25 Sparks, 3,000 Arc Credits, and unlocks that event's exclusive unbuyable Title on the player profile.

#### Scenario: Claiming Master, Contender, and Participant rewards
- **WHEN** an event cycle concludes in `Master` (Top 10%), `Contender` (Top 25%), or `Participant` tier
- **THEN** the system awards `12 Sparks + 1,500 AC + Tier Emblem` for Master, `6 Sparks + 750 AC` for Contender, or `1 Spark + 250 AC + 500 XP` for Participant, preventing duplicate claims for the same cycle ID.
