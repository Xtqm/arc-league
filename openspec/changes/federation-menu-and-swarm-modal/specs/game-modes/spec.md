# Spec Delta

## MODIFIED Requirements

### Requirement: Survival Hardcore Mode and Dynamic Director
The system SHALL present Swarm Protocol variants (`STANDARD` and `HARDCORE`) inside a dedicated Swarm Deployment modal triggered by `SWARM PROTOCOL`, locking `HARDCORE` until Wave 10 is cleared in `STANDARD` Swarm and deploying Hardcore runs at baseline difficulty Level 5 with Dynamic Director counter-play and Sparks milestone rewards.

#### Scenario: Unlocking Hardcore survival mode
- **WHEN** a player with `stats.swarmHighestWave < 10` clicks `SWARM PROTOCOL` vs. a player who has cleared Wave 10 in Standard Swarm
- **THEN** the Swarm Protocol modal displays `STANDARD` (Arc Credits + XP) and `HARDCORE` (Sparks + XP), marking `HARDCORE` locked until Wave 10 is cleared and unlocked thereafter.

#### Scenario: Initializing Hardcore survival match
- **WHEN** an eligible player selects `STANDARD` or `HARDCORE` inside the Swarm Protocol modal
- **THEN** the modal closes, `state.isHardcoreSurvival` is configured to match the chosen variant, and Hardcore launches at baseline difficulty Level 5 with Dynamic Director and Sparks milestone rewards active.

#### Scenario: Dynamic Director countering turtling player
- **WHEN** the Dynamic Director detects the player maintaining defensive parry blocks for extended intervals in Hardcore Swarm
- **THEN** the Director elevates bot charged throw frequency to enforce guard crush attempts.

### Requirement: Decoupled Duel Entry Modalities
The system SHALL provide distinct, clearly labeled user entry paths on the Tactical Rail menu for `AI PRACTICE`, `ARC LEAGUE RANKED`, and Friendly Custom Rooms (`HOST FRIENDLY MATCH` / `JOIN FRIENDLY MATCH`), ensuring each mode initializes strictly within its own gameplay and networking lifecycle.

#### Scenario: Direct activation of Solo AI Practice from Main Menu
- **WHEN** a player clicks `AI PRACTICE` (`#practiceBtn`) on the primary tactical rail menu
- **THEN** the system immediately starts offline endless tiered bot combat (`duel_ai`) starting at Tier 1 (250 HP) without opening a multiplayer modal or initializing network signaling.

#### Scenario: Direct activation of Quick Match from Main Menu
- **WHEN** a player clicks `ARC LEAGUE RANKED` (`#quickMatchBtn`) on the primary tactical rail menu
- **THEN** the system immediately initiates automated matchmaking with the interactive warm-up sparring bot and active search HUD banner.

#### Scenario: Activation of Friendly Room Host Modal
- **WHEN** a player clicks `HOST FRIENDLY MATCH` (`#hostMatchBtn`) on the primary tactical rail menu
- **THEN** the system opens `#hostModal` configured specifically for custom friendly room creation (arena sector and series length selection for 1v1 / 2v2 friend invites) without starting an automated matchmaking queue or spawning a warm-up bot.
