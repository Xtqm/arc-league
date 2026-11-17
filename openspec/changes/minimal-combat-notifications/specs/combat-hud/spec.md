# Spec Delta

## ADDED Requirements

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
