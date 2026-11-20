# Spec Delta: system-settings

## MODIFIED Requirements

### Requirement: In-Game Settings Modal Interface
The system SHALL provide an interactive settings interface accessible directly from the Main Menu header via a dedicated gear icon button, through the 3D Holo-Deck SETTINGS Energy Core, via the Terminal SYSTEM CONFIG tab, and from the in-game Pause Menu during active matches.

#### Scenario: Opening settings modal
- **WHEN** the player activates the Settings button from the in-game pause screen or clicks the gear icon button in the top identity header
- **THEN** the standalone settings modal opens displaying controls for Display, Graphics, Audio, and Input options with its return controls intact.

#### Scenario: Opening settings modal via 3D Holo-Deck Settings Core
- **WHEN** the player clicks the holographic SETTINGS Core in the Holo-Deck lobby
- **THEN** the kinetic disc strikes the Settings Core, shattering it into neon pixels, and the settings modal opens with its full control suite.

#### Scenario: Opening system configuration from the Terminal Hub
- **WHEN** the player opens the Terminal from the Main Menu identity header and selects the SYSTEM CONFIG tab
- **THEN** the Terminal embeds the Display, Performance, Visual Quality, and Audio settings controls directly inside the Terminal view without internal standalone close buttons.

#### Scenario: Main menu consistency across cold boot and menu return
- **WHEN** the Main Menu renders on initial page load or after returning from any match or sub-menu
- **THEN** the Main Menu displays a consistent header with persistent gear icon and identity controls on both initial boot and subsequent menu visits.

### Requirement: Lobby Core Confirmation and Perspective Preferences
The system SHALL provide configuration options in System Settings for Energy Core Launch Confirmation (`coreLaunchConfirmation`, defaulting to true), Menu Parallax Motion (`menuParallax`, defaulting to true), and Default Match Camera Perspective (`defaultCameraPerspective`, defaulting to `third_person`), while locking the Holo-Deck lobby strictly to first-person view.

#### Scenario: Toggling core launch confirmation preference
- **WHEN** the player toggles the Energy Core Confirmation setting
- **THEN** the preference is persisted in storage and immediately dictates whether lobby energy cores require confirmation before launching.

#### Scenario: Setting default camera perspective preference
- **WHEN** the player selects First-Person or Third-Person as the default camera perspective
- **THEN** subsequent match loads initialize the camera in the preferred perspective while the Holo-Deck lobby remains strictly in first-person view.

#### Scenario: Toggling menu parallax motion preference
- **WHEN** the player toggles Menu Parallax to disabled in System Settings
- **THEN** camera parallax in the Holo-Deck lobby is suspended and the camera remains fixed at center view.
