# Proposal

## Why

Player progression and economy telemetry currently suffer from severe reward inflation and compressed cosmetic pricing: the entire Armory catalog costs only 8,800 Bits while a single 2-minute duel pays 150–250 Bits from uncapped in-combat maneuver cash drops, allowing players to unlock every cosmetic in under an hour. Rebalancing inflows, expanding catalog prices, unifying currency terminology on **Arc Credits (AC)** and **Sparks**, replacing *"De-allocation/Derez"* with **Fracture**, and moving maneuver rewards to XP-only in a collision-free top-left HUD log establishes a rewarding, long-term progression curve.

## What Changes

- **Currency & Lore Unification**: Purge all legacy "Bits" references from UI, HUD, catalog labels, and economy bridges in favor of **Arc Credits (AC)**; activate **Sparks** as the scarce prestige currency in `EconomyManager` (with debug suite support); replace opponent takedown terminology (*De-allocation / Derez*) with **Fracture**.
- **Catalog Pricing Rebalance (**BREAKING** price scale)**: Expand purchasable Armory costs (~7.1x total from 8,800 to 62,200 AC across tiers), remove `disc_hex_dark_matter` from 0-cost and `disc_shuriken_void` from achievement unlock, and tag both as Sparks-exclusive Vault items (`75` and `100` Sparks).
- **XP-Only Combat Maneuvers & Top-Left HUD Log**: Shift in-combat skill maneuvers to award XP only (`40 XP` Parry, `30 XP + 10 XP/extra bank` Multi-Ricochet, `25 XP` Curve Fracture) and replace center-screen floating `+Credits` popups with a stacked, collision-free Flexbox telemetry queue in `#tl`.
- **Mode & Milestone Payout Rebalance**:
  - **AI Practice (`duel_ai`)**: Replace per-tier mid-run payouts with a session-end payout on defeat or exit scaled by `sessionTiersCleared` (`0 AC + 25 XP` at 0 tiers; `25 AC + 80 XP`/tier for Tiers 1–5; `35 AC + 100 XP`/tier for Tier 6+).
  - **Arc League Ranked (`multiplayer`)**: Set victory to `120 AC + 300 XP` and defeat participation to `15 AC + 80 XP`.
  - **Swarm Protocol**: Set Standard Swarm to `5 AC / 20 XP` base/wave with `+10%` streak scaling capped at `2.5x` from Wave 15+ and `tier * 50 AC / tier * 150 XP` 5-wave chests; define Hardcore Swarm as `0 AC / 65 XP` base/wave (scaled to `2.5x` at Wave 15) plus Sparks milestones (`1 / 2 / 3` Sparks at Waves 5/10/15, then every 10 waves from Wave 20+ awarding `+5` Sparks and `+1000` XP over the prior milestone: `5, 10, 15...` Sparks).
  - **Federation Tour (Campaign)**: Add progressive first-time 3-star Arbiter Spark grants (`1 / 2 / 3 / 4` Sparks across Sectors 1–4 = 10 Sparks total).
  - **Level Milestones**: Lower unlisted in-between levels from `50` to `25 AC`, Lv 5 to `150 AC`, and add Spark grants on major milestones (`Lv 10/15/20/25/50/100`).
  - **Achievements**: Update rewards and conditions (`ach_first_blood` 100 AC, `ach_parry_king` 500 AC, `ach_curve_god` 300 AC, `ach_untouchable` 250 AC, `ach_swarm_survivor` Hardcore Wave 15 pass -> 750 AC + `disc_corrupted_void`, `ach_grid_one_master` -> full mastery across Sectors 1–4 -> 2,500 AC + 5 Sparks + `chassis_arbiter`).

## Capabilities

### New Capabilities
- *(None — extends and rebalances existing economy, armory, mode, achievement, campaign, and HUD capabilities)*

### Modified Capabilities
- `core-economy`: Unify Arc Credits terminology, add atomic Sparks balance/spend/award transactions and debug hooks, adjust level milestone payouts (`25 AC` unlisted fallback, milestone Sparks), and convert combat maneuver telemetry from currency to XP-only top-left feed.
- `armory-catalog`: Purge Bits labels in UI/validation wording, apply rebalanced 62,200 AC tiered catalog pricing, and mark `disc_hex_dark_matter` (75 Sparks) and `disc_shuriken_void` (100 Sparks) as Sparks-gated prestige items.
- `game-modes`: Convert AI Practice (`duel_ai`) to session-end `sessionTiersCleared` payouts, rebalance Ranked PvP payouts, and separate Standard Swarm AC/XP (2.5x cap at W15) from Hardcore Swarm Spark/XP milestone rewards.
- `campaign-progression`: Unify Arc Credits / Fracture copy, move combat accrual feedback out of center-screen `+Bits`, and grant progressive `1/2/3/4` Sparks on first-time 3-star Sector Arbiter clears.
- `achievement-engine`: Replace De-allocation/Derez wording with Fracture, rebalance AC payouts, require Hardcore Wave 15 for `ach_swarm_survivor`, and expand `ach_grid_one_master` to full Sectors 1–4 mastery.
- `combat-hud`: Add a non-overlapping Flexbox tactical XP telemetry queue inside `#tl` and remove center-screen combat maneuver currency popups.

## Impact

- `src/core/economy/EconomyManager.js`, `src/core/storage/schema.js`, `src/core/storage/StorageManager.js`
- `src/armory/ArmoryCatalog.js`, `src/armory/ArmoryManager.js`, `src/ui/modals/ArmoryModal.js`
- `src/modes/DuelEconomyBridge.js`, `src/modes/SwarmEconomyBridge.js`, `src/modes/CalibrationMode.js`, `src/entities/Bot.js`, `src/entities/Player.js`, `src/ui/modals.js`
- `src/campaign/CampaignRegistry.js`, `src/campaign/CampaignManager.js`, `src/ui/campaign/*`
- `src/achievements/AchievementRegistry.js`, `src/achievements/AchievementManager.js`, `src/ui/modals/AchievementsModal.js`
- `src/ui/hud.js`, `index.html`, and economy/armory/campaign/achievement unit tests.
