# Player Character Specification

## Purpose

Defines player locomotion, acrobatic aerial mobility, directional dashing, energy management, and holographic shield parry defense.

## Requirements

### Requirement: Ground Locomotion and Directional Dash
The system SHALL provide responsive ground movement and an instantaneous directional dash that consumes a fixed percentage of the energy meter.

#### Scenario: Directional dash execution
- **WHEN** the player activates the dash input while having at least 25% energy
- **THEN** the character receives an immediate velocity burst in their movement direction and 25% energy is consumed.

#### Scenario: Insufficient dash energy
- **WHEN** the player activates the dash input with less than 25% energy
- **THEN** no dash burst occurs and the energy meter remains unchanged.

### Requirement: Aerial Mobility and Jump Buffering
The system SHALL support variable jump height, in-flight double jumping, coyote time forgiveness, and jump input buffering.

#### Scenario: Mid-air double jump
- **WHEN** the player triggers jump while airborne following an initial jump
- **THEN** a second jump is executed resetting vertical velocity upward.

#### Scenario: Ledge coyote time
- **WHEN** the player steps off a solid edge and triggers jump within the coyote grace period
- **THEN** the jump is accepted and executed as if grounded.

### Requirement: Holographic Shield Deflection
The system SHALL trigger an active parry window (0.35s) upon shield input, deflecting incoming hostile projectiles striking frontally during the window, accelerating their velocity, transferring ownership to the defender, and enforcing a mandatory recovery cooldown (1.0s) upon window expiration or successful deflection during which the shield cannot be raised.

#### Scenario: Frontal parry deflection
- **WHEN** an incoming hostile disc strikes the player frontally while the active parry window is active
- **THEN** the disc is deflected back toward the attacker at accelerated velocity (1.25x), projectile ownership transfers to the player, its color turns white, and the shield enters recovery cooldown immediately.

#### Scenario: Shield input during recovery cooldown is ignored
- **WHEN** the player activates the shield input while the recovery cooldown is active
- **THEN** no parry window is triggered, the shield is not raised, and the player remains vulnerable.

#### Scenario: Expired parry window without contact incurs full recovery cooldown
- **WHEN** the player activates the shield input and no hostile projectile strikes within the 0.35s parry window
- **THEN** the parry window closes and the shield enters the 1.0s recovery cooldown.

#### Scenario: Sustained shield input does not prolong active parry window
- **WHEN** the player holds the shield input continuously beyond 0.35s
- **THEN** the shield does not remain raised, the active window closes at 0.35s, and the recovery cooldown is initiated.

### Requirement: Health and Energy Regeneration
The system SHALL maintain player health and energy pools, regenerating energy automatically while health loss past zero causes de-rez elimination.

#### Scenario: Energy auto-regeneration
- **WHEN** player energy is depleted below 100%
- **THEN** energy steadily regenerates toward full capacity over time.

#### Scenario: Lethal damage elimination
- **WHEN** incoming damage reduces player health to zero or below
- **THEN** the player is de-rezzed and the elimination flow is initiated.

### Requirement: Combat Viewport Stability and Aim Alignment
The system SHALL maintain a glitch-free, 1:1 responsive third-person combat camera that eliminates gimbal lock flips, boundary collision inversion, and pointer lock delta spikes while clamping rapid mouse swipes to preserve continuous aim orientation.

#### Scenario: Rapid rotational flick
- **WHEN** the player rapidly rotates their view by 90 or 180 degrees
- **THEN** the camera rotational orientation matches player aim instantly without swinging through a distorted arc or flipping 180 degrees.

#### Scenario: Backwards dash and close-range combat maneuvering
- **WHEN** the player dashes backwards or maneuvers rapidly towards the trailing camera
- **THEN** the camera maintains a positive separation distance from the focal aim plane and does not pass through or invert view direction.

#### Scenario: Arena boundary pushback
- **WHEN** the player maneuvers near arena perimeter boundaries with the camera facing toward or away from the boundary wall
- **THEN** the camera smoothly pulls inward without clipping outside bounds, getting stuck between player and aim point, or flipping view direction.

#### Scenario: Pointer lock delta spike rejection
- **WHEN** the browser reports an anomalous synthetic mouse movement delta exceeding safe input thresholds
- **THEN** the system clamps anomalous delta frames to the maximum threshold rather than dropping user input, preventing unnatural camera snapping while preserving fluid aiming.

#### Scenario: Unadjusted raw input negotiation
- **WHEN** desktop pointer lock is initiated on a supporting browser platform
- **THEN** the system requests unadjusted raw mouse movement data, falling back to standard pointer lock if unadjusted movement is unsupported.

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
