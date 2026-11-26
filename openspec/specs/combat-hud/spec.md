# Combat HUD Specification

## Purpose

Defines the live combat heads-up display (HUD) layout, compact mobile and desktop status meters, timed opening control hints, minimal online match HUD surfaces, and world-space overhead combatant nameplates for Arc League.

## Requirements

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

### Requirement: Minimal Online Match Top-Right HUD
The system SHALL strip non-essential telemetry from the top-right HUD during online `1v1` and `2v2` matches, displaying only the compact Pause/Fullscreen controls, the small rival integrity bar, and (strictly when `bestOf > 1`) an ultra-compact series win-pip score strip directly beneath the rival bar while keeping room codes, point scores, and aggregate rival HP text hidden.

#### Scenario: Online 1v1 and 2v2 top-right HUD shows only controls and rival bar
- **WHEN** a player is in an active Best-of-1 (`bestOf = 1`) online `1v1` or `2v2` match
- **THEN** the top-right HUD displays the Pause/Fullscreen controls and the compact rival integrity bar reflecting aggregate living opponent health percentage, while hiding the series score strip, score, room label, and rival HP text readouts.

#### Scenario: Multi-round online series shows compact series pips beneath rival bar
- **WHEN** a player is in an active multi-round (`bestOf > 1`) online `1v1` or `2v2` match
- **THEN** an ultra-compact series score strip directly below the rival integrity bar displays current win pips and scores (`YOU` in cyan vs `RIVAL` / `RIVALS` in purple) sized consistently for desktop and mobile viewports without restoring `#roundLabel` or `#scoreRow`.

#### Scenario: Single-player modes preserve mode-specific HUD readouts
- **WHEN** a player is in Solo AI Duel (`duel_ai`), Swarm (`swarm`), or Campaign (`campaign`) mode
- **THEN** the top-right HUD continues displaying mode-appropriate tier, cycle, hostile count, and score readouts alongside compact styling with the online series score strip hidden.

### Requirement: Between-Round Series Intermission Feedback
The system SHALL present a brief, non-interactive round-result intermission callout (`ROUND X WON` / `ROUND X LOST` and current score) during online Best-of-N series whenever a sub-round finishes prior to series clinch, hiding automatically when the next round countdown starts.

#### Scenario: Sub-round completion displays brief score update before next countdown
- **WHEN** an intermediate round ends in a multi-round online `1v1` or `2v2` series
- **THEN** the HUD displays the round outcome and updated team series score during the ~2-second transition and clears automatically once the next round resets into its 3-second countdown.

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

### Requirement: Dirty-Checked HUD DOM Mutation
The system SHALL cache all combat HUD DOM element references at initialization and mutate layout properties, widths, and text content strictly when player integrity, disc possession, dash energy, or opponent status values change.

#### Scenario: Steady-state combat execution without DOM thrashing
- **WHEN** combat updates occur while player and opponent health, energy, and disc readiness remain unchanged
- **THEN** the HUD update pass performs zero DOM attribute or style mutations, preventing browser layout recalculations.

#### Scenario: Reactive telemetry updates on state change
- **WHEN** player integrity decreases or disc possession changes
- **THEN** the corresponding HUD element styles and text are updated immediately to reflect the new state.

### Requirement: Device-Adaptive Contextual Input Prompts
The system SHALL dynamically render HUD action prompts using the active input device's glyphs, switching between Keyboard/Mouse labels (`[LMB]`, `[RMB]`, `[Q/E]`), Gamepad button labels (`[RT]`, `[LT]`, `[LB/RB]`), and Touch button labels (`[THROW]`, `[SHIELD]`, `[L/R]`).

#### Scenario: Displaying KBM prompts when using mouse and keyboard
- **WHEN** the player's last input was registered from keyboard or mouse
- **THEN** contextual instructional prompts render keyboard and mouse button indicators.

#### Scenario: Displaying Gamepad prompts when using a controller
- **WHEN** the player's last input was registered from a connected gamepad
- **THEN** contextual instructional prompts render controller trigger and bumper indicators.

#### Scenario: Displaying Mobile touch prompts on touch devices
- **WHEN** the game runs on a touch-enabled mobile platform
- **THEN** contextual instructional prompts render touch button action names.

### Requirement: Mobile Perspective HUD Toggle Control
The system SHALL display a compact perspective toggle button on mobile viewports allowing touch players to switch between First-Person and Third-Person camera perspectives.

#### Scenario: Tapping mobile perspective toggle button
- **WHEN** a touch player taps the perspective toggle button in the top HUD
- **THEN** the camera switches between First-Person and Third-Person viewports and the button icon updates to indicate the active state.

### Requirement: Minimal In-Game Notification Filtering
The system SHALL filter routine locomotion actions (including air jumps, recovery jumps, and recovery dashes) and routine combat exchanges (including deflections, guard crushes, shield hits, evades, and disc catches) out of the central in-game text notification display (`#msg`), restricting active gameplay text announcements exclusively to major match flow milestones and lobby lifecycle states.

