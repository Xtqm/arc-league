# System Settings Specification

## Purpose

Provides user-configurable display modes, frame rate limits, audio volumes, and graphics fidelity options with persistent settings storage for Tron Disc Arena.

## Requirements

### Requirement: In-Game Settings Modal Interface
The system SHALL provide an interactive settings interface accessible directly from the Main Menu header via a dedicated gear icon button, through the Tactical Rail settings dock button, via the Terminal SYSTEM CONFIG tab, and from the in-game Pause Menu during active matches.

#### Scenario: Opening settings modal
- **WHEN** the player activates the Settings button from the in-game pause screen, clicks the gear icon button in the top identity header, or activates the settings button on the tactical rail dock
- **THEN** the standalone settings modal opens displaying controls for Display, Graphics, Audio, and Input options with its return controls intact.

#### Scenario: Opening settings modal via 3D Holo-Deck Settings Core
- **WHEN** the 3D Holo-Deck lobby cores are decommissioned in favor of the Tactical Rail
- **THEN** settings activation is routed through the tactical rail settings button instead of kinetic disc strikes on 3D meshes.

#### Scenario: Opening system configuration from the Terminal Hub
- **WHEN** the player opens the Terminal from the Main Menu identity header and selects the SYSTEM CONFIG tab
- **THEN** the Terminal embeds the Display, Performance, Visual Quality, and Audio settings controls directly inside the Terminal view without internal standalone close buttons.

#### Scenario: Main menu consistency across cold boot and menu return
- **WHEN** the Main Menu renders on initial page load or after returning from any match or sub-menu
- **THEN** the Main Menu displays a consistent header with persistent gear icon and identity controls on both initial boot and subsequent menu visits.

### Requirement: Display Mode and Resolution Control
The system SHALL allow players to configure display modes between borderless fullscreen and windowed mode with automatic viewport scaling.

#### Scenario: Toggling window mode
- **WHEN** the player toggles display mode between Fullscreen and Windowed
- **THEN** the application window updates its display state and recalculates camera aspect ratio and renderer viewport.

### Requirement: Frame Rate Limiter Configuration
The system SHALL provide frame rate limit options including 60 FPS, 120 FPS, 144 FPS, and Uncapped targets.

#### Scenario: Applying frame rate limit
- **WHEN** the player selects a target frame rate cap
- **THEN** the game render loop throttles frame presentation to respect the selected cap.

### Requirement: Audio Volume Configuration
The system SHALL provide volume sliders for Master Volume and SFX Volume that dynamically adjust procedural synthesizer audio output gains between 0% and 100%.

#### Scenario: Adjusting SFX volume slider
- **WHEN** the player adjusts the SFX volume slider
- **THEN** procedural synthesizer sound effect gain nodes scale their amplitude proportionally.

### Requirement: Persistent Settings Storage
The system SHALL persist user-selected settings across sessions and apply stored preferences automatically upon application startup.

#### Scenario: Settings persistence across relaunch
- **WHEN** settings are modified and the application is restarted
- **THEN** the saved configuration is loaded and applied during engine initialization.

### Requirement: Graphics Fidelity Toggles Runtime Enforcement
The system SHALL apply `bloom` and `particles` graphics settings immediately upon toggle and startup initialization to enable or disable HDR post-processing bloom and continuous projectile/locomotion ribbon trails.

#### Scenario: Toggling HDR bloom preference at runtime
- **WHEN** the player toggles the `NEON GLOW / BLOOM` option in the settings modal
- **THEN** the live renderer enables or disables the HDR bloom pass immediately on subsequent frames and persists the preference.

#### Scenario: Toggling particle and ribbon effects preference
- **WHEN** the player disables `particles` in settings
- **THEN** continuous disc ribbon trails, hover-dash streaks, and impact bursts cease spawning while existing effects clean up cleanly.

### Requirement: Touch Camera and Aim Preferences
The system SHALL expose controls in the System Settings interface (both Pause Modal and Terminal `SYSTEM CONFIG`) to adjust touch camera sensitivity (`touchSensitivity`, `0.5x`–`2.0x`), select touch camera inertia behavior (`touchInertia`: `SMOOTH`, `LIGHT`, or `OFF`), and toggle vertical Y-axis inversion (`invertY`), persisting selections across sessions and applying them immediately to touch camera look.

