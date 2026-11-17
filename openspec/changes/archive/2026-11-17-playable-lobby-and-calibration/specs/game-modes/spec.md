# Spec Delta: Game Modes

## ADDED Requirements

### Requirement: Interactive Playable Arena Lobby
The system SHALL operate a persistent 3D arena lobby environment upon main menu activation, allowing player locomotion and disc combat while rendering interactive holographic Energy Cores for League Circuit, Survival, Online Duels, and Armory Outfitting.

#### Scenario: Entering the playable arena lobby
- **WHEN** the player launches the application after initial calibration or returns to the menu from an active match
- **THEN** the athlete rig spawns in the 3D lobby arena with full locomotion, camera control, and disc throwing enabled, surrounded by floating Energy Cores.

#### Scenario: Striking an Energy Core with a kinetic disc
- **WHEN** a player throws their Identity Disc and it impacts an Energy Core in the lobby
- **THEN** the impacted Energy Core flashes an activation effect and initiates the corresponding mode launch workflow.

#### Scenario: Direct pointer interaction with Energy Cores
- **WHEN** a player clicks or taps on an Energy Core or its floating nameplate in the lobby
- **THEN** the system initiates the mode launch workflow for the selected core.

### Requirement: Energy Core Launch Confirmation
The system SHALL present a holographic launch confirmation dialog when an Energy Core is activated if `coreLaunchConfirmation` is enabled, and SHALL initiate immediate mode transition when `coreLaunchConfirmation` is disabled.

#### Scenario: Launching mode with confirmation modal enabled
- **WHEN** an Energy Core is activated while `coreLaunchConfirmation` is enabled in system settings
- **THEN** a holographic confirmation dialog appears over the core prompting the player to confirm or cancel the launch.

#### Scenario: Launching mode with confirmation modal disabled
- **WHEN** an Energy Core is activated while `coreLaunchConfirmation` is disabled in system settings
- **THEN** the system skips the confirmation dialog and immediately initiates the 3-second match countdown for the selected mode.
