# Spec Delta: Desktop Shell

## MODIFIED Requirements

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
