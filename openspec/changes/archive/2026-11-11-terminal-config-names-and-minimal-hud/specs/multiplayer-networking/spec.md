# Spec Delta: Multiplayer Networking

## ADDED Requirements

### Requirement: Online Combatant Callsign Synchronization and Post-Match Display
The system SHALL resolve each participant's active callsign from the identity profile, synchronize participant callsigns across hosted `1v1` and `2v2` rooms, and display participant names on arena nameplates and post-match result screens.

#### Scenario: Hosted 1v1 and 2v2 rooms persist and propagate player callsigns
- **WHEN** a host creates a `1v1` or `2v2` room or a guest joins the room
- **THEN** the room record stores each joined role's active callsign (`p1`–`p4`) and all clients populate remote player callsigns on match start and rematches without losing the profile callsign when network authentication initializes anonymously.

#### Scenario: Real-time callsign exchange over WebRTC fallback
- **WHEN** peers connect over a direct WebRTC DataChannel in a hosted room
- **THEN** peers exchange their role and callsign over the reliable channel so remote player names remain synchronized even before or independently of room snapshot updates.

#### Scenario: Post-match screen displays participant names
- **WHEN** an online `1v1` or `2v2` match finishes with a `VICTORY` or `DEREZZED` overlay
- **THEN** the post-match summary displays the combatants' callsigns (such as the local player vs. opponent in `1v1` or team rosters in `2v2`) alongside the existing rematch and menu controls.
