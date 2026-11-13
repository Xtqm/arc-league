# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Executable Packaging Configuration
The system SHALL provide packaging configurations via electron-builder to generate standalone desktop executables and update manifests for Windows, Linux, and macOS platforms.

#### Scenario: Distribution packaging build
- **WHEN** the developer executes `npm run desktop:build` on a target OS
- **THEN** a standalone executable distribution package (NSIS and portable for Windows, AppImage for Linux, DMG for macOS) is generated in the `dist` directory.

#### Scenario: Multi-platform build execution
- **WHEN** multi-platform packaging is executed in a continuous integration environment across matrix runners
- **THEN** platform-specific binary bundles and installer packages are generated without packaging configuration errors.

#### Scenario: Update manifest generation
- **WHEN** distribution packaging is executed with release publishing enabled
- **THEN** `electron-builder` generates platform release manifests (`latest.yml`, `latest-linux.yml`, `latest-mac.yml`) containing binary checksums and version metadata.
