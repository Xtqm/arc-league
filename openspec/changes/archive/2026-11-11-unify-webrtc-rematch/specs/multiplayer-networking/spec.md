# Spec Delta: multiplayer-networking

## MODIFIED Requirements

### Requirement: In-Place Rematch Voting
The system SHALL provide persistent post-match rematch voting over the reliable WebRTC DataChannel across active peer sessions, with fallback to room-document synchronization when direct peer channels are unavailable, resetting fallen tiles, player health, and round state in place without generating a new room code once all active participants vote affirmatively.

#### Scenario: Unanimous rematch acceptance
- **WHEN** all connected players vote for a rematch on the post-match screen
- **THEN** the reliable WebRTC DataChannel (or room-document fallback when WebRTC is unavailable) synchronizes vote counts, the host issues a new round transition token, and all clients reset fallen tiles, restore player health to 100%, clear active discs, and start a 3-second countdown within the current session

#### Scenario: Unanimous WebRTC rematch with zero database writes
- **WHEN** connected 1v1 players with an open WebRTC DataChannel vote unanimously for a rematch
- **THEN** match-end, rematch vote, and round-start events travel directly over the reliable WebRTC DataChannel without writing rematch state to a cloud database

#### Scenario: Room-document fallback rematch acceptance
- **WHEN** connected participants in a session without an open WebRTC DataChannel (such as NAT-blocked or 4-player 2v2 rooms) vote unanimously for a rematch
- **THEN** the room-document fallback synchronizes vote counts, resets room state and round token once all active participants vote affirmatively, and restarts the match in place for all clients

#### Scenario: Eliminated 2v2 player does not respawn mid-match
- **WHEN** one player is eliminated in a 2v2 room while teammates remain alive and the room status stays active
- **THEN** subsequent state updates for the current round MUST NOT restart the arena or respawn the eliminated player until a new round transition token is issued after match completion

## ADDED Requirements

### Requirement: Rematch Peer Departure and Disconnect Handling
The system SHALL notify remaining participants and disable in-place rematch voting whenever a peer leaves the post-match screen or loses its WebRTC connection.

#### Scenario: Opponent returns to menu after match
- **WHEN** a participant clicks the menu exit action from the post-match screen or unpaused overlay
- **THEN** the system transmits a departure signal over the reliable WebRTC DataChannel (and room document if active), disabling the remaining peer's rematch button as `OPPONENT LEFT` and displaying `OPPONENT RETURNED TO MENU`

#### Scenario: Peer WebRTC connection drops or closes
- **WHEN** an active WebRTC peer transitions to `disconnected`, `closed`, or `failed` during or after a duel
- **THEN** the remaining client stops waiting on rematch consensus, disables the rematch button as `OPPONENT LEFT`, and preserves the option to return to the menu

### Requirement: Per-Round Rematch State and Economy Reset
The system SHALL isolate match-end payouts, pending overlay timers, and pre-match countdown callbacks per round so every rematch awards economy rewards accurately and never triggers stale round transitions.

#### Scenario: Single victory payout on first match and rematch
- **WHEN** a player wins a multiplayer duel and then wins a subsequent rematch in the same session
- **THEN** the system awards the multiplayer victory payout exactly once per completed match without double-crediting the opening match or skipping payouts on rematches

#### Scenario: Clean round reset across consecutive duels
- **WHEN** a rematch begins from the post-match overlay or transitions out of warm-up sparring
- **THEN** any pending end-of-match overlay timers and leftover AI countdown callbacks are cancelled before starting the 3-second match countdown
