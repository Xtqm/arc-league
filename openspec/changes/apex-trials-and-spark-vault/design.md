# Design

## Context

See `proposal.md` for motivation. Once `economy-rebalance-and-hud`, `federation-menu-and-swarm-modal`, and `contracts-system` establish Sparks earning (`Hardcore Swarm`, `Career Contracts`, `3-star Sector Arbiters`, `Level Milestones`), players need the active **Apex Trials** event gauntlet and **Spark Vault** storefront accessible via `#apexTrialsBtn`.

## Goals / Non-Goals

**Goals:**
- Provide a clean, deterministic client-side + optional cloud-synced event calendar supporting sporadic 3–7 day Apex Trials with customizable mutators (`gravityScale`, `discSpeedMult`, `hazardDensity`, `enemyTiers`).
- Guarantee offline-first playability: when Supabase/online leaderboard services are unavailable, compute percentile brackets (`Top 1%`, `Top 10%`, `Top 25%`, `Participant`) against deterministic federation benchmark curves while supporting live Supabase leaderboard submission/query when connected.
- Embed the weekly rotating 1–3 item **Spark Vault** inside `ApexTrialsModal` so players have one cohesive endgame hub for spending Sparks on entries OR prestige cosmetics.
- Enforce `UNLOCK_TYPES.SPARKS` Vault exclusivity in `ArmoryManager` / `ArmoryModal` so items like `disc_hex_dark_matter` (`75 Sparks`) and `disc_shuriken_void` (`100 Sparks`) route through the rotating Spark Vault.

**Non-Goals:**
- Real-money transactions or player-to-player wagering (Sparks are strictly earned through gameplay and spent on non-gambling arcade trial tickets and cosmetics).
- Building a live backend admin CMS (event definitions and Vault pool live in `ApexTrialRegistry.js` with date-window scheduling).

## Decisions

1. **Deterministic Weekly Seed for Spark Vault Rotation (1–3 Items)**
   - *Choice*: Compute the current UTC week index (`Math.floor(Date.now() / (7 * 86400 * 1000))`) and deterministically rotate 1–3 items from the eligible `UNLOCK_TYPES.SPARKS` pool (including `disc_hex_dark_matter` and `disc_shuriken_void` plus any Vault prestige variants).
   - *Rationale*: Synchronizes rotation schedules across all clients and offline desktop builds without requiring a dedicated rotation server, while naturally allowing items to reappear across future weeks.
2. **Event Mutator Execution via Match Config Injection**
   - *Choice*: Introduce `gameMode = 'apex_trial'` sharing core arena/wave/bot pipelines (`Bot.js`, `Disc.js`, `main.js`) with an active `state.activeTrialMutators` config object (`gravity`, `discSpeedMultiplier`, `hazardInterval`, `startingTier`).
   - *Rationale*: Reuses existing combat physics and sector hazards without duplicating gameplay loops.
3. **Free Ticket First, 2-Spark Re-Entry Guarded at Launch**
   - *Choice*: Check `apexTrials.cycles[cycleId].freeTicketUsed` before deducting Sparks. Deduct 2 Sparks atomically only when `freeTicketUsed === true` and `startMode('apex_trial')` is confirmed.
   - *Rationale*: Prevents accidental Spark loss on cancelled launches while letting every athlete try every sporadic event once for free.
4. **Hybrid Online / Local Benchmark Leaderboard**
   - *Choice*: Submit `bestAR` to Supabase (`apex_trial_scores` table when authenticated & online) and fall back cleanly to deterministic event benchmark thresholds (`AR >= top1Threshold`, etc.) when offline or in local tests.
   - *Rationale*: Preserves the project's offline-first instant-boot invariant while supporting real global percentile competition online.

## Risks / Trade-offs

- **Player exploits clock changes to manipulate weekly Vault rotation or event windows** → Accept client-clock fallback for single-player/offline mode; verify against Supabase server timestamps (`now()`) when submitting online leaderboard scores.
- **Duplicate cycle reward claims across devices** → Persist `apexTrials.cycles[cycleId].claimed = true` and merge via `Local || Cloud` in `CloudSyncResolver.js`.
- **Vault items temporarily hidden in Athlete Loadout** → Keep `sparks` items visible in Athlete Loadout with a clear `[ APEX VAULT // {cost} SPARKS ]` badge and shortcut button into `APEX TRIALS -> SPARK VAULT` so players always know the items exist and how to earn them.
