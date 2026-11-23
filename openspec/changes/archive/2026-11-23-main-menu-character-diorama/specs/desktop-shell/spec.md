# Spec Delta

## MODIFIED Requirements

### Requirement: Window Mode and Fullscreen Toggle
The system SHALL support borderless fullscreen execution, provide hotkeys to toggle display modes, and manage Escape key interactions such that pressing Escape during an active fullscreen match releases pointer lock and triggers the pause menu without exiting fullscreen, while pressing Escape when the cursor is already released exits fullscreen.

#### Scenario: Fullscreen hotkey toggle
- **WHEN** the player presses `Alt+Enter` or `F11`
- **THEN** the application window toggles between borderless fullscreen and windowed mode while maintaining viewport scaling.

#### Scenario: First Escape press in fullscreen combat releases cursor
- **WHEN** the player presses Escape while in an active match with pointer lock engaged in fullscreen mode
- **THEN** pointer lock is released, the pause menu opens, and the display remains in fullscreen mode.

#### Scenario: Second Escape press exits fullscreen
- **WHEN** the player presses Escape while the game is already in a paused or unlocked state in fullscreen mode
- **THEN** the application exits fullscreen mode cleanly.
