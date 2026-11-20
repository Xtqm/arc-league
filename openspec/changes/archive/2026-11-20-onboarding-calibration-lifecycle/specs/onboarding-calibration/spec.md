# Spec Delta

## MODIFIED Requirements

### Requirement: Fullscreen Cyberpunk Boot Terminal
The system SHALL present a fullscreen cyberpunk boot terminal on initial application load for uncalibrated players who have neither completed nor explicitly bypassed combat calibration, requiring a single user interaction to simultaneously acquire pointer lock, initialize Web Audio context, and transition directly into the calibration arena.

#### Scenario: First-time visitor interacts with boot terminal
- **WHEN** an uncalibrated player loads the game and clicks anywhere on the boot terminal
- **THEN** the system requests pointer lock, resumes the Web Audio context with an introductory sub-bass sweep, and drops the player into the calibration arena within 1.0 second.

#### Scenario: Returning calibrated player skips boot terminal
- **WHEN** a player with an established calibration completion or bypass flag in persistent storage loads the application
- **THEN** the system bypasses the boot terminal and loads directly into the Playable 3D Arena Lobby.

#### Scenario: Interrupted uncalibrated player re-encounters boot terminal
- **WHEN** a player closes or refreshes the application during an uncompleted calibration attempt without activating the explicit bypass escape hatch
- **THEN** the system presents the fullscreen boot terminal upon subsequent application launch.

### Requirement: Calibration Bypass Escape Hatch
The system SHALL display an unobtrusive bypass action (`[ESC / START] BYPASS TO LOBBY`) throughout the calibration sequence, allowing players to skip directly to the Playable 3D Lobby at any point while permanently persisting the bypass decision to prevent future boot interruptions.

#### Scenario: Bypassing calibration via escape key or gamepad start
- **WHEN** the player presses ESC, Gamepad Start, or taps the mobile bypass button during calibration
- **THEN** the calibration session terminates cleanly, the system sets `calibration_bypassed: true` in persistent storage, and the player immediately transitions to the Playable 3D Arena Lobby.

## ADDED Requirements

### Requirement: On-Demand Combat Calibration Stage
The system SHALL support launching the 3-beat combat calibration gauntlet on-demand from the Circuit League campaign interface regardless of whether the player previously bypassed or completed the boot tutorial.

#### Scenario: Initiating calibration from Circuit League menu
- **WHEN** a player selects Grid 01 Stage 1 (`level_01_01`, "Boot Diagnostic") in the Circuit League and launches the trial
- **THEN** the system initializes the three-beat calibration arena starting at Beat 1 with full instructional prompts and bypass controls.

#### Scenario: Earning progression rewards from on-demand calibration
- **WHEN** a player who previously bypassed initial calibration completes Beat 3 via the Circuit League stage
- **THEN** the system sets `calibration_completed: true`, awards 100 Arc Bits, grants Grid 01 Star 1 in campaign storage, and returns the player to the lobby.
