# Desktop Shell Specification

## Purpose

Provides a standalone desktop application shell using Electron, managing native windowing, display modes, browser quirk suppression, and application lifecycle for Tron Disc Arena.

## Requirements

### Requirement: Native Desktop Window Initialization
The system SHALL launch the game within a dedicated Electron native desktop window with hardware acceleration enabled, dedicated high-performance GPU switches enforced, default application menus hidden, window title set to "ARC LEAGUE", and native window icon set to the official Arc League brand icon.

#### Scenario: Application startup
- **WHEN** the desktop application executable is launched
- **THEN** an Electron window opens, loads the local game client, and renders the 3D canvas with window title "ARC LEAGUE" and official application window icon without browser navigation bars or dev tools.

#### Scenario: Dedicated GPU enforcement on dual-GPU laptops
- **WHEN** the desktop shell initializes on a multi-GPU host system
- **THEN** command-line switches (`force_high_performance_gpu`) instruct the underlying Chromium engine to bind rendering to dedicated discrete graphics hardware.

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

### Requirement: Application Lifecycle and Focus Management
The system SHALL manage native lifecycle events, ensuring clean process termination on close and audio muting when the application window is blurred or minimized.

#### Scenario: Window close event
- **WHEN** the player closes the window via `Alt+F4` or the window close button
- **THEN** the application terminates all client processes gracefully.

#### Scenario: Window blur event
- **WHEN** the game window loses focus or is minimized
- **THEN** procedural synthesizer audio output is suspended until the window regains focus.

### Requirement: Executable Packaging Configuration
The system SHALL provide packaging configurations via electron-builder targeting the canonical `arc-league` GitHub repository with official Arc League brand icons (`desktop/icon.ico` and `desktop/icon.png`) to generate branded standalone desktop executables and update manifests for Windows, Linux, and macOS platforms.

#### Scenario: Distribution packaging build
- **WHEN** the developer executes `npm run desktop:build` on a target OS
- **THEN** a standalone executable distribution package (NSIS and portable for Windows, AppImage for Linux, DMG for macOS) with official application icons embedded is generated in the `dist` directory.

#### Scenario: Multi-platform build execution
- **WHEN** multi-platform packaging is executed in a continuous integration environment across matrix runners
- **THEN** platform-specific binary bundles and installer packages are generated without packaging configuration errors.

#### Scenario: Update manifest generation
- **WHEN** distribution packaging is executed with release publishing enabled
- **THEN** `electron-builder` generates platform release manifests (`latest.yml`, `latest-linux.yml`, `latest-mac.yml`) targeting the canonical `arc-league` repository containing binary checksums and version metadata.

### Requirement: Automated Update Discovery and Manifest Verification
The desktop application shell SHALL verify the availability of new client versions against GitHub Releases manifests upon packaged production startup and notify the runtime environment without interrupting offline or local test modes.

#### Scenario: Update check in packaged production build
- **WHEN** the packaged application is launched with network connectivity
- **THEN** the update client queries the remote release feed for higher semver releases and update checksums.

#### Scenario: Update check bypass in unpackaged development or test mode
- **WHEN** the application is launched in development (`desktop:dev`) or automated headless test mode (`ELECTRON_TEST_MODE=1`)
- **THEN** remote update checks are bypassed and no remote release calls are initiated.

### Requirement: Background Update Download and Non-Disruptive Notification
The desktop application shell SHALL download verified update packages asynchronously in the background and transmit update readiness events to the renderer UI without interrupting active matches or combat inputs.

#### Scenario: Update downloaded in background
- **WHEN** a valid update package download finishes in the background
- **THEN** an update readiness event is dispatched across IPC to the UI displaying a subtle notification that an update is ready for the next restart.

#### Scenario: Network interruption during update download
- **WHEN** network connectivity drops while an update package is downloading
- **THEN** the download error is logged gracefully without crashing the game client or disrupting the player's active session.

### Requirement: Clean Update Installation on Game Restart
The desktop application shell SHALL apply staged updates automatically when the application quits or when the player explicitly triggers an update restart.

#### Scenario: Application exit with pending update
- **WHEN** the player exits the game after an update package has been downloaded and verified
- **THEN** the installer replaces the desktop executable and launches the updated version on next execution.

### Requirement: Packaging Output Hygiene
The local distribution packaging workflow SHALL remove stale build output from the packaging output directory before generating new packages, so every local build produces only artifacts from the current source state.

#### Scenario: Stale artifacts removed before packaging
- **WHEN** a local distribution packaging build is executed and the output directory contains artifacts from previous builds or retired product versions
- **THEN** all previously generated packages, manifests, blockmaps, and checksum files are removed before new packages are generated

#### Scenario: Cleanup is a safe no-op without existing output
- **WHEN** a local distribution packaging build is executed with no existing output directory (for example, a fresh clone or clean CI checkout)
- **THEN** packaging proceeds normally and no cleanup error is raised

#### Scenario: Cleanup failure blocks packaging
- **WHEN** stale output cannot be removed (for example, an installer is locked by another process)
- **THEN** the packaging build fails with a clear error before any new package is generated, rather than producing output mixed with stale artifacts

### Requirement: Native Desktop Auth Session Storage Bridge
The desktop shell SHALL provide IPC interfaces to load, save, and clear persistent authentication session payloads in `saves/auth_session.json` within the operating system user data directory.

#### Scenario: Saving authenticated session on desktop
- **WHEN** an authenticated user session is established or updated in the desktop renderer
- **THEN** the main process atomically writes the session payload to `saves/auth_session.json` in the user data directory.

#### Scenario: Restoring authenticated session on desktop boot
- **WHEN** the renderer queries the native desktop shell during startup for existing authentication sessions
- **THEN** the main process reads `saves/auth_session.json` and returns the stored session object or null if absent.

#### Scenario: Purging session on desktop sign out
- **WHEN** a sign out action occurs in the desktop renderer
- **THEN** the main process removes `saves/auth_session.json` from the user data directory.
