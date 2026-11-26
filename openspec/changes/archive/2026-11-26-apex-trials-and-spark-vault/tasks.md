# Tasks

## 1. Storage Schema & Armory Vault Gating

- [x] 1.1 Create branch `change/apex-trials-and-spark-vault` from `main` and verify active branch is `change/apex-trials-and-spark-vault`
- [x] 1.2 Add `apexTrials` (`cycles` map tracking `freeTicketUsed`, `attempts`, `bestAR`, `claimed`) and `player.titles` / `player.equippedTitle` to `src/core/storage/schema.js`, `src/core/storage/StorageManager.js`, and `src/core/storage/CloudSyncResolver.js`; verify via `npm run test:storage`
- [x] 1.3 Update `src/armory/ArmoryManager.js` and `src/ui/modals/ArmoryModal.js` so `UNLOCK_TYPES.SPARKS` items cannot be purchased directly outside the active Spark Vault rotation and display `[ APEX VAULT // {cost} SPARKS ]` when unowned; verify via `npm run test:armory`

## 2. Apex Trials Engine & Mutator Gameplay

- [x] 2.1 Implement `src/events/ApexTrialRegistry.js` defining sporadic 3–7 day event templates, mutator presets, AR scoring weights, percentile bracket payout tiers (`Top 1%`: `25 Sparks + 3,000 AC + Title`, `Top 10%`: `12 Sparks + 1,500 AC`, `Top 25%`: `6 Sparks + 750 AC`, `Participant`: `1 Spark + 250 AC + 500 XP`), and Vault rotation catalog metadata; verify via unit tests
- [x] 2.2 Implement `src/events/ApexTrialManager.js` handling active/intermission window resolution, 1 free ticket vs. `2 Sparks` `EconomyManager.spendSparks` entry checks, Apex Rating (AR) calculation, hybrid online/offline leaderboard classification, and idempotent cycle payout claiming; verify via `node test/runner.js events`
- [x] 2.3 Wire `gameMode = 'apex_trial'` and `state.activeTrialMutators` into `src/core/main.js`, `src/entities/Bot.js`, `src/entities/Disc.js`, and `src/entities/Player.js`, ensuring clean teardown and run settlement on completion/fracture; verify via `npm run test:gameplay`

## 3. Weekly Spark Vault & UI Modal

- [x] 3.1 Implement `src/events/SparkVaultManager.js` providing deterministic weekly UTC rotation of 1–3 `UNLOCK_TYPES.SPARKS` items (allowing repeat appearances across weeks, including `disc_hex_dark_matter` at 75 Sparks and `disc_shuriken_void` at 100 Sparks) and atomic purchase via `EconomyManager.spendSparks` + `ArmoryManager.unlockRewardItem`; verify via unit tests
- [x] 3.2 Implement `src/ui/modals/ApexTrialsModal.js` with Event Overview/Leaderboard tab (mutators, countdown, Free Ticket / `2 SPARKS` launch button, AR standings, cycle claim action) and Spark Vault tab (1–3 weekly items, rotation timer, Spark purchase button), and wire `#apexTrialsBtn` in `src/ui/menus.js` + Title selector in `src/ui/authTerminal.js`; verify modal navigation and purchases

## 4. Full Verification

- [x] 4.1 Add unit/integration tests for sporadic scheduling, free ticket + 2-Spark re-entry, AR calculation, Top 1%/10%/25%/Participant payouts, weekly 1–3 item Vault rotation, and Vault purchase gating, then run `npm test` confirming all suites pass
