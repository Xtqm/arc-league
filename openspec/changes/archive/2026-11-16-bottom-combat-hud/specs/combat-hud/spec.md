# Spec Delta

## MODIFIED Requirements

### Requirement: Compact Player Status and Control Sizing
The system SHALL render the local player's health (`Program Integrity`) and dash `Energy` meters alongside an `Identity Disc` state emblem in an ultra-minimal bottom-center under-rail hybrid dock, and SHALL apply tighter meter dimensions on touch/mobile viewports while keeping top-right HUD buttons at least 44x44 pixels.

#### Scenario: Player status bars remain compact in active combat
- **WHEN** the player enters any active game mode on desktop or mobile
- **THEN** the bottom-center under-rail dock displays the player's health meter on the left, an Identity Disc emblem in the center, and dash energy meter on the right over a subtle cyan datum rail, leaving the arena floor tiles and void hazards visible through transparent gaps.

#### Scenario: Touch viewport uses compact HUD buttons with accessible tap targets
- **WHEN** gameplay runs on a touch device
- **THEN** the bottom-center dock renders between the virtual movement joystick and the action button cluster, and the top-right HUD panel uses compact icon-oriented Pause and Fullscreen controls whose clickable bounds remain at least 44x44 pixels.

#### Scenario: Identity Disc emblem reflects disc readiness states
- **WHEN** the player holds, throws, or catches the Identity Disc
- **THEN** the center disc emblem displays a glowing cyan ring when ready, a dimmed hollow ring with reduced opacity when in flight, and a transient pulse flash upon retrieval.

### Requirement: Timed Control Hint Auto-Hide
The system SHALL display the mode-appropriate opening control hint (`#hint` on desktop or `#mobileHint` on touch devices) positioned vertically above the bottom dock when a match starts, and SHALL automatically fade and hide that hint after an initial grace period during active combat.

#### Scenario: Control hint displays at match start and auto-hides during gameplay
- **WHEN** a player launches a match and active gameplay begins
- **THEN** the control hint is positioned vertically above the bottom-center dock, is initially visible, and automatically fades out and hides after several seconds of active play without requiring manual dismissal.

#### Scenario: Control hint resets cleanly on subsequent matches
- **WHEN** the player exits to the menu or starts a new match or rematch
- **THEN** the auto-hide timer resets so the opening hint behavior repeats cleanly on the next match start.
