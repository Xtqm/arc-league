# Spec Delta: System Settings

## MODIFIED Requirements

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
