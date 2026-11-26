# Design

## Context

See `proposal.md` for motivation. Currently the game has static lifetime achievements (`AchievementRegistry.js`) and no recurring daily goals or rolling mid/endgame contract loop.

## Goals / Non-Goals

**Goals:**
- Decouple **Contracts** cleanly from **Achievements** (one-time lifetime feats) using a pure `ContractRegistry` + stateful `ContractManager` + `ContractsModal` pattern mirroring `AchievementRegistry`/`AchievementManager`.
- Enforce the dual unlock gate (`Player Level >= 5 && Swarm Highest Wave >= 5`) before activating Career Contracts.
- Implement deterministic UTC 24-hour Daily Contracts reset and shuffle-bag Career deck replacement across 3 distinct focus slots (`combat`, `endurance`, `duel`).
- Provide zero-stall dual-gate promotion (`tierCompletions >= quota && level >= levelGate`) so players exceeding completion quotas before reaching the level gate keep drawing fresh contracts at their current tier.

**Non-Goals:**
- Server-authoritative anti-cheat for contract counters (telemetry relies on local client bridges and `CloudSyncResolver` merge, consistent with `EconomyManager` and `AchievementManager`).
- Creating Apex Trials event contracts (can be added as future `duel`/event templates once `apex-trials-and-spark-vault` lands).

## Decisions

1. **UTC Day Key (`YYYY-MM-DD`) for Daily Reset**
   - *Choice*: Key the 3 Daily Contract slots off `new Date().toISOString().slice(0, 10)` so comparing `contracts.daily.dateKey !== todayUtcKey` automatically triggers rotation on login/modal open without background timers.
   - *Rationale*: Reliable across offline desktop, browser tabs, and clock boundaries with zero server cron dependency.
2. **Per-Tier + Per-Focus Shuffle-Bag Queues**
   - *Choice*: Store `contracts.career.seenIds[tierKey][focus]` as arrays of completed/dealt template IDs within the current cycle; when a bucket is exhausted, clear only that bucket's `seenIds` and reshuffle.
   - *Rationale*: Guarantees variety across consecutive draws while preventing infinite save-state growth.
3. **Unified Telemetry Subscription via `EventTarget` / Bridge Listeners**
   - *Choice*: Have `ContractManager` subscribe to `DuelEconomyBridge`, `SwarmEconomyBridge`, `CampaignManager`, `EconomyManager`, and `StorageManager` stats mutations, mapping raw combat events (`maneuver_parry`, `maneuver_ricochet`, `maneuver_curve_kill`, `swarm_wave`, `duel_win`, `tour_clear`) to active contract `metricKey` counters.
   - *Rationale*: Zero tight coupling inside `Bot.js` or `Disc.js`; combat code continues emitting standard bridge events.
4. **Manual Claim UX Over Auto-Grant**
   - *Choice*: Transition completed contracts to `claimable` status and pulse `#contractsBtn`, letting players click `[ CLAIM ]` in `ContractsModal` to watch Arc Credits / Sparks / XP increment and see the next Career contract deal in.
   - *Rationale*: Matches `AchievementsModal` tactile reward loop and makes the shuffle-bag replacement visibly rewarding.

## Risks / Trade-offs

- **Players completing Daily Contracts offline and syncing across tabs/devices** → Merge `daily` by keeping the record matching the latest `dateKey` (and higher progress per slot on equal `dateKey`), and merge `career.tier` monotonically via `max(Local, Cloud)`.
- **Level-gate mismatch when `stats.swarmHighestWave` was earned prior to `contracts-system`** → Evaluate unlock condition reactively on boot as well as on `LEVEL_UP` and `swarmHighestWave` updates so veteran players unlock Career Contracts immediately.
