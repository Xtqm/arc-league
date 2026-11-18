# Spec Delta

## MODIFIED Requirements

### Requirement: Zero-Barrier Guest Sub-routine Provisioning
The system SHALL automatically provision an anonymous Guest Sub-routine identity with a stable unique identifier and transient session token upon initial launch, while guaranteeing that secured user accounts are never demoted to guest status upon application restart.

#### Scenario: Initial guest provisioning
- **WHEN** a player launches the game with no existing stored identity credentials
- **THEN** the system generates a unique guest identifier, assigns a default grid handle, and creates an active guest session without user friction.

#### Scenario: Guest persistence across browser reloads
- **WHEN** a player reloads or re-enters the game on the same client without having secured their identity
- **THEN** the previously generated guest identity and credentials are restored from local persistence without creating a redundant profile.

#### Scenario: Authenticated identity persistence across application restarts
- **WHEN** an authenticated or federated player reloads or restarts the game client
- **THEN** the previously secured identity and authorization credentials are restored without reverting to an anonymous guest sub-routine.

## ADDED Requirements

### Requirement: Native Desktop Auth Session Synchronization
The authentication engine SHALL query native desktop session persistence upon startup when running in a desktop shell environment, restoring secured identity state prior to guest sub-routine provisioning.

#### Scenario: Restoring secured desktop identity on launch
- **WHEN** the application boots in desktop mode and a valid authentication session exists in native storage
- **THEN** AuthManager hydrates the authenticated session, updates active user state, and suppresses guest sub-routine provisioning.

#### Scenario: Safe sign out in desktop mode
- **WHEN** an authenticated player signs out within the desktop environment
- **THEN** the native desktop authentication session file is purged alongside browser storage, and a fresh guest sub-routine session is initialized.
