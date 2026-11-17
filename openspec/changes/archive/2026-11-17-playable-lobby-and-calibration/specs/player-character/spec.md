# Spec Delta: Player Character

## ADDED Requirements

### Requirement: Holographic Disc Materialization
The system SHALL animate a progressive holographic materialization of the Identity Disc into the athlete's hand during the universal 3-second match start countdown across all game modes.

#### Scenario: Pre-match countdown disc materialization
- **WHEN** a match countdown begins from 3.0 seconds
- **THEN** wireframe holographic geometry condenses into a glowing particle vortex at the athlete's palm, snapping solid with an audible transient at T-0.0s when simulation engages.

### Requirement: Dual Perspective Viewport Switching
The system SHALL support runtime switching between Third-Person over-the-shoulder perspective and First-Person visor perspective in all game modes, smoothly interpolating camera offsets and adjusting mesh clipping.

#### Scenario: Toggling perspective via Middle Mouse Button on PC
- **WHEN** the player clicks Middle Mouse Button (MMB) during gameplay or in the lobby
- **THEN** the camera smoothly lerps between Third-Person distance (9.0 units) and First-Person eye height (1.8 units) over 0.2 seconds.

#### Scenario: Toggling perspective via Gamepad
- **WHEN** a gamepad player presses Right Stick Click (R3)
- **THEN** the camera toggles between Third-Person and First-Person perspective.

#### Scenario: Toggling perspective on Mobile
- **WHEN** a mobile player taps the HUD perspective toggle button
- **THEN** the camera toggles between Third-Person and First-Person perspective.

#### Scenario: First-Person mesh visibility management
- **WHEN** the viewport transitions into First-Person perspective
- **THEN** the athlete character's head and torso geometry are hidden from the camera while the throwing arm and disc remain visible in the lower viewport.
