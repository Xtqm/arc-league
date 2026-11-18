# Spec Delta

## ADDED Requirements

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
