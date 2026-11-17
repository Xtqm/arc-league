# Spec Delta: Game Modes

## MODIFIED Requirements

### Requirement: Swarm Survival Wave Progression
The system SHALL provide an infinite wave survival mode where eliminating all active foes or neutralizing the Squad Commander during collapse-eligible waves increments the cycle index and spawns an expanded enemy cohort.

#### Scenario: All foes eliminated in Swarm mode
- **WHEN** the last remaining hostile bot in a wave is destroyed in Swarm mode
- **THEN** the cycle counter increments, a wave completion banner appears, and the next wave spawns with scaled foe count.

#### Scenario: Commander collapse clears wave early
- **WHEN** the active Squad Commander is eliminated during an early Commander wave (Waves 4 to 7)
- **THEN** peripheral drones immediately de-rez, the cycle counter increments, and the next wave spawns.

## ADDED Requirements

### Requirement: Survival Hardcore Mode and Dynamic Director
The system SHALL provide an optional Survival: Hardcore mode unlocked after clearing Wave 10 in Standard Survival, initializing at baseline difficulty Level 5 and utilizing a Dynamic Director AI to actively counter player combat patterns.

#### Scenario: Unlocking Hardcore survival mode
- **WHEN** a player successfully completes Wave 10 in Standard Survival mode
- **THEN** the system persists the Hardcore survival unlock in storage and reveals the Hardcore mode option in the Survival lobby.

#### Scenario: Initializing Hardcore survival match
- **WHEN** the player launches Survival: Hardcore mode
- **THEN** the match initializes at baseline difficulty Level 5, enabling squad commanders, charged throws, and dynamic tactical counters from Wave 1.

#### Scenario: Dynamic Director countering turtling player
- **WHEN** the Dynamic Director detects the player maintaining defensive parry blocks for extended intervals
- **THEN** the Director elevates bot charged throw frequency to enforce guard crush attempts.
