# Spec Delta: online-matchmaking

## MODIFIED Requirements

### Requirement: Automated Matchmaking Queue and Regional Pairing
The system SHALL provide an automated matchmaking queue that registers searching players with lightweight signaling, pairs available peers, and initiates WebRTC handshakes without requiring manual room code entry.

#### Scenario: Entering matchmaking queue
- **WHEN** a player activates the `QUICK MATCH` action (`#quickMatchBtn`) directly from the primary main menu
- **THEN** the system enters the queue state, opens a presence listener on the signaling channel, and announces player readiness without requiring entry into a hosting modal.

#### Scenario: Peer pairing and handshake initiation
- **WHEN** two searching players are matched in the queue
- **THEN** the system designates one peer as host, initiates WebRTC offer/answer negotiation, and transitions both clients into connection establishment.

#### Scenario: Cancelling active queue
- **WHEN** the player clicks `[ CANCEL QUEUE ]` on the queue HUD banner or presses Escape during matchmaking
- **THEN** the system withdraws the search token from the signaling channel, despawns the warm-up sparring bot, and returns the player cleanly to the primary main menu.

### Requirement: Warm-up Sparring Arena During Queue
The system SHALL spawn the searching player immediately into an interactive warm-up arena against an AI sparring bot while the matchmaking search proceeds in the background, strictly reserved for automated Quick Match.

#### Scenario: Immediate spawn into warm-up arena
- **WHEN** a player enters the automated matchmaking queue via Quick Match
- **THEN** the system loads the Prime Stadium arena, spawns an AI sparring bot, and displays a non-blocking tactical HUD banner indicating active queue search.

#### Scenario: Combat interactions during warm-up
- **WHEN** the player throws kinetic discs, parries, or eliminates the sparring bot during the queue
- **THEN** the bot respawns upon de-allocation and all combat physics function identically to offline practice mode.

#### Scenario: Absence of warm-up sparring bot in friendly custom rooms
- **WHEN** a player hosts or joins a custom 1v1 or 2v2 friendly room via room codes
- **THEN** the system displays the room modal waiting for challengers without spawning a warm-up sparring bot or displaying the matchmaking queue HUD.
