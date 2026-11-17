# Onboarding Calibration Specification

## Purpose

Provides a zero-delay interactive boot sequence, a continuous three-beat combat calibration gauntlet, friend-invite bypass, and automatic progression crediting for new athletes entering the Arcfield.

## Requirements

### Requirement: Fullscreen Cyberpunk Boot Terminal
The system SHALL present a fullscreen cyberpunk boot terminal on initial application load for uncalibrated players, requiring a single user interaction to simultaneously acquire pointer lock, initialize Web Audio context, and transition directly into the calibration arena.

#### Scenario: First-time visitor interacts with boot terminal
- **WHEN** an uncalibrated player loads the game and clicks anywhere on the boot terminal
- **THEN** the system requests pointer lock, resumes the Web Audio context with an introductory sub-bass sweep, and drops the player into the calibration arena within 1.0 second.

#### Scenario: Returning calibrated player skips boot terminal
- **WHEN** a player with an established calibration flag in persistent storage loads the application
- **THEN** the system bypasses the boot terminal and loads directly into the Playable 3D Arena Lobby.

### Requirement: Continuous Three-Beat Calibration Gauntlet
The system SHALL execute a continuous, uninterrupted three-beat combat sequence in the calibration arena that sequentially teaches disc throwing, slow-motion parry deflection, and curve/ricochet targeting without intervening menus or loading screens.

#### Scenario: Beat 1 - Kinetic Strike instruction
- **WHEN** the calibration arena loads
- **THEN** an Identity Disc materializes in the athlete's hand, a stationary holographic drone appears 15 meters ahead, and the HUD prompts the player to strike the target.

#### Scenario: Beat 2 - Slow-motion parry deflection
- **WHEN** Beat 1 is completed by destroying the first target
- **THEN** a second drone spawns, fires an incoming kinetic volley toward the player, the simulation time scale drops to 0.25x upon projectile proximity, and the HUD prompts an active shield parry deflection.

#### Scenario: Beat 3 - Curve and ricochet navigation
- **WHEN** the incoming volley is successfully parried in Beat 2
- **THEN** a final drone deploys behind an energy pillar, the dotted aim trajectory displays the ricochet bounce path, and the HUD prompts applying curve spin or wall deflection to eliminate the target.

### Requirement: Calibration Bypass Escape Hatch
The system SHALL display an unobtrusive bypass action (`[ESC / START] BYPASS TO LOBBY`) throughout the calibration sequence, allowing players to skip directly to the Playable 3D Lobby at any point.

#### Scenario: Bypassing calibration via escape key or gamepad start
- **WHEN** the player presses ESC, Gamepad Start, or taps the mobile bypass button during calibration
- **THEN** the calibration session terminates cleanly and the player immediately transitions to the Playable 3D Arena Lobby.

### Requirement: Calibration Completion Progression Award
The system SHALL award Grid 01 Star 1 in campaign progression, credit 100 Arc Bits to the player's balance, set the persistent calibration completion flag, and transition to the Playable 3D Lobby upon Beat 3 completion.

#### Scenario: Successfully finishing all three calibration beats
- **WHEN** the final drone is destroyed in Beat 3 of the calibration gauntlet
- **THEN** the system marks Grid 01 Trial 1 as cleared with 1 Star, credits 100 Bits to persistent storage, records calibration as complete, and transitions the athlete into the Playable 3D Lobby.
