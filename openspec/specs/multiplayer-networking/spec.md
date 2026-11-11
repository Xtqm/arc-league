# Multiplayer Networking Specification

## Purpose

Coordinates real-time multiplayer room matchmaking, throttled state synchronization, interpolation, persistent rematching, and unpaused pointer management.

## Requirements

### Requirement: Room Lifecycle and Matchmaking
The system SHALL facilitate creating and joining peer rooms using 4-character codes or direct signaling, establishing a direct WebRTC DataChannel connection with symmetrical spawn locations for 1v1 and 2v2 Duos matches.

#### Scenario: Symmetrical room join
- **WHEN** a guest enters an active 4-character room code or accepts a direct peer handshake
- **THEN** the system links the guest to the room via WebRTC DataChannel, assigns symmetrical spawn positions, and initiates the combat session.

#### Scenario: Connection fallback and retry
- **WHEN** an initial direct P2P connection attempt fails or times out
- **THEN** the system retries ICE candidate exchange through configured STUN servers and notifies the player if the peer is unreachable.

### Requirement: Throttled State Synchronization and Interpolation
The system SHALL broadcast entity state, disc throws, and combat actions directly across low-latency WebRTC DataChannels at up to 60 Hz and smooth incoming peer positions using linear interpolation on the receiving client without database write overhead.

#### Scenario: Remote entity position interpolation
- **WHEN** incoming state updates arrive across the WebRTC DataChannel from remote peers
- **THEN** remote player models interpolate smoothly toward target positions and orientations without hitching the local 60 FPS render loop.

#### Scenario: Direct kinetic disc synchronization
- **WHEN** a player executes a kinetic disc throw or curve strike
- **THEN** the disc launch parameters (origin, velocity vector, curve spin) are transmitted immediately over the unbuffered DataChannel to the remote peer.

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
- **THEN** any pending end-of-match overlay timers and leftover AI countdown callbacks are cancelled before starting the 3-second match countdown.

### Requirement: Unpaused Cursor Overlay in Multiplayer
The system SHALL unlock the mouse pointer and present an interactive overlay when Escape or pause is pressed during multiplayer, without pausing the simulation.

#### Scenario: Escape pressed in multiplayer match
- **WHEN** a player presses Escape or P during an active online match
- **THEN** the pointer is unlocked and an interactive overlay is shown with options to click-to-resume or leave, while match simulation continues uninterrupted.
