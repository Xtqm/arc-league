# Spec Delta

## MODIFIED Requirements

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
