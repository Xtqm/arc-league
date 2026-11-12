# Spec Delta: Combat HUD

## ADDED Requirements

### Requirement: Between-Round Series Intermission Feedback
The system SHALL present a brief, non-interactive round-result intermission callout (`ROUND X WON` / `ROUND X LOST` and current score) during online Best-of-N series whenever a sub-round finishes prior to series clinch, hiding automatically when the next round countdown starts.

#### Scenario: Sub-round completion displays brief score update before next countdown
- **WHEN** an intermediate round ends in a multi-round online `1v1` or `2v2` series
- **THEN** the HUD displays the round outcome and updated team series score during the ~2-second transition and clears automatically once the next round resets into its 3-second countdown.

## MODIFIED Requirements

### Requirement: Minimal Online Match Top-Right HUD
The system SHALL strip non-essential telemetry from the top-right HUD during online `1v1` and `2v2` matches, displaying only the compact Pause/Fullscreen controls, the small rival integrity bar, and (strictly when `bestOf > 1`) an ultra-compact series win-pip score strip directly beneath the rival bar while keeping room codes, point scores, and aggregate rival HP text hidden.

#### Scenario: Online 1v1 and 2v2 top-right HUD shows only controls and rival bar
- **WHEN** a player is in an active Best-of-1 (`bestOf = 1`) online `1v1` or `2v2` match
- **THEN** the top-right HUD displays the Pause/Fullscreen controls and the compact rival integrity bar reflecting aggregate living opponent health percentage, while hiding the series score strip, score, room label, and rival HP text readouts.

#### Scenario: Multi-round online series shows compact series pips beneath rival bar
- **WHEN** a player is in an active multi-round (`bestOf > 1`) online `1v1` or `2v2` match
- **THEN** an ultra-compact series score strip directly below the rival integrity bar displays current win pips and scores (`YOU` in cyan vs `RIVAL` / `RIVALS` in purple) sized consistently for desktop and mobile viewports without restoring `#roundLabel` or `#scoreRow`.

#### Scenario: Single-player modes preserve mode-specific HUD readouts
- **WHEN** a player is in Solo AI Duel (`duel_ai`), Swarm (`swarm`), or Campaign (`campaign`) mode
- **THEN** the top-right HUD continues displaying mode-appropriate tier, cycle, hostile count, and score readouts alongside compact styling with the online series score strip hidden.
