# Spec Delta: Game Modes

## ADDED Requirements

### Requirement: Online Series Round Length Configuration in Host Lobby
The system SHALL display a series length selector (`BO1`, `BO3`, `BO5`, `BO7`, defaulting to `BO3`) inside the Host Match lobby, applying the chosen Best-of-N win target strictly to hosted online `1v1` and `2v2` matches while leaving Solo AI Duel, Swarm, and Campaign round flows untouched.

#### Scenario: Selecting Best-of-N format when hosting online 1v1 or 2v2
- **WHEN** a host opens `#hostModal`, selects a series length (`1`, `3`, `5`, or `7` rounds), and creates a `1v1` or `2v2` room
- **THEN** the created room initializes with `bestOf` equal to the chosen series count (defaulting to `3` when unchanged) and plays to `ceil(bestOf / 2)` round wins before showing rematch/leave controls.

#### Scenario: Single-player modes ignore online series settings
- **WHEN** a player starts Solo AI Duel (`duel_ai`), Swarm, or Campaign from the Main Menu or Host Modal
- **THEN** single-player tier progression, wave progression, and AI Game Over handling remain completely unaffected by the online series selector.

## MODIFIED Requirements

### Requirement: Duel Match Outcome Payouts and Defeat Participation
The system SHALL award 50 Bits and XP for 1v1 or 2v2 victories against AI opponents, 100 Bits and XP for online Best-of-N multiplayer series victories (credited once upon series clinch), and grant participation XP upon series defeat.

#### Scenario: Solo or practice AI duel victory
- **WHEN** the player destroys the opponent bot and achieves victory in an AI duel
- **THEN** the system credits 50 Bits plus victory XP to the player profile and persists the update.

#### Scenario: Multiplayer duel match victory
- **WHEN** a player or team clinches a Best-of-N series in an online `1v1` or `2v2` room or Quick Match
- **THEN** the system credits 100 Bits plus multiplayer victory XP to the victor's profile once for the completed series and persists the update.

#### Scenario: Match defeat participation credit
- **WHEN** a player suffers de-rez in Solo AI Duel or loses a completed Best-of-N online series
- **THEN** the system awards a bounded participation XP payout without Bits to honor player investment while preventing defeat-farming exploits.
