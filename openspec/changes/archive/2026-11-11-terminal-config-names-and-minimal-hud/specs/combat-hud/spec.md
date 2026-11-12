# Spec Delta: Combat HUD

## Purpose

Defines the live combat heads-up display (HUD) layout, compact mobile and desktop status meters, timed opening control hints, minimal online match HUD surfaces, and world-space overhead combatant nameplates for Arc League.

## ADDED Requirements

### Requirement: Compact Player Status and Control Sizing
The system SHALL render the local player's health (`Program Integrity`), disc readiness (`Identity Disc`), and dash `Energy` indicators in a compact top-left status panel, and SHALL apply tighter panel padding, font sizes, and spacing on touch/mobile viewports while keeping interactive HUD buttons at least 44x44 pixels.

#### Scenario: Player status bars remain compact in active combat
- **WHEN** the player enters any active game mode on desktop or mobile
- **THEN** the top-left HUD displays the player's own health, disc availability, and energy meters with compact proportions that leave the central arena unobstructed.

#### Scenario: Touch viewport uses compact HUD buttons with accessible tap targets
- **WHEN** gameplay runs on a touch device
- **THEN** top-left and top-right HUD panels use reduced spacing and compact icon-oriented Pause and Fullscreen controls whose clickable bounds remain at least 44x44 pixels.

### Requirement: Timed Control Hint Auto-Hide
The system SHALL display the mode-appropriate opening control hint (`#hint` on desktop or `#mobileHint` on touch devices) when a match starts, and SHALL automatically fade and hide that hint after an initial grace period during active combat.

#### Scenario: Control hint displays at match start and auto-hides during gameplay
- **WHEN** a player launches a match and active gameplay begins
- **THEN** the control hint is initially visible and automatically fades out and hides after several seconds of active play without requiring manual dismissal.

#### Scenario: Control hint resets cleanly on subsequent matches
- **WHEN** the player exits to the menu or starts a new match or rematch
- **THEN** the auto-hide timer resets so the opening hint behavior repeats cleanly on the next match start.

### Requirement: Minimal Online Match Top-Right HUD
The system SHALL strip non-essential telemetry from the top-right HUD during online `1v1` and `2v2` matches, displaying only the compact Pause/Fullscreen controls and a small rival integrity bar while hiding room codes, score counters, and aggregate rival HP text.

#### Scenario: Online 1v1 and 2v2 top-right HUD shows only controls and rival bar
- **WHEN** a player is in an active online `1v1` or `2v2` match
- **THEN** the top-right HUD displays the Pause/Fullscreen controls and the compact rival integrity bar reflecting aggregate living opponent health percentage, while omitting score, room label, and rival HP text readouts.

#### Scenario: Single-player modes preserve mode-specific HUD readouts
- **WHEN** a player is in Solo AI Duel (`duel_ai`), Swarm (`swarm`), or Campaign (`campaign`) mode
- **THEN** the top-right HUD continues displaying mode-appropriate tier, cycle, hostile count, and score readouts alongside compact styling.

### Requirement: Arena Overhead Nameplates for Remote Online Combatants
The system SHALL render floating overhead nameplates above remote human combatants in the arena strictly during online `1v1` and `2v2` matches, color-coded by team affiliation, and SHALL NOT display an overhead nameplate above the local player's own character or in offline/AI modes.

#### Scenario: Remote players display team-colored overhead nameplates in online 1v1 and 2v2
- **WHEN** a remote teammate or opponent is alive and in front of the camera during an online `1v1` or `2v2` match
- **THEN** a crisp overhead nameplate displays their callsign above their character, styled in cyan for teammates and purple for opponents, updating smoothly as they move and hiding when eliminated or behind the camera.

#### Scenario: Local player name is omitted in the arena
- **WHEN** the local player is in an online `1v1` or `2v2` match
- **THEN** no floating nameplate is rendered above the local player's own third-person character model.

#### Scenario: Non-online modes omit arena overhead nameplates
- **WHEN** the player competes in Solo AI Duel, Swarm, Campaign, or Quick Match warm-up sparring against AI bots
- **THEN** no online combatant nameplates are rendered in the arena.
