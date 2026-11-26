# Spec Delta

## ADDED Requirements

### Requirement: Atomic Sparks Currency Transactions
The system SHALL provide atomic balance queries, affordability checks, awards, and expenditures for the scarce Sparks prestige currency against `player.currency.sparks` with strict integer validation guards.

#### Scenario: Awarding Sparks to player
- **WHEN** a valid integer amount of Sparks is awarded with an identifiable source
- **THEN** the system increments `player.currency.sparks`, persists the balance, records an audit entry, and emits a `SPARKS_EARNED` event.

#### Scenario: Spending Sparks with sufficient balance
- **WHEN** a transaction requests spending Sparks and the player balance is greater than or equal to the cost
- **THEN** the system deducts the cost from `player.currency.sparks`, persists the update, records an audit entry, and returns true.

#### Scenario: Rejecting Sparks expenditure with insufficient balance or invalid input
- **WHEN** a Sparks spend request exceeds current balance or supplies a non-positive, fractional, or non-numeric amount
- **THEN** the system rejects the transaction, leaves `player.currency.sparks` unchanged, and returns false.

## MODIFIED Requirements

### Requirement: Atomic Bits Currency Transactions
The system SHALL provide atomic balance queries, balance affordability checks, credits, and debits for Arc Credits (AC) currency against the player profile, while maintaining backward-compatible internal migration for legacy Bits storage keys.

#### Scenario: Awarding Bits to player
- **WHEN** a valid amount of Arc Credits is awarded with an identifiable source
- **THEN** the system increments the player's Arc Credits balance, persists the new total to storage, and dispatches a currency earned event with the amount, source, and new balance.

#### Scenario: Verifying affordability
- **WHEN** a system queries whether the player can afford a specific Arc Credits cost
- **THEN** the system returns true if the player's balance is greater than or equal to the cost, and false otherwise, without mutating state.

#### Scenario: Spending Bits with sufficient balance
- **WHEN** a transaction requests spending Arc Credits for a specific category and item and the player has sufficient balance
- **THEN** the system deducts the cost from the player's balance, persists the update, records the transaction, and returns true.

#### Scenario: Spending Bits with insufficient balance
- **WHEN** a transaction requests spending more Arc Credits than the player currently possesses
- **THEN** the system rejects the transaction, maintains the existing balance, leaves persistent state unchanged, and returns false.

### Requirement: Level Up Event Emission and Milestone Rewards
The system SHALL broadcast level up lifecycle events and distribute Arc Credits and Sparks milestone rewards whenever a player advances in level, granting 25 Arc Credits on unlisted levels and tiered milestone bonuses on landmark levels.

#### Scenario: Emitting level up event
- **WHEN** XP accumulation causes a player level increase
- **THEN** the system broadcasts a level up event containing the previous level, new level, and any awarded milestone Arc Credits or Sparks.

#### Scenario: Granting milestone rewards on qualifying levels
- **WHEN** a player advances to a landmark milestone level (Lv 2–4: 50 AC; Lv 5: 150 AC; Lv 10: 350 AC + 1 Spark; Lv 15: 600 AC + 2 Sparks; Lv 20: 1,000 AC + 3 Sparks; Lv 25: 1,500 AC + 5 Sparks; Lv 50: 4,000 AC + 10 Sparks; Lv 100: 10,000 AC + 25 Sparks)
- **THEN** the system automatically credits the specified Arc Credits and Sparks to the player's profile and records both in the event payload.

#### Scenario: Granting fallback Arc Credits on unlisted levels
- **WHEN** a player advances to a level not explicitly defined in the milestone table (such as Level 6 through 9 or Level 11 through 14)
- **THEN** the system automatically credits 25 Arc Credits to the player's balance and records the grant in the event payload.

### Requirement: Developer Debug Suite Console Instrumentation
The system SHALL expose debug manipulation hooks on the global developer namespace for manual testing and administrative simulation, supporting Arc Credits and Sparks manipulation.

#### Scenario: Modifying Bits via debug console
- **WHEN** a developer invokes `gameDebug.addCredits` (or legacy `addBits`) or `gameDebug.addSparks`
- **THEN** the system adjusts the corresponding Arc Credits or Sparks balance by the specified amount and persists the mutation.

#### Scenario: Setting player XP and level via debug console
- **WHEN** a developer invokes debug setXP or setLevel methods
- **THEN** the system directly updates the player level and XP to the requested values, syncing with storage and updating internal calculations.

#### Scenario: Resetting economy state via debug console
- **WHEN** a developer invokes the debug resetEconomy method
- **THEN** the system resets Arc Credits, Sparks, level, XP, and audit logs to their initial default baseline values.

### Requirement: Combat Skill Maneuver Rewards and Kinetic HUD Telemetry
The system SHALL award immediate progression XP—and zero Arc Credits currency—during active combat for executing verified high-skill maneuvers (confirmed disc parries: 40 XP, multi-ricochet strikes: 30 XP plus 10 XP per extra bounce beyond 2, curve fractures: 25 XP) and emit telemetry to the top-left tactical XP HUD queue.

#### Scenario: Confirmed disc parry reward
- **WHEN** the player successfully parries an incoming hostile disc with their block shield
- **THEN** the system awards 40 XP with zero Arc Credits and pushes a `+40 XP // PARRY` entry to the top-left tactical XP log.

#### Scenario: Multi-ricochet hit reward
- **WHEN** a player's disc impacts a foe after bouncing 2 or more times off arena geometry or obstacles
- **THEN** the system awards `30 + (bounces - 2) * 10` XP with zero Arc Credits and pushes a bank-shot entry to the top-left tactical XP log.

#### Scenario: Curve shot elimination reward
- **WHEN** a hostile program is fractured by a disc possessing active lateral curve deflection
- **THEN** the system awards 25 XP with zero Arc Credits and pushes a `+25 XP // CURVE FRACTURE` entry to the top-left tactical XP log.
