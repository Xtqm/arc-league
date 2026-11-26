# Tasks

## 1. Storage Schema & Cloud Sync

- [x] 1.1 Create branch `change/contracts-system` from `main` and verify active branch is `change/contracts-system`
- [x] 1.2 Add `contracts` schema branch (`daily`, `career`) to `src/core/storage/schema.js`, validation/migration defaults in `src/core/storage/StorageManager.js`, and monotonic/date-aware merge rules in `src/core/storage/CloudSyncResolver.js`; verify via `npm run test:storage`

## 2. Contract Registry & Deck Engine

- [x] 2.1 Implement `src/contracts/ContractRegistry.js` defining Daily Contract templates and Career Contract buckets across Tiers 1–5 (`Rookie` through `Apex`) for all 3 focuses (`combat`, `endurance`, `duel`) with tier gates (`Lv 5 + Swarm W5` unlock; promotion gates `6/Lv10`, `9/Lv18`, `12/Lv28`, `15/Lv40`) and reward payloads; verify registry completeness via unit tests
- [x] 2.2 Implement `src/contracts/ContractManager.js` handling UTC 24h Daily reset, 500 AC 3/3 sweep bonus, Career unlock checks, shuffle-bag drawing, dual-gate promotions (non-stalling when quota met before level gate), telemetry event listeners, and atomic claim payouts via `EconomyManager`; verify all edge cases via `node test/runner.js contracts`

## 3. Contracts UI & Main Menu Integration

- [x] 3.1 Implement `src/ui/modals/ContractsModal.js` displaying Daily Contracts (UTC countdown timer, 250 XP badges, 500 AC 3/3 sweep banner) and Career Contracts (locked prerequisite tracker vs. active tier progress bar + 3 focused slot cards with `[ CLAIM ]` actions); verify modal open, claim, and deck deal behavior
- [x] 3.2 Wire `#contractsBtn` in `src/ui/menus.js` to open `ContractsModal` and render a live pulsing notification pip when any Daily, Sweep, or Career reward is claimable; verify pip visibility updates reactively on claim

## 4. Regression & Integration Verification

- [x] 4.1 Add comprehensive unit/integration tests for Daily rotation, sweep bonus, Career unlock gate, shuffle-bag exhaustion, dual-gate promotion, and cloud merge, and run `npm test` confirming zero failures
