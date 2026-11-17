# Touch Input Specification

## Purpose

Defines responsive mobile dual-thumb touch controls for Arc League, including floating left-zone movement joystick input, smoothed frame-rate-independent right-zone camera aiming with velocity inertia, throw-hold aim-drag steering, spike rejection, and reliable touch state cleanup.

## Requirements

### Requirement: Split-Screen Floating Movement Joystick and Look Zone
The system SHALL allocate touches starting in the left 45% of the viewport to a floating movement joystick normalized to `[-1, 1]` over a `52px` radius, allocate touches starting in the right 55% of the viewport to camera look rotation, and exclude modal `.card` containers and HUD buttons from gameplay touch capture.

#### Scenario: Multi-touch movement and camera aiming operate simultaneously
- **WHEN** the player holds a floating movement touch on the left side while dragging a separate camera look touch on the right side during active gameplay
- **THEN** the character moves continuously in the joystick direction while the camera rotates smoothly in response to the right-side drag without cancelling either touch identifier.

#### Scenario: Active modal cards block underlying touch controls
- **WHEN** a touch gesture originates inside a `.card` modal overlay
- **THEN** gameplay touch movement and camera rotation ignore the event so scrolling and button presses inside the modal function normally.

### Requirement: Smoothed Frame-Rate-Independent Touch Camera Aiming and Flick Inertia
The system SHALL convert active look drags into yaw and clamped pitch (`[-0.6, 0.55]` radians) rotation scaled by look and touch sensitivity with softened vertical pitch response, reject extreme single-event delta spikes, track timestamped EMA velocity during drags, cancel stale velocity when a finger pauses before lift, and integrate post-release inertia proportional to `dt` with exponential damping and tap-to-stop braking.

#### Scenario: Frame-rate-independent flick inertia glides smoothly after release
- **WHEN** a player performs a brisk right-zone swipe and releases their finger
- **THEN** post-release camera inertia decays smoothly over time using `dt`-scaled angular velocity integration, producing consistent total follow-through rotation across 60Hz and 120Hz frame rates rather than multi-revolution overshoot.

#### Scenario: Pausing briefly before lifting the finger suppresses stale inertia
- **WHEN** a player drags the camera touch, holds the finger stationary for longer than the staleness window (`~80ms`), and then lifts the finger
- **THEN** release velocity resets to zero so the camera stops immediately on lift without unexpected drift.

#### Scenario: Tapping the look zone cancels active camera drift immediately
- **WHEN** camera inertia drift is active and the player touches down anywhere in the right-side look zone
- **THEN** existing look velocity zeroes immediately and camera rotation halts until the new touch drags.

#### Scenario: Desktop pointer lock mode bypasses touch camera momentum
- **WHEN** the application is not running in touch mode
- **THEN** touch momentum integration produces zero camera movement and touch listeners do not interfere with desktop mouse look.

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
