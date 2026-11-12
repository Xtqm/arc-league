# Spec Delta: multiplayer-networking

## MODIFIED Requirements

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

## ADDED Requirements

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
