# Spec Delta: Combat AI

## MODIFIED Requirements

### Requirement: Rival Arbiter Boss AI Controller
The system SHALL provide a specialized autonomous AI controller for Rival Arbiter boss encounters managing sector-specific combat personalities, offensive volleys, tactical positioning, and defense routines.

#### Scenario: Arbiter boss initialization
- **WHEN** an Arbiter boss encounter starts
- **THEN** the Arbiter AI initializes with sector-scaled core health, multi-layer shields, and elevated projectile speed.

#### Scenario: Arbiter boss initialization with distinct personality
- **WHEN** an Arbiter boss encounter starts in Campaign or high-tier trial
- **THEN** the Arbiter AI initializes with sector-scaled core health, multi-layer shields, and personality-specific behavior weights (Sentinel Heavy Bulwark, Sailmaster Agile Aerialist, Leviathan Geometric Banker, or Master Control Apex AI).

#### Scenario: Master Control Level 10 Apex activation
- **WHEN** the Grid 04 Master Control Arbiter encounter begins
- **THEN** the boss operates at Level 10 difficulty, utilizing charged curve volleys, frame-perfect parrying, wall-bank traps, and elite minion command.

## ADDED Requirements

### Requirement: Internal Capability Matrix and Difficulty Scaling
The system SHALL govern bot combat capabilities through an internal 10-level capability matrix that gates access to lead aiming, pillar cover, jump evasion, tactical dashing, curve throws, parry defense, charged throws, bank ricochet shots, and adaptive counters based on combat difficulty rating.

#### Scenario: Low difficulty bot restricted to baseline behaviors
- **WHEN** an AI bot is initialized with a difficulty rating below Level 3
- **THEN** the bot executes baseline lead aiming and strafing while curve throws, parrying, and charged throws remain locked.

#### Scenario: High difficulty bot unlocking advanced player-parity capabilities
- **WHEN** an AI bot is initialized with or scales to a difficulty rating of Level 5 or higher
- **THEN** the bot unlocks parry defense, charged guard-crush throws, and evasive dashes.

### Requirement: Autonomous Bot Parrying and Ping-Pong Rallies
The system SHALL enable AI bots possessing parry capability to raise a frontal parry shield against incoming direct player projectiles, deflecting eligible discs back toward the thrower with a 1.25x velocity multiplier while incurring whiff cooldown on mistimed parries.

#### Scenario: Bot successfully parries incoming direct throw
- **WHEN** a player disc approaches an alert bot possessing parry capability within its frontal cone and the throw charge is under 85%
- **THEN** the bot raises its parry shield, deflects the disc toward the player at 1.25x incoming speed, and emits a parry burst.

#### Scenario: Bot parry broken by charged guard crush
- **WHEN** a player throws a disc with at least 85% charge at a bot attempting to block or parry
- **THEN** the bot's parry is shattered, full charged damage is applied, and the bot is staggered into a guard crush state.

#### Scenario: Bot parry whiff cooldown
- **WHEN** a bot engages parry prematurely or fails to intercept an incoming disc
- **THEN** the bot incurs a 0.8-second shield cooldown during which subsequent parries are disabled.

### Requirement: Autonomous Bot Charged Throws and Guard Crush
The system SHALL permit AI bots with charged throw capability to hold disc throws up to 1.0 second, increasing launch speed and base damage proportionally while applying guard crush against blocking defenders when charged to at least 85%.

#### Scenario: Bot winds up and releases a charged throw
- **WHEN** an AI bot possessing charged throw capability targets an opponent who is frequently blocking or stationary
- **THEN** the bot coils into a charging throw stance for up to 1.0 second and releases a high-velocity charged projectile.

#### Scenario: Bot charged throw crushes player guard
- **WHEN** a bot disc thrown with at least 85% charge strikes a player who is actively blocking or parrying
- **THEN** the player's parry fails, full damage is inflicted, and a guard crush alert is triggered.

### Requirement: Geometric Wall-Bank Ricochet Aiming
The system SHALL enable high-tier AI bots to calculate specular reflection vectors off arena walls to target opponents obscured by pillar cover or strike an opponent's rear hemisphere.

#### Scenario: Bot aims banked ricochet around pillar cover
- **WHEN** an opponent is concealed behind a protective pillar and the bot possesses bank-shot capability
- **THEN** the bot computes a 1-bounce specular angle off an adjacent arena boundary wall and fires along the reflected vector toward the target.

#### Scenario: Banked rear strike execution
- **WHEN** a banked disc launched by an AI bot collides with an opponent's rear hemisphere after at least one surface ricochet
- **THEN** the impact inflicts 2x critical rear damage.

### Requirement: Swarm Squad Commander and Disarray Lifecycle
The system SHALL spawn designated Squad Commander bots in high-difficulty Swarm waves to issue tactical pincer and staggered volley commands to minion drones, triggering a tiered disarray lifecycle upon the Commander's defeat.

#### Scenario: Commander directing coordinated pincer
- **WHEN** an active Squad Commander bot detects a player position in Swarm mode
- **THEN** the Commander emits a command pulse and directs adjacent minion drones to execute wide flanking movement vectors.

#### Scenario: Early wave Commander defeat collapses swarm
- **WHEN** a Squad Commander is eliminated during early waves (Waves 4 to 7)
- **THEN** the swarm carrier signal collapses, remaining minion drones de-rez in an electrical chain reaction, and the wave concludes immediately.

#### Scenario: Mid wave Commander defeat triggers temporary disarray
- **WHEN** a Squad Commander is eliminated during mid waves (Waves 8 to 12)
- **THEN** surviving minion drones enter a 2.5-second disarray state with reduced accuracy and movement before resuming independent combat.

#### Scenario: Late wave Commander defeat triggers election of new Commander
- **WHEN** a Squad Commander is eliminated during advanced waves (Wave 13 or higher)
- **THEN** surviving minions enter a brief disarray window after which the highest-HP surviving drone is promoted to Squad Commander and re-establishes squad coordination.
