# Spec Delta: Multiplayer Networking

## ADDED Requirements

### Requirement: Best-of-N Multi-Round Online Series Progression
The system SHALL govern online `1v1` and `2v2` matches using a Best-of-N series format (`bestOf` in `{1, 3, 5, 7}`) where the first side to reach `ceil(bestOf / 2)` round wins clinches the match, displaying a brief automatic ~2-second round-result intermission before resetting the arena and starting the next round's 3-second countdown whenever an intermediate round finishes without clinching.

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

## MODIFIED Requirements

### Requirement: In-Place Rematch Voting
The system SHALL provide reversible post-match rematch voting over reliable WebRTC DataChannels (with room-document fallback), allowing participants to vote or un-vote before consensus and resetting arena tiles, health, series scores, and round state in place once all active participants agree.

#### Scenario: Unanimous rematch acceptance
- **WHEN** all connected players vote for a rematch on the post-match screen after a completed series
- **THEN** the reliable WebRTC DataChannel (or room-document fallback when WebRTC is unavailable) synchronizes vote counts, the host issues a new round transition token keeping the session `bestOf`, and all clients reset series scores to `0 - 0`, reset fallen tiles, restore player health to 100%, clear active discs, and start a 3-second countdown within the current session.

#### Scenario: Unanimous WebRTC rematch with zero database writes
- **WHEN** connected 1v1 players with an open WebRTC DataChannel vote unanimously for a rematch
- **THEN** match-end, round transitions, rematch vote, and round-start events travel directly over the reliable WebRTC DataChannel without writing rematch state to a cloud database.

#### Scenario: Room-document fallback rematch acceptance
- **WHEN** connected participants in a session without an open WebRTC DataChannel (such as NAT-blocked or 4-player 2v2 rooms) vote unanimously for a rematch
- **THEN** the room-document fallback synchronizes vote counts, resets room state, series scores (`0 - 0`), and round token once all active participants vote affirmatively, and restarts the match in place for all clients.

#### Scenario: Eliminated 2v2 player does not respawn mid-match
- **WHEN** one player is eliminated in a 2v2 room while teammates remain alive and the room status stays active
- **THEN** subsequent state updates for the current round MUST NOT restart the arena or respawn the eliminated player until a new round or series transition token is issued after round completion.

#### Scenario: Toggling a rematch vote off before consensus
- **WHEN** a participant who has voted for a rematch clicks the rematch button again before consensus launches the next round and before peer departure or timeout
- **THEN** the local vote toggles to `false`, the button remains enabled displaying the unvoted state (`VOTE REMATCH`), the updated `REMATCH_VOTE` (`voted: false`) is broadcast to peers (or written to the room document), and all clients decrement the displayed vote tally (`0 / 2`).

### Requirement: Per-Round Rematch State and Economy Reset
The system SHALL isolate match-end payouts, pending overlay or intermission timers, and pre-match countdown callbacks per completed series so every finished series awards economy rewards once and never triggers stale round transitions.

#### Scenario: Single victory payout on first match and rematch
- **WHEN** a player wins an entire Best-of-N multiplayer series and later wins a full rematch series in the same session
- **THEN** the system awards no multiplayer match payout on intermediate sub-rounds, awards the multiplayer victory payout exactly once when a series is clinched, and resets payout tracking cleanly when a new rematch series begins.

#### Scenario: Clean round reset across consecutive duels
- **WHEN** a new sub-round or rematch series begins from an intermission, post-match overlay, or warm-up sparring transition
- **THEN** any pending end-of-match overlay timers, intermission timers, and leftover AI countdown callbacks are cancelled before starting the 3-second match countdown.
