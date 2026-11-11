# Spec Delta: online-matchmaking

## ADDED Requirements

### Requirement: Quick Match In-Place Rematch
The system SHALL support end-of-match resolution and in-place rematch voting directly over the active reliable WebRTC DataChannel between peers paired via automated matchmaking, without requiring a room document or re-entering the matchmaking queue.

#### Scenario: Match-end overlay displayed for both Quick Match peers
- **WHEN** a Quick Match duel concludes by combat elimination or void fall
- **THEN** the reliable WebRTC channel delivers the match outcome to the surviving peer so both clients present the post-match overlay (`VICTORY` / `DEREZZED`) with active rematch voting (`0 / 2`)

#### Scenario: Unanimous Quick Match rematch over WebRTC
- **WHEN** both Quick Match peers click `VOTE REMATCH` on the post-match screen
- **THEN** the host triggers a new round over the reliable WebRTC channel, resetting tiles, discs, and player health to 100% and initiating a 3-second countdown against the same opponent

### Requirement: Post-Match Queue Reset on Exit
The system SHALL reset the automated matchmaking queue to `IDLE` and notify the paired peer whenever a Quick Match player exits to the menu or loses peer connectivity.

#### Scenario: Returning to menu and re-queueing after Quick Match
- **WHEN** a Quick Match player clicks `RETURN TO MENU` from the post-match overlay or unpaused escape overlay
- **THEN** the system notifies the remote peer over the reliable WebRTC channel, tears down the WebRTC and signaling resources, and returns the matchmaking queue to `IDLE` so subsequent queue requests succeed

#### Scenario: Quick Match peer exits while opponent remains on post-match screen
- **WHEN** one Quick Match peer exits to the menu or disconnects after a match
- **THEN** the remaining peer's post-match rematch button is disabled as `OPPONENT LEFT` with `OPPONENT RETURNED TO MENU` displayed
