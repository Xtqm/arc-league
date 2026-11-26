# Spec Delta

## MODIFIED Requirements

### Requirement: Room Lifecycle and Matchmaking
The system SHALL facilitate creating and joining peer rooms using 4-character codes or direct signaling, establishing a direct WebRTC DataChannel connection for `1v1` matches and synchronizing `2v2` Duos matches across all 4 participants via the shared room document with symmetrical spawn locations.

#### Scenario: Symmetrical room join
- **WHEN** a guest enters an active 4-character room code or accepts a direct peer handshake in a `1v1` match
- **THEN** the system links the guest to the room via WebRTC DataChannel, assigns symmetrical spawn positions, and initiates the combat session.

#### Scenario: Symmetrical 2v2 room join without 1-to-1 WebRTC miswiring
- **WHEN** a host creates a `2v2` room and up to three guests enter the 4-character room code
- **THEN** the system assigns symmetrical team spawn positions (`p1`/`p3` vs `p2`/`p4`), initiates the combat session via room-document synchronization without creating a 2-peer WebRTC DataChannel, and does not falsely trigger `OPPONENT LEFT` from 1-to-1 WebRTC state changes.

#### Scenario: Connection fallback and retry
- **WHEN** an initial direct P2P connection attempt in a `1v1` room fails or times out
- **THEN** the system retries ICE candidate exchange through configured STUN servers and notifies the player if the peer is unreachable.

### Requirement: Best-of-N Multi-Round Online Series Progression
The system SHALL govern online `1v1` and `2v2` matches using a Best-of-N series format (`bestOf` in `{1, 3, 5, 7}`) where the first side to reach `ceil(bestOf / 2)` round wins clinches the match, keeping eliminated `2v2` teammates in a live spectator view until the full team is eliminated and displaying a brief automatic ~2-second round-result intermission before resetting the arena and starting the next round's 3-second countdown whenever an intermediate round finishes without clinching.

#### Scenario: Eliminated 2v2 player spectates living teammate until round completion
- **WHEN** one player in a `2v2` match is eliminated while their teammate remains alive
- **THEN** the eliminated player's local combat controls and position sync stop, their local simulation loop remains active to interpolate remote players, and their camera follows their surviving teammate until the round concludes.

#### Scenario: Host-refereed 2v2 team-wipe settlement handles simultaneous teammate deaths
- **WHEN** both teammates on a `2v2` team are eliminated (sequentially or within the same network update window)
- **THEN** each eliminated player publishes their elimination state (`hp: 0`, `alive: false`) to the room document, and the Host evaluates full-team elimination across both teams to issue a single authoritative `round_over`, `finished`, or `round_draw` transition without hanging the match.

#### Scenario: Hosted room persists and synchronizes series length and round scores
- **WHEN** a host creates a `1v1` or `2v2` room with a selected `bestOf` format (`1`, `3`, `5`, or `7`)
- **THEN** the room record persists `bestOf`, `seriesRound`, and team `seriesScores`, and all joining clients hydrate the matching series target and score state on room snapshot and reliable WebRTC updates.

#### Scenario: Intermediate round ends before series clinch
- **WHEN** a combatant or full `2v2` team is eliminated in a multi-round series and neither side has reached `ceil(bestOf / 2)` round wins
- **THEN** the winning side's series score increments by 1, active simulation briefly displays the round result (`ROUND X WON` / `ROUND X LOST` with current score) for ~2 seconds without showing Rematch or Leave controls or awarding end-of-match payouts, and all clients automatically reset tiles, health, energy, discs, and spawn positions into a 3-second countdown for `seriesRound + 1`.

#### Scenario: Series clinch presents post-match results, rematch, and leave controls
- **WHEN** a round win causes a player or `2v2` team to reach `ceil(bestOf / 2)` round wins
- **THEN** the match concludes cleanly, displaying `VICTORY` or `DEREZZED` with participant callsigns, the final series score (such as `2 - 1`), and interactive `VOTE REMATCH` and `RETURN TO MENU` controls.

#### Scenario: Peer departure mid-series resolves immediately
- **WHEN** a peer disconnects or returns to the menu during an active multi-round series or during a between-round intermission
- **THEN** pending intermission timers are cancelled immediately and the remaining side is presented with match completion (`OPPONENT LEFT` / `OPPONENT RETURNED TO MENU`) and menu return options.
