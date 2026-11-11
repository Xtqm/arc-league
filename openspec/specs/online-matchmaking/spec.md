# online-matchmaking Specification

## Purpose

Coordinates automated online matchmaking queue lifecycles, lightweight peer pairing, and the interactive warm-up sparring arena that eliminates idle waiting times.

## Requirements

### Requirement: Automated Matchmaking Queue and Regional Pairing
The system SHALL provide an automated matchmaking queue that registers searching players with lightweight signaling, pairs available peers, and initiates WebRTC handshakes without requiring manual room code entry.

#### Scenario: Entering matchmaking queue
- **WHEN** a player activates the `[ FIND MATCH ]` action from the multiplayer menu
- **THEN** the system enters the queue state, opens a presence listener on the signaling channel, and announces player readiness.

#### Scenario: Peer pairing and handshake initiation
- **WHEN** two searching players are matched in the queue
- **THEN** the system designates one peer as host, initiates WebRTC offer/answer negotiation, and transitions both clients into connection establishment.

#### Scenario: Cancelling active queue
- **WHEN** the player clicks `[ CANCEL QUEUE ]` or presses Escape during matchmaking
- **THEN** the system withdraws the search token from the signaling channel and returns the player cleanly to the main menu.

### Requirement: Warm-up Sparring Arena During Queue
The system SHALL spawn the searching player immediately into an interactive warm-up arena against an AI sparring bot while the matchmaking search proceeds in the background.

#### Scenario: Immediate spawn into warm-up arena
- **WHEN** a player enters the matchmaking queue
- **THEN** the system loads the Prime Stadium arena, spawns an AI sparring bot, and displays a non-blocking tactical HUD banner indicating active queue search.

#### Scenario: Combat interactions during warm-up
- **WHEN** the player throws kinetic discs, parries, or eliminates the sparring bot during the queue
- **THEN** the bot respawns upon de-allocation and all combat physics function identically to offline practice mode.

### Requirement: Seamless Matchmaking Handoff
The system SHALL smoothly terminate the warm-up sparring bot, reset arena integrity, and initiate the ranked peer match upon successful completion of the WebRTC peer handshake.

#### Scenario: Peer connection established during warm-up
- **WHEN** the WebRTC DataChannel connection state changes to `open` between matched peers
- **THEN** the system plays an audio-visual challenger alert chime, clears the training bot, resets fallen floor tiles, resets player health, and begins a 3-second match countdown.

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
