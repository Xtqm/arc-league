# Spec Delta: desktop-shell

## MODIFIED Requirements

### Requirement: Browser Quirk and Shortcut Suppression
The system SHALL suppress browser context menus, accidental page reload hotkeys, and HTML asset drag-and-drop interactions to ensure uninterrupted desktop gameplay, and SHALL intercept the Escape key at root lobby in the desktop shell to present a native application exit confirmation prompt.

#### Scenario: Context menu suppression
- **WHEN** the player right-clicks inside the game window
- **THEN** the default browser context menu is suppressed and the input is routed exclusively to game combat mechanics.

#### Scenario: Reload shortcut suppression
- **WHEN** the player presses F5, Ctrl+R, or Ctrl+Shift+R
- **THEN** the window reload action is ignored and active match state is preserved.

#### Scenario: Pressing Escape at root lobby in desktop shell
- **WHEN** the player presses Escape while in the Holo-Deck lobby on the desktop application shell with no modal or drawer open
- **THEN** the application displays a confirmation prompt to exit to desktop, terminating the application if confirmed.

#### Scenario: Pressing Escape at root lobby in web browser
- **WHEN** the player presses Escape while in the Holo-Deck lobby in a web browser with no modal or drawer open
- **THEN** the Escape key is inert and does not open a pause menu or reload the page.
