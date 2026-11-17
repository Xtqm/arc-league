# Combat AI Specification

## Purpose

Governs autonomous AI bot behaviors, tactical positioning, predictive evasion, counter-catch interceptions, and failsafe re-arming.

## Requirements

### Requirement: Tactical Positioning and Pillar Cover
The system SHALL direct autonomous AI combatants to track targets, circle at combat distance, and utilize arena pillars for protective cover.

#### Scenario: AI tracks moving opponent
- **WHEN** an opponent shifts position in the arena
- **THEN** the AI reorients toward the target and adjusts movement vectors to maintain combat range while seeking pillar obstruction against incoming lines of fire.

### Requirement: Predictive Evasive Maneuvers
The system SHALL trigger autonomous evasive reactions including jumping over low throws and performing rapid lateral dashes.

#### Scenario: Jump reaction to low projectile
- **WHEN** an incoming hostile disc approaches the AI along a low altitude trajectory
- **THEN** the AI executes a timed jump to let the projectile pass underneath.

### Requirement: Counter-Catch Interception
The system SHALL permit an AI bot facing a deflected incoming projectile within 2.2 meters to catch the disc and queue an immediate counter-attack.

#### Scenario: AI intercepts returning deflected disc
- **WHEN** a player-deflected disc travels back toward the bot within 2.2 meters and the bot is facing the incoming path
- **THEN** the bot executes a counter-catch, displays a particle burst, and primes a rapid counter-throw within 0.35 to 0.75 seconds.

### Requirement: Failsafe Re-Arm Watchdog
The system SHALL ensure AI combatants are re-armed within 2.5 seconds if their disc is lost to a void plunge or boundary clip.

#### Scenario: Disarmed bot recovery
- **WHEN** an AI bot is disarmed and its projectile is eliminated without returning
- **THEN** the re-arm watchdog activates and reloads a disc to the bot within 2.5 seconds.

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

### Requirement: Multi-Layer Rival Shields
The system SHALL equip Rival Arbiter bosses with multi-layer defensive shields that absorb projectile impacts before core integrity can be damaged.

#### Scenario: Disc impacts active Rival Shield
- **WHEN** a player disc strikes an Arbiter boss possessing an active shield layer
- **THEN** the impact depletes one shield layer, triggers a defensive harmonic particle shockwave, and prevents core damage.

#### Scenario: Core vulnerability upon shield depletion
- **WHEN** all shield layers of an Arbiter boss have been depleted
- **THEN** subsequent projectile impacts apply direct damage to the Arbiter's core health.

#### Scenario: Shield regeneration interval
- **WHEN** an Arbiter's shields remain depleted for an extended recovery window without sustaining core damage
- **THEN** the boss primes and re-energizes one shield layer with an audio-visual recharge cue.

### Requirement: Aggressive Curve-Disc Volleys
The system SHALL enable Rival Arbiter bosses to execute multi-disc curve volleys curving around cover obstacles toward player positions.

#### Scenario: Boss unleashing a curve volley
- **WHEN** an Arbiter triggers a curve volley attack routine
- **THEN** the boss launches rapid sequential discs infused with lateral spin that arc around obstacles toward the player.

### Requirement: Reactive Dash-Evasion Routines
The system SHALL empower Rival Arbiter bosses to execute rapid kinetic dash maneuvers to evade incoming high-velocity throws.

#### Scenario: Evading direct incoming projectile
- **WHEN** an incoming player disc approaches within 6 meters along the Arbiter's direct line of sight
- **THEN** the Arbiter executes a rapid lateral dash with particle trail emission and a temporary invulnerability frame window.
