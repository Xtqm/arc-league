# Spec Delta: Combat HUD

## ADDED Requirements

### Requirement: Device-Adaptive Contextual Input Prompts
The system SHALL dynamically render HUD action prompts using the active input device's glyphs, switching between Keyboard/Mouse labels (`[LMB]`, `[RMB]`, `[Q/E]`), Gamepad button labels (`[RT]`, `[LT]`, `[LB/RB]`), and Touch button labels (`[THROW]`, `[SHIELD]`, `[L/R]`).

#### Scenario: Displaying KBM prompts when using mouse and keyboard
- **WHEN** the player's last input was registered from keyboard or mouse
- **THEN** contextual instructional prompts render keyboard and mouse button indicators.

#### Scenario: Displaying Gamepad prompts when using a controller
- **WHEN** the player's last input was registered from a connected gamepad
- **THEN** contextual instructional prompts render controller trigger and bumper indicators.

#### Scenario: Displaying Mobile touch prompts on touch devices
- **WHEN** the game runs on a touch-enabled mobile platform
- **THEN** contextual instructional prompts render touch button action names.

### Requirement: Mobile Perspective HUD Toggle Control
The system SHALL display a compact perspective toggle button on mobile viewports allowing touch players to switch between First-Person and Third-Person camera perspectives.

#### Scenario: Tapping mobile perspective toggle button
- **WHEN** a touch player taps the perspective toggle button in the top HUD
- **THEN** the camera switches between First-Person and Third-Person viewports and the button icon updates to indicate the active state.