#### Scenario: Locomotion actions trigger zero center screen text popups
- **WHEN** the player executes an air jump, recovery jump, or recovery dash in active gameplay
- **THEN** audio chimes and particle bursts render normally while `#msg` remains completely silent with zero text content and zero opacity.

#### Scenario: Routine combat exchanges trigger zero center screen text popups
- **WHEN** a disc deflection, shield strike, guard crush, rear hit, or rival catch occurs in active combat
- **THEN** combat sparks, audio cues, and status bars update while `#msg` remains unaffected, leaving the player's crosshair and target sightlines unobstructed.

#### Scenario: Major match milestones display on screen
- **WHEN** a match or round begins, wave spawns, cycle advances, tier is reached, or network connection state changes
- **THEN** `#msg` displays the corresponding milestone announcement (e.g. `ROUND X — FIGHT!`, `CYCLE X`, `CHALLENGER CONNECTED — FIGHT!`).

#### Scenario: Decoupled combat telemetry remains accessible to test inspectors
- **WHEN** test harness or debug inspection checks combat resolution (such as deflections or catches)
- **THEN** test inspectors verify combat state directly without requiring DOM text string matches on `#msg`.

### Requirement: Responsive Announcement Typography
The system SHALL render the primary announcement display (`#msg`) elevated above active combat sightlines (`top: 15%`) and scale its typography adaptively using fluid sizing (`clamp(...)`) across desktop, tablet, and mobile viewports with a maximum display duration of 1.5 seconds.

#### Scenario: Desktop viewports scale announcements cleanly without crosshair obstruction
- **WHEN** a major announcement displays on a desktop viewport
- **THEN** `#msg` renders at `top: 15%` with font size bounded between 20px and 24px, remaining entirely clear of the crosshair reticle.

#### Scenario: Mobile and compact viewports scale text down proportionally
- **WHEN** a major announcement displays on a touch/mobile viewport
- **THEN** `#msg` scales down smoothly to 16px to prevent viewport edge overflow or clutter.

#### Scenario: Rapid announcement transition clears within 1.5 seconds
- **WHEN** a major announcement displays
- **THEN** its active duration timer does not exceed 1.5 seconds before smoothly fading out.

### Requirement: Evident Surface Collapse Hazard Indication
The system SHALL provide non-occluding surface collapse hazard warning feedback upon the player entering the void recovery zone (`y < 0 && y > -3.5`), combining a pulsing peripheral screen-edge hazard vignette, a warning synthesizer audio cue, and a low-profile dock-adjacent warning badge without obscuring the central combat reticle or arena navigation view.

#### Scenario: Entering recovery zone triggers peripheral hazard vignette and audio alert
- **WHEN** the player drops below arena floor level into the recovery zone (`y < 0 && y > -3.5`) with downward or zero vertical velocity
- **THEN** an amber screen-edge hazard vignette pulses and a procedural warning audio alert sounds, alerting the player of void proximity without blocking center-screen vision.

#### Scenario: Dock-adjacent status indicates recovery jump or dash without center screen obstruction
- **WHEN** the player is inside the recovery zone
- **THEN** a low-profile warning status displays adjacent to the bottom under-rail dock, leaving the center field of view clear for platform navigation.

#### Scenario: Leaving recovery zone clears hazard indicators immediately
- **WHEN** the player executes a recovery jump/dash back onto a solid floor or falls below the recovery threshold
- **THEN** the peripheral amber vignette and dock-adjacent hazard alert fade and clear immediately.

### Requirement: Top-Left Non-Overlapping Tactical XP Log
The system SHALL render combat maneuver XP notifications inside a dedicated top-left HUD container (`#tl`) laid out as a vertically stacked CSS Flexbox column with explicit spacing (`gap`) and bounded visible capacity (maximum 4 entries), automatically fading and removing entries after a 2.0-second display window so rapid consecutive maneuvers never overlap.

#### Scenario: Stacking rapid consecutive maneuver XP entries without overlap
- **WHEN** two or more combat maneuvers (such as a parry followed immediately by a multi-ricochet strike or curve fracture) occur within fractions of a second
- **THEN** each entry renders as a separate stacked row inside `#tl` separated by non-zero flex gap with zero overlapping text, rather than spawning center-screen floating `+Credits` badges.

#### Scenario: Bounding maximum visible entries in the tactical XP log
- **WHEN** a rapid combo generates more than 4 active maneuver XP entries simultaneously
- **THEN** the oldest entry is collapsed and pruned so the log remains compact in the top-left corner without encroaching on the central reticle.

#### Scenario: Auto-expiring tactical XP entries
- **WHEN** a tactical XP entry has been displayed for 2.0 seconds
- **THEN** the entry fades out cleanly and removes itself from `#tl`, returning `#tl` to an unobtrusive state when idle.
