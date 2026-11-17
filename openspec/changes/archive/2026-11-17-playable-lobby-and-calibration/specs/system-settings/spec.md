# Spec Delta: System Settings

## ADDED Requirements

### Requirement: Centralized Mouse Look Sensitivity Configuration
The system SHALL expose a numeric look sensitivity slider in System Settings for mouse aiming, persisting the value in local storage and suppressing all runtime mouse wheel sensitivity alterations during gameplay.

#### Scenario: Adjusting mouse sensitivity in settings
- **WHEN** the player adjusts the Mouse Look Sensitivity slider in System Settings
- **THEN** the value persists to storage and applies immediately to pointer lock mouse aim deltas.

#### Scenario: Mouse wheel during combat does not alter sensitivity
- **WHEN** the player scrolls the mouse wheel while pointer locked in active gameplay
- **THEN** the look sensitivity remains unchanged.

### Requirement: Lobby Core Confirmation and Perspective Preferences
The system SHALL provide configuration options in System Settings for Energy Core Launch Confirmation (`coreLaunchConfirmation`, defaulting to true) and Default Camera Perspective (`defaultCameraPerspective`, defaulting to `third_person`).

#### Scenario: Toggling core launch confirmation preference
- **WHEN** the player toggles the Energy Core Confirmation setting
- **THEN** the preference is persisted and immediately dictates whether lobby energy cores require confirmation before launching.

#### Scenario: Setting default camera perspective preference
- **WHEN** the player selects First-Person or Third-Person as the default camera perspective
- **THEN** subsequent match loads initialize the camera in the preferred perspective.
