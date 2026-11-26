# Proposal

## Why

Sparks need an exciting, repeatable endgame sink that rewards top-tier athletic mastery without introducing gambling or permanent FOMO lockouts. **Apex Trials** provide sporadic, high-intensity competitive events where athletes spend Sparks to chase **Apex Rating (AR)** on a leaderboard for Spark profits and exclusive unbuyable Titles, paired with a weekly rotating **Spark Vault** inside the event panel where prestige cosmetics like the **Dark Matter Disc** (`75 Sparks`) and **Void Shuriken** (`100 Sparks`) can be earned over time.

## What Changes

- **Sporadic Apex Trials (3–7 Day Rotating Events)**:
  - Event calendar/registry defining sporadic 3–7 day trials with unique gameplay mutators (e.g., low-gravity arenas, hyper-velocity discs, hazard storms, boss gauntlets).
  - **Entry Economy**: Each event grants **1 Free Entry Ticket** per cycle; additional score-chasing attempts cost **2 Sparks** per run.
  - **Apex Rating (AR) & Leaderboard**: Run performance computes an **Apex Rating (AR)** submitted to leaderboard standings, culminating in end-of-cycle tier rewards:
    - **Apex Prime (Top 1%)**: `25 Sparks + 3,000 AC + Exclusive Unbuyable Event Title`
    - **Master (Top 10%)**: `12 Sparks + 1,500 AC + Tier Emblem`
    - **Contender (Top 25%)**: `6 Sparks + 750 AC`
    - **Participant (Any AR)**: `1 Spark + 250 AC + 500 XP`
- **Weekly Rotating Spark Vault**:
  - Dedicated Vault tab/section inside the `APEX TRIALS` modal offering **1–3 rotating prestige items per week** (items can reappear in later rotations).
  - Scarce Spark pricing tiers (`40–50 Sparks` Standard Prestige, `75 Sparks` Dark Matter Disc, `100 Sparks` Void Shuriken) purchased atomically via `EconomyManager.spendSparks` and granted via `ArmoryManager`.
- **Persistence & Armory Support**: Extend `TronSaveState` to store active event participation, free ticket consumption, best AR, earned event titles, and claimed cycle payouts, and extend `ArmoryCatalog` / `ArmoryManager` for `sparks` unlock type.

## Capabilities

### New Capabilities
- `apex-trials`: Sporadic 3–7 day competitive event lifecycle, mutator configuration, free-ticket and 2-Spark re-entry flow, Apex Rating (AR) scoring, leaderboard standings, end-of-cycle Spark/Title payouts, and Apex Trials UI modal.
- `spark-vault`: Weekly rotating 1–3 item prestige cosmetic storefront embedded in the Apex Trials interface, deterministic rotation schedule, scarce Spark pricing enforcement, and atomic Spark purchase pipeline.

### Modified Capabilities
- `core-storage`: Add `apexTrials` and `player.titles` persistence fields (active cycle ticket/best AR, claimed cycle payouts, equipped/earned event titles) with schema validation and monotonic cloud sync merge.
- `armory-catalog`: Support `UNLOCK_TYPES.SPARKS` catalog items (`disc_hex_dark_matter`, `disc_shuriken_void`, and future Vault prestige items) acquired strictly through the Spark Vault rather than standard Arc Credit purchase.

## Impact

- New modules under `src/events/` (`ApexTrialRegistry.js`, `ApexTrialManager.js`, `SparkVaultManager.js`) and `src/ui/modals/ApexTrialsModal.js`
- `src/armory/ArmoryCatalog.js`, `src/armory/ArmoryManager.js`, `src/core/storage/schema.js`, `src/core/storage/StorageManager.js`, `src/core/storage/CloudSyncResolver.js`
- `src/core/main.js`, `src/entities/Bot.js`, `src/ui/menus.js`, `src/ui/authTerminal.js` (displaying earned event Titles)
- New unit/integration tests under `test/`.