#### Scenario: Adjusting touch aim sensitivity
- **WHEN** the player changes the Touch Aim Sensitivity slider in System Settings
- **THEN** the engine persists `touchSensitivity` and scales active touch drag and inertia rotation speeds proportionally on subsequent frames.

#### Scenario: Switching touch camera inertia preset
- **WHEN** the player selects `SMOOTH`, `LIGHT`, or `OFF` for Touch Camera Inertia
- **THEN** `OFF` disables post-release camera glide (pure 1:1 direct touch aiming), `LIGHT` applies fast exponential braking, and `SMOOTH` applies balanced glide decay, with the selection persisted across reloads.

#### Scenario: Toggling Y-axis inversion
- **WHEN** the player toggles Invert Y-Axis in System Settings
- **THEN** `state.invertY` updates immediately and vertical touch look reverses sign while remaining persisted across sessions.

### Requirement: Render Resolution Scaling Configuration
The system SHALL provide a user-configurable 3D render resolution scaling slider (ranging from 50% to 100%) that scales the WebGL 3D canvas drawing buffer dimensions while preserving native display resolution for 2D HUD and user interface elements.

#### Scenario: Adjusting render scale slider
- **WHEN** the player adjusts the render scale slider to 75% in the settings interface
- **THEN** the WebGL canvas drawing buffer resizes to 75% of the viewport dimensions with bicubic display scaling, while HUD elements retain native device pixel resolution.

#### Scenario: Persistent render scale restoration
- **WHEN** the player relaunches the game with a saved render scale value
- **THEN** the engine applies the stored render scale immediately upon graphics initialization.

### Requirement: Graphics Quality Presets Configuration
The system SHALL provide one-click graphics quality presets (Competitive, Low, Medium, High, Ultra) that batch-configure shadow map resolution, bloom quality, particle budget, render resolution scaling, and frame rate caps, defaulting High and Ultra presets to uncapped frame rate (`fpsCap: 0`) to match native high-refresh displays.

#### Scenario: Selecting competitive preset
- **WHEN** the player selects the Competitive preset
- **THEN** shadows are disabled or reduced to 512, bloom is disabled or set to half-resolution, and frame rate cap is uncapped.

#### Scenario: Selecting ultra preset
- **WHEN** the player selects the Ultra preset
- **THEN** shadows are set to 1024 or higher, bloom is set to full HDR resolution, particles are enabled at 100%, render scale is set to 100%, and frame rate cap is set to uncapped (`fpsCap: 0`).

#### Scenario: Selecting high preset
- **WHEN** the player selects the High preset
- **THEN** shadows are set to 1024, bloom is set to full HDR resolution, particles are enabled at 100%, render scale is set to 100%, and frame rate cap defaults to uncapped (`fpsCap: 0`) for smooth display refresh synchronization.

### Requirement: Centralized Mouse Look Sensitivity Configuration
The system SHALL expose a numeric look sensitivity slider in System Settings for mouse aiming, persisting the value in local storage and suppressing all runtime mouse wheel sensitivity alterations during gameplay.

#### Scenario: Adjusting mouse sensitivity in settings
- **WHEN** the player adjusts the Mouse Look Sensitivity slider in System Settings
- **THEN** the value persists to storage and applies immediately to pointer lock mouse aim deltas.

#### Scenario: Mouse wheel during combat does not alter sensitivity
- **WHEN** the player scrolls the mouse wheel while pointer locked in active gameplay
- **THEN** the look sensitivity remains unchanged.

### Requirement: Lobby Core Confirmation and Perspective Preferences
The system SHALL provide configuration options in System Settings for Menu Parallax Motion (`menuParallax`, defaulting to true) and Default Match Camera Perspective (`defaultCameraPerspective`, defaulting to `third_person`).

#### Scenario: Toggling core launch confirmation preference
- **WHEN** the player accesses system settings with 3D lobby cores decommissioned
- **THEN** core launch confirmation options are deprecated from the settings interface in favor of instant tactical rail button execution.

#### Scenario: Setting default camera perspective preference
- **WHEN** the player selects First-Person or Third-Person as the default camera perspective
- **THEN** subsequent match loads initialize the camera in the preferred perspective.

#### Scenario: Toggling menu parallax motion preference
- **WHEN** the player toggles Menu Parallax to disabled in System Settings
- **THEN** camera parallax in the background staging scene is suspended and the camera remains fixed at center view.
