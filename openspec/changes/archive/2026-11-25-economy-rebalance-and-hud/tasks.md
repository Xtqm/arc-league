# Tasks

## 1. Core Economy & Sparks Engine

- [x] 1.1 Create branch `change/economy-rebalance-and-hud` from `main` and verify `git branch --show-current` outputs `change/economy-rebalance-and-hud`
- [x] 1.2 Add `getSparks()`, `canAffordSparks(cost)`, `awardSparks(amount, source)`, `spendSparks(cost, category, itemId)`, and `window.gameDebug.addSparks` in `src/core/economy/EconomyManager.js` (emitting `SPARKS_EARNED` / `SPARKS_SPENT`), and verify unit tests for atomic Sparks validation and balance mutation pass via `npm run test:economy`
- [x] 1.3 Update `MILESTONE_REWARDS` and unlisted level fallback in `src/core/economy/EconomyManager.js` (unlisted levels: `25 AC`; Lv 2–4: `50 AC`; Lv 5: `150 AC`; Lv 10: `350 AC + 1 Spark`; Lv 15: `600 AC + 2 Sparks`; Lv 20: `1,000 AC + 3 Sparks`; Lv 25: `1,500 AC + 5 Sparks`; Lv 50: `4,000 AC + 10 Sparks`; Lv 100: `10,000 AC + 25 Sparks`) and verify `npm run test:economy` passes
- [x] 1.4 Add `stats.hardcoreSwarmHighestWave` default (`0`) and monotonic merge support in `src/core/storage/schema.js`, `src/core/storage/StorageManager.js`, and `src/core/storage/CloudSyncResolver.js`, and verify `npm run test:storage` passes

## 2. Armory Catalog Pricing & Currency Unification

- [x] 2.1 Update `src/armory/ArmoryCatalog.js` costs to the 62,200 AC curve (`disc_neon_amber`: 1200, `disc_retro_green`: 2000, `disc_plasma_violet`: 3500, `disc_delta_triad`: 5500, `disc_quantum_quad`: 8000, `chassis_infiltrator`: 2500, `chassis_iso_guardian`: 5000, `chassis_black_guard`: 9500, `arena_zero_g_nexus`: 10000, `arena_derez_chasm`: 15000) and set `disc_hex_dark_matter` (`cost: 75`, `unlockType: 'sparks'`) and `disc_shuriken_void` (`cost: 100`, `unlockType: 'sparks'`, `achievementId: null`), verifying catalog validation via `npm run test:armory`
- [x] 2.2 Update `src/armory/ArmoryManager.js` and `src/ui/modals/ArmoryModal.js` to handle `UNLOCK_TYPES.SPARKS` purchases via `EconomyManager.spendSparks` and replace all `BITS` / `CR` UI strings with `AC` / `Sparks`, verifying purchase & UI tests pass via `npm run test:armory`

## 3. Combat Maneuver XP & Top-Left Tactical HUD Log

- [x] 3.1 Update `src/modes/DuelEconomyBridge.js` so `rewardParry` (40 XP), `rewardRicochetHit` (`30 + (bounces - 2) * 10` XP), and `rewardCurveElimination` (25 XP) award 0 Arc Credits and emit top-left tactical XP HUD events, verifying via `npm run test:economy`
- [x] 3.2 Implement the stacked CSS Flexbox tactical XP log inside `#tl` in `index.html` and `src/ui/hud.js` (`gap: 6px`, max 4 visible entries, 2.0s auto-decay, zero text overlap), and deprecate center-screen `+Credits` floats on maneuvers; verify HUD visibility and non-overlap in headless/unit checks via `npm run test:gameplay`

## 4. Mode Payouts, Campaign Sparks & Achievements

- [x] 4.1 Refactor AI Practice (`duel_ai`) in `src/entities/Bot.js`, `src/entities/Player.js`, `src/modes/DuelEconomyBridge.js`, `src/ui/modals.js`, and `src/ui/menus.js` to track `state.sessionTiersCleared` and settle payouts strictly on defeat or exit (`0 AC + 25 XP` at 0 tiers; `25 AC + 80 XP`/tier for Tiers 1–5; `35 AC + 100 XP`/tier for Tier 6+) without double-payouts, plus Ranked PvP payouts (`120 AC + 300 XP` win, `15 AC + 80 XP` defeat); verify via `npm run test:gameplay`
- [x] 4.2 Update `src/modes/SwarmEconomyBridge.js` for Standard Swarm (`5 AC / 20 XP` base, `+10%` streak capped at `2.5x` from Wave 15+, `tier * 50 AC / tier * 150 XP` chests) and Hardcore Swarm (`0 AC / 65 XP` base capped at `2.5x` at W15, `1/2/3` Sparks + `200/400/600` XP at W5/10/15, `5 * ((w/10)-1)` Sparks & `1000 * ((w/10)-1)` XP at W20/30+ every 10 waves, recording `stats.hardcoreSwarmHighestWave`), and verify via `npm run test:economy`
- [x] 4.3 Update `src/campaign/CampaignRegistry.js`, `src/campaign/CampaignManager.js`, `src/modes/CalibrationMode.js`, and `src/ui/campaign/*` to purge "Bits" UI labels to "Arc Credits" / "AC", adjust repeat clears (20–75 AC), and award `1 / 2 / 3 / 4` Sparks on first-time 3-star Arbiter clears for Sectors 1–4; verify via `npm run test:campaign`
- [x] 4.4 Update `src/achievements/AchievementRegistry.js`, `src/achievements/AchievementManager.js`, and `src/ui/modals/AchievementsModal.js` with `Fracture` terminology, updated AC/Sparks rewards (`ach_first_blood` 100 AC, `ach_parry_king` 500 AC, `ach_curve_god` 300 AC, `ach_untouchable` 250 AC, `ach_swarm_survivor` Hardcore Wave 15 -> 750 AC + `disc_corrupted_void`, `ach_grid_one_master` full mastery of all stars across Sectors 1–4 -> 2,500 AC + 5 Sparks + `chassis_arbiter`), and verify via `npm run test:achievements`

## 5. Full Regression Verification

- [x] 5.1 Run the full test suite (`npm test`) on branch `change/economy-rebalance-and-hud` and confirm all suites pass with zero failures
