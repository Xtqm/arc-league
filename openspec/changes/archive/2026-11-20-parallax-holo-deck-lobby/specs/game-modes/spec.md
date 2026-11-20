# Spec Delta: game-modes

## MODIFIED Requirements

### Requirement: Interactive Playable Arena Lobby
The system SHALL operate a persistent 3D Parallax Holo-Deck lobby environment upon main menu activation, anchoring the player in a stationary first-person perspective with unlocked mouse parallax camera damping, while rendering an interactive holographic arc of Energy Cores for League Circuit, Survival, Online Duels, Armory Outfitting, and System Settings.

#### Scenario: Entering the playable arena lobby
- **WHEN** the player launches the application after initial calibration or returns to the menu from an active match
- **THEN** the camera anchors at the central Holo-Deck terminal in first-person view, pointer lock is disengaged, and the mouse cursor is free to navigate both DOM controls and 3D holographic cores.

#### Scenario: Striking an Energy Core with a kinetic disc
- **WHEN** a player clicks or taps on an Energy Core in the Holo-Deck lobby
- **THEN** the system launches an Identity Disc projectile from off-screen into the targeted core, locks further canvas click input during flight, and shatters the core into glowing neon voxel particles on impact.

#### Scenario: Direct pointer interaction with Energy Cores
- **WHEN** a player hovers or clicks directly on an Energy Core or its floating nameplate without locking the pointer
- **THEN** the system triggers the kinetic disc throw sequence toward the targeted core.

#### Scenario: Mouse parallax camera movement
- **WHEN** the player moves the mouse cursor across the Holo-Deck lobby screen
- **THEN** the camera smoothly parallaxes with exponentially damped tilt up to 8 degrees yaw and 5 degrees pitch without locking the pointer or triggering mouse look warps.

#### Scenario: Suppressing 3D raycasting behind UI headers
- **WHEN** the player clicks or hovers on the top identity header, settings gear icon, or an active modal overlay
- **THEN** 3D core raycasting is suppressed and the underlying Energy Core is not targeted or activated.

#### Scenario: Disabling locomotion inputs in the lobby
- **WHEN** the player presses locomotion keys (W, A, S, D, Arrow keys, Spacebar) while in the Holo-Deck lobby
- **THEN** locomotion movement is ignored and the player remains anchored at the Holo-Deck terminal.

### Requirement: Energy Core Launch Confirmation
The system SHALL present a holographic launch confirmation drawer when an Energy Core is activated if `coreLaunchConfirmation` is enabled, initiating immediate mode transition when `coreLaunchConfirmation` is disabled, and cinematically re-assembling the shattered Energy Core whenever launch is canceled or dismissed.

#### Scenario: Launching mode with confirmation modal enabled
- **WHEN** an Energy Core is shattered by a kinetic disc while `coreLaunchConfirmation` is enabled in system settings
- **THEN** the mode drawer slides onto the screen displaying game mode details, confirm action, and cancel action, while releasing input debounce locks.

#### Scenario: Launching mode with confirmation modal disabled
- **WHEN** an Energy Core is shattered by a kinetic disc while `coreLaunchConfirmation` is disabled in system settings
- **THEN** the system skips the confirmation drawer and immediately initiates the 3-second match countdown for the selected mode.

#### Scenario: Canceling or dismissing mode launch
- **WHEN** the player clicks Cancel or presses Escape while the mode confirmation drawer is displayed
- **THEN** the drawer dismisses, a reverse-particle glitch re-assembly effect restores the shattered Energy Core to pristine condition, and lobby interaction resets to idle.

#### Scenario: Debouncing rapid click input during launch flight
- **WHEN** the player rapidly clicks multiple times or targets another core while a disc projectile is in flight
- **THEN** secondary clicks are ignored until the current throw resolves into a drawer opening or match transition.
