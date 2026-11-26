# Spec Delta

## MODIFIED Requirements

### Requirement: Duel AI Match Flow
The system SHALL operate an endless tiered 1v1 AI Practice mode starting with a 250 HP opponent on Tier 1 and scaling opponent health (`250 + tier * 50` HP) and aggression per victory, tracking `sessionTiersCleared` across the run without mid-run currency payouts, automatically resetting the round and initiating a 3-second countdown for the next tier.

#### Scenario: Elite bot eliminated in Duel AI
- **WHEN** the elite AI opponent's health reaches zero in AI Practice (`duel` or `duel_ai`)
- **THEN** the system increments `sessionTiersCleared` and `tier`, announces tier advancement, restores player health, disc, spawn position, and arena tiles, and starts a 3-second countdown to spawn the next scaled tier opponent without issuing a mid-run Arc Credits payout.

#### Scenario: Tier 1 elite bot initialization
- **WHEN** the player enters AI Practice (`duel` or `duel_ai`) and the initial 3-second countdown finishes
- **THEN** the Tier 1 elite AI opponent spawns with 250 HP, `sessionTiersCleared` starts at 0, and the HUD displays `TIER: 1`.

### Requirement: Player Defeat Lifecycle
The system SHALL conclude active gameplay and display the defeat overlay whenever the local player is fractured, providing mode-appropriate retry, tier rematch, and menu exit actions and settling session-end AI Practice rewards upon defeat or early exit.

#### Scenario: Player de-rez by combat or void
- **WHEN** the player's health drops to zero or the player plunges past the terminal void threshold in Swarm or Campaign modes
- **THEN** gameplay simulation suspends player control and the Game Over modal is displayed with retry and menu options.

#### Scenario: Player de-rez in Solo AI Duel offers same-tier rematch and Tier 1 restart
- **WHEN** the player is fractured during AI Practice (`duel` or `duel_ai`) at Tier N or exits AI Practice to the main menu
- **THEN** gameplay simulation suspends control, settles the session-end payout based on `sessionTiersCleared` (0 tiers: 0 AC + 25 XP; 25 AC + 80 XP per tier beaten in Tiers 1–5; 35 AC + 100 XP per tier beaten at Tier 6+), resets `sessionTiersCleared` to 0, and on defeat displays `REMATCH TIER N`, `RESTART TIER 1`, and `MODE SELECT`.

#### Scenario: Rematching the current AI Duel tier
- **WHEN** the defeated player selects `REMATCH TIER N` on the Solo AI Duel Game Over modal
- **THEN** `sessionTiersCleared` starts at 0 for the new run, arena tiles, player health, disc possession, and spawn position reset cleanly, and a 3-second countdown spawns the Tier N AI opponent.

#### Scenario: Restarting Solo AI Duel from Tier 1
- **WHEN** the defeated player selects `RESTART TIER 1` on the Solo AI Duel Game Over modal
- **THEN** `tier`, `sessionTiersCleared`, and score reset to Tier 1 baseline and a 3-second countdown spawns the Tier 1 AI opponent.

### Requirement: Swarm Defense Wave Economy and Streak Payouts
The system SHALL differentiate Swarm Protocol economy payouts by variant: Standard Swarm awards 5 Arc Credits and 20 XP per wave scaled by a +10% per-wave streak multiplier capped at 2.5x from Wave 15 onward plus `tier * 50 AC` and `tier * 150 XP` chests every 5 waves; Hardcore Swarm awards 0 Arc Credits and 65 XP per wave (scaled up to 2.5x at Wave 15) plus Sparks and XP milestone bonuses.

#### Scenario: Standard wave completion payout
- **WHEN** a player completes a wave in Standard Swarm mode
- **THEN** the system awards a base yield of 5 Arc Credits and 20 XP multiplied by `min(2.5, 1 + (streak - 1) * 0.10)` and emits a wave payout event.

#### Scenario: Milestone wave bonus chest award
- **WHEN** a player completes wave 5, 10, 15, or any multiple of 5 in Standard Swarm mode
- **THEN** the system dispenses a milestone bonus chest granting `tier * 50` Arc Credits and `tier * 150` XP alongside standard wave earnings.

#### Scenario: Hardcore Swarm early Spark milestones (Waves 5, 10, 15)
- **WHEN** a player completes Wave 5, Wave 10, or Wave 15 in Hardcore Swarm mode
- **THEN** the system awards 1 Spark + 200 XP at Wave 5, 2 Sparks + 400 XP at Wave 10, and 3 Sparks + 600 XP at Wave 15 alongside per-wave Hardcore XP.

#### Scenario: Hardcore Swarm endless 10-wave Spark escalation (Wave 20+)
- **WHEN** a player completes Wave 20, Wave 30, Wave 40, or any subsequent multiple of 10 in Hardcore Swarm mode
- **THEN** the system awards `5 * ((wave / 10) - 1)` Sparks (5 at Wave 20, 10 at Wave 30, +5 per 10 waves indefinitely) and `1000 * ((wave / 10) - 1)` bonus XP (1,000 at Wave 20, 2,000 at Wave 30, +1,000 per 10 waves indefinitely).

### Requirement: Duel Match Outcome Payouts and Defeat Participation
The system SHALL award 120 Arc Credits and 300 XP for online Arc League Ranked Best-of-N series victories (credited once upon series clinch), 15 Arc Credits and 80 XP for Ranked series defeats, and route AI Practice rewards strictly through session-end `sessionTiersCleared` evaluation.

#### Scenario: Solo or practice AI duel victory
- **WHEN** a player defeats an AI Practice boss mid-run
- **THEN** per-kill mid-run Arc Credit payouts are suppressed in favor of session-end `sessionTiersCleared` settlement upon defeat or exit.

#### Scenario: Multiplayer duel match victory
- **WHEN** a player or team clinches a Best-of-N series in an online `1v1` or `2v2` Ranked match or Quick Match
- **THEN** the system credits 120 Arc Credits plus 300 victory XP to the victor's profile once for the completed series and persists the update.

#### Scenario: Match defeat participation credit
- **WHEN** a player loses a completed Best-of-N online series
- **THEN** the system awards 15 Arc Credits and 80 participation XP to honor player investment.
