# Spec Delta: game-modes

## ADDED Requirements

### Requirement: Decoupled Duel Entry Modalities
The system SHALL provide distinct, non-conflated user entry paths for Solo AI Practice, automated Quick Match, and Friendly Custom Rooms, ensuring each mode initializes strictly within its own gameplay and networking lifecycle.

#### Scenario: Direct activation of Solo AI Practice from Main Menu
- **WHEN** a player clicks the `PRACTICE (SOLO AI)` button (`#practiceBtn`) on the primary main menu
- **THEN** the system immediately starts offline endless tiered bot combat (`duel_ai`) starting at Tier 1 (250 HP) without opening a multiplayer modal or initializing network signaling.

#### Scenario: Direct activation of Quick Match from Main Menu
- **WHEN** a player clicks the `QUICK MATCH` button (`#quickMatchBtn`) on the primary main menu
- **THEN** the system immediately initiates automated matchmaking with the interactive warm-up sparring bot and active search HUD banner.

#### Scenario: Activation of Friendly Room Host Modal
- **WHEN** a player clicks the `HOST ARCFIELD MATCH` button (`#hostMatchBtn`) on the primary main menu
- **THEN** the system opens `#hostModal` configured specifically for custom friendly room creation (arena sector and series length selection for 1v1 / 2v2 friend invites) without starting an automated matchmaking queue or spawning a warm-up bot.

## MODIFIED Requirements

### Requirement: Online Series Round Length Configuration in Host Lobby
The system SHALL display a series length selector (`BO1`, `BO3`, `BO5`, `BO7`, defaulting to `BO3`) inside the Host Match lobby, applying the chosen Best-of-N win target strictly to hosted online `1v1` and `2v2` matches while leaving Solo AI Duel, Swarm, and Campaign round flows untouched.

#### Scenario: Selecting Best-of-N format when hosting online 1v1 or 2v2
- **WHEN** a host opens `#hostModal`, selects a series length (`1`, `3`, `5`, or `7` rounds), and creates a `1v1` or `2v2` room
- **THEN** the created room initializes with `bestOf` equal to the chosen series count (defaulting to `3` when unchanged) and plays to `ceil(bestOf / 2)` round wins before showing rematch/leave controls.

#### Scenario: Single-player modes ignore online series settings
- **WHEN** a player starts Solo AI Duel (`duel_ai`), Swarm, or Campaign from the Main Menu or Host Modal
- **THEN** single-player tier progression, wave progression, and AI Game Over handling remain completely unaffected by the online series selector.
