# Design

## Context

See `proposal.md` for motivation. Across `EconomyManager`, `ArmoryCatalog`, `DuelEconomyBridge`, `SwarmEconomyBridge`, `CampaignRegistry`, `AchievementRegistry`, and `hud.js`, currency transactions currently mix `bits` and `credits`, leave `player.currency.sparks` unused, award cash for every in-combat parry/ricochet/curve kill directly over the center reticle, and pay out AI Practice (`duel_ai`) rewards per-kill mid-run.

## Goals / Non-Goals

**Goals:**
- Route all standard currency UI, bridge calls, and catalog costs through **Arc Credits (AC)** while preserving internal `player.currency.bits` read/write mirroring for backward compatibility with existing save files and cloud sync.
- Activate `EconomyManager` Sparks methods (`getSparks`, `awardSparks`, `spendSparks`, `canAffordSparks`) backed by `player.currency.sparks` and `window.gameDebug.addSparks`.
- Replace center-screen floating `+Credits` elements with a stacked, collision-free Flexbox log inside `#tl`.
- Defer `duel_ai` payouts to session end (`defeat` or early exit) using `state.sessionTiersCleared` so `REMATCH TIER N` cannot be exploited.
- Differentiate Standard vs. Hardcore Swarm payout curves and add Hardcore Wave-15 achievement gating plus full Sectors 1–4 mastery gating for `chassis_arbiter`.

**Non-Goals:**
- Building the Contracts modal/deck or Apex Trials/Spark Vault UI (covered in `contracts-system` and `apex-trials-and-spark-vault`).
- Overhauling main menu labels or adding the Swarm deployment modal (covered in `federation-menu-and-swarm-modal`).

## Decisions

1. **Dual-Write `credits`/`bits` Mirroring in `EconomyManager` & `StorageManager`**
   - *Choice*: Keep `StorageManager` and `EconomyManager` writing both `player.currency.credits` and `player.currency.bits` in lockstep internally, while eliminating all `"Bits"` strings from UI, HUD, and bridge/catalog public APIs (keeping `awardBits`/`spendBits` as silent deprecated aliases for legacy callers/tests).
   - *Rationale*: Existing local saves and Supabase `save_states` rows rely on monotonic `max(Local, Cloud)` resolution across both fields; dropping the mirror key prematurely would risk losing veteran player balances.
2. **Sparks Integration in `ArmoryCatalog` (`UNLOCK_TYPES.SPARKS`)**
   - *Choice*: Add `UNLOCK_TYPES.SPARKS` (`'sparks'`) and mark `disc_hex_dark_matter` (`cost: 75`) and `disc_shuriken_void` (`cost: 100`, `achievementId: null`) as Sparks-unlocked items. Until the weekly `spark-vault` UI lands, `ArmoryManager.canPurchase` / `purchaseItem` will check `canAffordSparks` / `spendSparks` cleanly (or respect Vault gating once `apex-trials-and-spark-vault` is active).
   - *Rationale*: Fixes the `cost: 0` Dark Matter exploit and removes duplicate achievement gating immediately in Phase 1.
3. **Flexbox Column Queue in `#tl` for Tactical XP Log**
   - *Choice*: Convert `#tl` into a dedicated `display: flex; flex-direction: column; gap: 6px; pointer-events: none` container capped at 4 visible entries with independent 2,000ms fade-and-remove timers (`showTacticalXP(xp, label, options)`). Keep `showFloatingNeonCredits` as a clean wrapper or deprecation shim redirecting maneuver calls to `showTacticalXP`.
   - *Rationale*: CSS Flexbox flow mathematically prevents text overlap regardless of how many parries/ricochets trigger in the same frame, and clears the center reticle completely.
4. **Hardcore Swarm Metric Separation (`stats.hardcoreSwarmHighestWave`)**
   - *Choice*: Track Hardcore Swarm peak waves separately in `stats.hardcoreSwarmHighestWave` alongside `stats.swarmHighestWave` so Standard Wave 15 does not falsely unlock `ach_swarm_survivor` (`Void Core`).
   - *Rationale*: Separates the Standard AC farming loop from the Hardcore Spark/prestige track.
5. **Session-Scoped `sessionTiersCleared` for AI Practice (`duel_ai`)**
   - *Choice*: Track `state.sessionTiersCleared` from `0` on `startMode('duel_ai')`, `REMATCH TIER N`, and `RESTART TIER 1`. Award `0 AC + 25 XP` (0 cleared), `25 AC + 80 XP` per tier (Tiers 1–5), or `35 AC + 100 XP` per tier (Tier 6+) once when the player is fractured (`showGameOver`) or exits (`teardownActiveMatch` / return to menu), resetting `sessionTiersCleared = 0` immediately upon settlement to prevent double-payouts.
   - *Rationale*: Honors player progress when practicing or exiting voluntarily while eliminating mid-run quit/rematch farming.

## Risks / Trade-offs

- **Existing unit tests assert legacy `Bits` strings or `8,800` catalog / `50 Bits` duel values** → Update `test/economy.test.js`, `test/armory.test.js`, `test/achievements.test.js`, `test/campaign.test.js`, and `test/gameplay.test.js` alongside code edits in each task group.
- **Veteran players with existing `ach_grid_one_master` unlocks** → Keep already-recorded entries in `achievements` intact on boot reconciliation without revoking unlocked `chassis_arbiter` items, while gating new unlocks behind full Sectors 1–4 mastery.
- **Early exit from AI Practice triggering double settlement** → Guard settlement with an atomic `settled` check (`if (state.gameMode === 'duel_ai' && !state.aiPracticeSettled)`).

## Migration Plan

1. Initialize `stats.hardcoreSwarmHighestWave: 0` in `schema.js` defaults and `StorageManager` normalizer (`max(Local, Cloud)` in `CloudSyncResolver.js`).
2. Add `sparks` helpers to `EconomyManager` reading/writing `player.currency.sparks` cleanly.
3. Roll out updated catalog prices, bridges, HUD log, and test suites on branch `change/economy-rebalance-and-hud`.
