# Spec Delta: Online Matchmaking

## ADDED Requirements

### Requirement: Quick Match Best-of-3 Series Progression
The system SHALL initialize automated Quick Match `1v1` duels as Best-of-3 series (`bestOf = 3`, first to 2 round wins) and synchronize round outcomes, updated series scores, automatic intermission transitions, and final clinch results over the reliable WebRTC DataChannel without database writes.

#### Scenario: Quick Match initializes as Best of 3 with zero-zero score
- **WHEN** two peers complete the Quick Match WebRTC handshake and transition from warm-up sparring
- **THEN** both peers enter Round 1 of a Best-of-3 series (`bestOf = 3`, `seriesScores = 0 - 0`) with `state.db === null`.

#### Scenario: Intermediate Quick Match round auto-advances over WebRTC
- **WHEN** Round 1 or a tied Round 2 of a Quick Match duel concludes before either player reaches 2 round wins
- **THEN** peers exchange reliable round-result messages (`ROUND_OVER` / `NEXT_ROUND_START`), display a brief ~2-second round-result intermission without showing the rematch screen or awarding payouts, and reset into the next round's 3-second countdown cleanly without writing to any room database.

## MODIFIED Requirements

### Requirement: Quick Match In-Place Rematch
The system SHALL support end-of-series resolution and in-place rematch voting directly over the active reliable WebRTC DataChannel between peers paired via automated matchmaking once the Best-of-3 series is clinched, without requiring a room document or re-entering the matchmaking queue.

#### Scenario: Match-end overlay displayed for both Quick Match peers
- **WHEN** either Quick Match peer reaches 2 round wins (`2 - 0` or `2 - 1`) in the Best-of-3 series
- **THEN** the reliable WebRTC channel delivers the series completion outcome so both clients present the post-match overlay (`VICTORY` / `DEREZZED`) displaying the final series score (`2 - 0` / `2 - 1`), callsigns, and active rematch voting (`0 / 2`).

#### Scenario: Unanimous Quick Match rematch over WebRTC
- **WHEN** both Quick Match peers click `VOTE REMATCH` on the post-match screen
- **THEN** the host triggers a fresh Best-of-3 series (`0 - 0`, Round 1) over the reliable WebRTC channel, resetting tiles, discs, and player health to 100% and initiating a 3-second countdown against the same opponent.
