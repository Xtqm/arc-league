# Spec Delta

## Purpose

Establishes the Daily Contracts 24-hour rotating objective tracker and the Career Contracts endless tiered shuffle-bag deck with three focused slots, dual progression gates, reactive combat telemetry, and persistent Contracts UI.

## ADDED Requirements

### Requirement: Daily Contracts 24-Hour Rotation and Sweep Bonus
The system SHALL maintain 3 active Daily Contract slots that reset on a strict 24-hour UTC boundary, awarding 250 XP per completed individual Daily Contract and a 500 Arc Credits sweep bonus upon completing all 3 within the active window.

#### Scenario: Generating fresh Daily Contracts on new UTC day
- **WHEN** the player opens the game or Contracts modal after the active 24-hour UTC window has expired
- **THEN** the system clears prior incomplete daily progress, draws 3 distinct Daily Contract objectives, and displays the countdown to the next UTC reset.

#### Scenario: Claiming an individual Daily Contract
- **WHEN** a Daily Contract reaches its target threshold and is claimed (or auto-settled)
- **THEN** the system awards 250 XP with 0 Arc Credits and marks that daily slot completed for the current cycle.

#### Scenario: Completing all three Daily Contracts triggers sweep bonus
- **WHEN** the player completes all 3 Daily Contracts within the same 24-hour UTC window
- **THEN** the system awards the 500 Arc Credits Daily Sweep bonus (0 Sparks) once for that daily cycle.

### Requirement: Career Contracts Unlock Prerequisite
The system SHALL keep Career Contracts locked until the player satisfies both progression prerequisites: reaching Player Level 5 and clearing Wave 5 in Swarm Protocol.

#### Scenario: Viewing Career Contracts before prerequisites are met
- **WHEN** a player below Level 5 or with peak Swarm wave below 5 inspects the Career Contracts tab
- **THEN** the system displays a locked directive showing live progress toward both `Player Level 5` and `Swarm Wave 5` without dispensing Career Contracts.

#### Scenario: Unlocking Career Contracts upon meeting both prerequisites
- **WHEN** the player has reached Player Level 5 or higher AND cleared Swarm Wave 5 or higher
- **THEN** Tier 1 (`Rookie`) Career Contracts unlock immediately and populate all 3 focused Career Contract slots.

### Requirement: Three Focused Career Contract Slots and Shuffle-Bag Deck
The system SHALL maintain 3 simultaneous Career Contract slots mapped to distinct gameplay focuses—Slot 1 (`Combat Precision`), Slot 2 (`Swarm & Tour`), and Slot 3 (`Duel Competitive`)—drawing without replacement per tier-focus bucket so completed slots immediately deal a new contract.

#### Scenario: Initial Career Contract deal across three focuses
- **WHEN** Career Contracts unlock or initialize
- **THEN** Slot 1 receives a Combat Precision objective, Slot 2 receives a Swarm & Tour objective, and Slot 3 receives a Duel Competitive objective from the active tier's buckets.

#### Scenario: Shuffle-bag replacement upon completing a Career Contract
- **WHEN** a player completes and claims a Career Contract in any slot
- **THEN** the slot immediately draws an unseen contract from that focus's bucket in the player's current tier, reshuffling the bucket only after every contract in that bucket has been drawn.

### Requirement: Dual-Gated Career Tier Progression and Scarce Rewards
The system SHALL organize Career Contracts into Tiers 1 through 5 (`Rookie`, `Contender`, `Pro`, `Elite`, `Apex`), requiring both a tier completion quota and a Player Level milestone to promote while scaling Arc Credits, Sparks, and XP payouts per tier.

#### Scenario: Tier promotion thresholds and dual-gate hold
- **WHEN** a player completes the required number of Career Contracts in their current tier (Tier 1->2: 6 contracts + Lv 10; Tier 2->3: 9 contracts + Lv 18; Tier 3->4: 12 contracts + Lv 28; Tier 4->5: 15 contracts + Lv 40)
- **THEN** if both the completion count and Player Level gate are met, all subsequent draws promote to the next tier; if the completion count is met before the Player Level gate, new contracts continue drawing from the current tier bucket without stalling.

#### Scenario: Tiered Career Contract reward distribution
- **WHEN** a player claims a completed Career Contract
- **THEN** the system awards Tier 1: `300 AC + 1 Spark + 300 XP`, Tier 2: `600 AC + 2 Sparks + 500 XP`, Tier 3: `1,000 AC + 3 Sparks + 800 XP`, Tier 4: `1,600 AC + 4 Sparks + 1,200 XP`, or Tier 5: `2,500 AC + 5 Sparks + 1,800 XP`.

#### Scenario: Endless Tier 5 Apex deck cycling
- **WHEN** a player reaches Tier 5 (`Apex`) and completes contracts
- **THEN** Tier 5 contracts continue dealing endlessly via shuffle-bag rotation without capping out or terminating the Career deck.

### Requirement: Reactive Contract Telemetry Evaluation and UI Modal
The system SHALL track gameplay telemetry events across matches, maneuvers, Swarm waves, and Federation Tour clears to increment matching active Daily and Career Contracts in real time, and SHALL expose a dedicated `CONTRACTS` modal for viewing progress and claiming rewards.

#### Scenario: Incrementing active contracts from combat telemetry
- **WHEN** the player executes a parry, multi-ricochet hit, curve fracture, Swarm wave clear, Tour trial clear, or Duel win
- **THEN** every matching active Daily or Career Contract updates its progress counter and persists the updated state cleanly.

#### Scenario: Claiming completed contract rewards in Contracts modal
- **WHEN** the player opens the `CONTRACTS` modal and clicks `[ CLAIM ]` on a satisfied contract
- **THEN** the system grants the contract's XP, Arc Credits, and Sparks atomically, triggers audio feedback, and deals the replacement contract for Career slots.
