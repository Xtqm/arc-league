# Spec Delta: touch-input

## MODIFIED Requirements

### Requirement: Throw Button Hold Aim-Drag Steering
The system SHALL track the active touch identifier on `#btnThrow`, gate thumb movement by radial deadzones and directional deflection angles to distinguish between camera aim-drag and curve shaping, scale curve magnitude continuously between `0.0` and `1.0` upon horizontal drag, and release the disc with the dialed charge and curve trajectory.

#### Scenario: Aim-dragging while holding the Throw button steers the reticle
- **WHEN** a player presses and holds `#btnThrow` and drags their thumb vertically or within the central deadzone (< 10px) while charging
- **THEN** charging progresses continuously, camera yaw and pitch rotate smoothly to follow the drag, and releasing launches the charged disc along the aim vector with zero residual throw-drag inertia.

#### Scenario: Quick tap on Throw executes an uncharged throw without accidental aim jitter
- **WHEN** a player taps `#btnThrow` and releases within the tap-slop threshold (< 10px)
- **THEN** the disc throws cleanly along a straight trajectory with zero unintended camera rotation shift or curve bias.

#### Scenario: Secondary finger touches do not prematurely release an active Throw hold
- **WHEN** the player holds `#btnThrow` with one finger while another finger presses or releases Jump, Dash, or the movement joystick
- **THEN** `#btnThrow` continues charging and tracking its own touch identifier until that matching touch ends or cancels.

#### Scenario: Horizontal drag shapes variable curve
- **WHEN** a player holds `#btnThrow` and drags their thumb outward to the left or right past the 15px threshold
- **THEN** disc curve direction matches the swipe direction, curve magnitude scales continuously up to 1.0 at maximum swipe distance (~75px), and returning to center deadzone resets curve to neutral.

### Requirement: Touch Action Button Dispatch and Lifecycle Reset
The system SHALL map touch action buttons (`#btnJump`, `#btnDash`, `#btnBlock`) using `>= 44x44px` hit targets without dedicated curve buttons, and SHALL clear active touch identifiers, joystick state, held touch flags, curve swipe offsets, and look velocity whenever gameplay pauses, modals open, rounds reset, or matches conclude.

#### Scenario: Touch controls reset cleanly on pause and match transitions
- **WHEN** gameplay is paused, a round resets, or the player returns to the main menu while movement, block, jump, or look touches are active
- **THEN** all active touch IDs reset to `null`, joystick deflection returns to zero, held jump/block states clear, touch curve values reset to neutral, and residual camera velocity is zeroed.
