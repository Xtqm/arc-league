# System Settings Specification

## Purpose

Provides user-configurable display modes, frame rate limits, audio volumes, and graphics fidelity options with persistent settings storage for Tron Disc Arena.

## Requirements

### Requirement: In-Game Settings Modal Interface
The system SHALL provide an interactive settings interface accessible from the Main Menu via the Terminal's `SYSTEM CONFIG` tab and from the in-game Pause Menu to configure display, graphics, and audio preferences, with no Settings button rendered on the Main Menu button stack.

#### Scenario: Opening settings modal
- **WHEN** the player activates the Settings button from the in-game pause screen
- **THEN** the standalone settings modal opens displaying controls for Display, Graphics, and Audio options with its return controls intact.

#### Scenario: Opening system configuration from the Terminal Hub
- **WHEN** the player opens the Terminal from the Main Menu identity header and selects the `SYSTEM CONFIG` tab
- **THEN** the Terminal embeds the Display, Performance, Visual Quality, and Audio settings controls directly inside the Terminal view without internal standalone close buttons.

#### Scenario: Main menu consistency across cold boot and menu return
- **WHEN** the Main Menu renders on initial page load or after returning from any match or sub-menu
- **THEN** the Main Menu displays a consistent button stack without a `SYSTEM CONFIG` button on both initial boot and subsequent menu visits.

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
