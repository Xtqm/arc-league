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
The system SHALL provide reversible post-match rematch voting over reliable WebRTC DataChannels (with room-document fallback), allowing participants to vote or un-vote before consensus and resetting arena tiles, health, and round state in place once all active participants agree.

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

#### Scenario: Toggling a rematch vote off before consensus
- **WHEN** a participant who has voted for a rematch clicks the rematch button again before consensus launches the next round and before peer departure or timeout
- **THEN** the local vote toggles to `false`, the button remains enabled displaying the unvoted state (`VOTE REMATCH`), the updated `REMATCH_VOTE` (`voted: false`) is broadcast to peers (or written to the room document), and all clients decrement the displayed vote tally (`0 / 2`)

### Requirement: Rematch Peer Departure and Disconnect Handling
The system SHALL notify remaining participants, disable in-place rematch voting, and bound stalled rematch waits whenever a peer exits, closes its tab, loses WebRTC connectivity, or fails to finalize consensus before timeout.

#### Scenario: Opponent returns to menu after match
- **WHEN** a participant clicks the menu exit action from the post-match screen or unpaused overlay
- **THEN** the system transmits a departure signal over the reliable WebRTC DataChannel (and room document if active), disabling the remaining peer's rematch button as `OPPONENT LEFT` and displaying `OPPONENT RETURNED TO MENU`

#### Scenario: Peer WebRTC connection drops or closes
- **WHEN** an active WebRTC peer transitions to `disconnected`, `closed`, or `failed` during or after a duel
- **THEN** the remaining client stops waiting on rematch consensus, disables the rematch button as `OPPONENT LEFT`, and preserves the option to return to the menu

#### Scenario: Best-effort peer departure notice on tab unload
- **WHEN** a multiplayer participant closes or navigates away from the browser tab (`pagehide` or `beforeunload`) while in an active match or post-match screen
- **THEN** the client dispatches a best-effort `PEER_LEFT` signal over any open WebRTC channel without blocking unload teardown

#### Scenario: Rematch vote timeout unblocks stalled consensus
- **WHEN** a local player has an active rematch vote pending (or all votes reached `N / N` in room-document fallback without a host transition) and consensus fails to start a new round before the rematch timeout expires
- **THEN** the client clears its rematch timer, marks the rematch wait as timed out, disables the rematch button (`REMATCH TIMED OUT`), updates the status label to prompt menu return, and cancels any stale timers on rematch start or teardown

### Requirement: Multiplayer Room Arena Synchronization
The system SHALL persist the host's selected sector arena map in created room sessions, apply the corresponding arena theme and hazards for all room participants on match start and rematches regardless of guest local unlocks, and restore default arena materials upon teardown.

#### Scenario: Host room propagates selected arena to guests and rematches
- **WHEN** a host creates a `1v1` or `2v2` room with a chosen sector arena selected in the Host lobby and players start or rematch the duel
- **THEN** the room record and rematch start payload include the host's `mapId` / `gridId`, and both host and guest clients apply that arena's sector theme and hazards immediately after resetting arena tiles on every round

#### Scenario: Non-unlocked guest still renders host's selected arena
- **WHEN** a guest who only owns the default `arena_grid_01` locally joins a room created with an unlocked Campaign or Exotic arena map
- **THEN** the guest renders the host's chosen arena theme and hazards for that match session without failing validation or permanently unlocking the map in the guest's local storage

#### Scenario: Returning to menu or non-sectored mode restores default arena visuals
- **WHEN** multiplayer teardown completes or a player enters a non-sectored mode (`swarm` or `quickMatch`) after playing a themed sector arena
- **THEN** active sector hazards are removed and shared floor, edge, and wall material colors revert to default baseline visuals

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
