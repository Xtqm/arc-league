# Proposal

## Why

Once the Armory currency faucet is clamped, players need structured short-term and long-term gameplay goals to drive daily retention and provide a reliable, skill-earned source of Arc Credits and scarce Sparks. A dual **Contracts** system—short-lived **Daily Contracts** plus an endless, level-and-completion-gated **Career Contracts** deck—keeps progression continually fresh across every game mode.

## What Changes

- **Daily Contracts (3 Slots, 24h Window)**:
  - Refresh every 24 hours (UTC) with 3 randomized short-session objectives.
  - Each individual Daily Contract awards **250 XP** (0 AC).
  - Completing all 3 Daily Contracts within the 24-hour window awards a **500 AC** Daily Sweep bonus (0 Sparks).
- **Career Contracts (Endless Tiered Deck, 3 Focus Slots)**:
  - Locked until the player achieves **Player Level 5 AND Swarm Wave 5**.
  - Three simultaneous slots with distinct gameplay focuses: **Combat Precision** (parries, ricochets, curve fractures), **Swarm & Tour** (Swarm waves, Hardcore milestones, Federation Tour clears), and **Duel Competitive** (AI Practice tiers, Ranked wins, Apex Trials runs).
  - Uses a **shuffle-bag deck** per tier and focus bucket so completed contracts immediately draw a fresh contract without repeats until that bucket is exhausted.
  - Organized into **5 Progression Tiers** (`Tier 1: Rookie` through `Tier 5: Apex`) governed by **dual promotion gates** requiring both `N` completed Tier contracts and a target Player Level (`Lv 10`, `Lv 18`, `Lv 28`, `Lv 40`), with Tier 5 looping endlessly.
  - Scarce rewards scale by tier (`300 AC + 1 Spark + 300 XP` in Tier 1 up to `2,500 AC + 5 Sparks + 1,800 XP` in Tier 5).
- **Contracts UI & Persistence**: Implement the `CONTRACTS` modal accessible from the main menu utility dock with notification pip badges for claimable contracts, plus persistent state and cloud merge support in `StorageManager`.

## Capabilities

### New Capabilities
- `contracts-engine`: Authoritative Daily Contracts scheduler/tracker, 3-focus-slot Career Contracts endless tiered shuffle-bag deck, dual level+completion promotion gates, telemetry listeners, reward claiming, and Contracts modal UI.

### Modified Capabilities
- `core-storage`: Add `contracts` persistence branch (daily slots/reset timestamp, career unlock status, active tier, tier completion counts, shuffle-bag drawn history, and slot progress) with default schema, migrations, and cloud sync resolution.
- `main-menu`: Wire the `CONTRACTS` utility dock button to open the Contracts modal and display a claimable-reward notification pip.

## Impact

- New modules under `src/contracts/` (`ContractRegistry.js`, `ContractManager.js`) and `src/ui/modals/ContractsModal.js`
- `src/core/storage/schema.js`, `src/core/storage/StorageManager.js`, `src/core/storage/CloudSyncResolver.js`
- `src/ui/menus.js`, combat/mode telemetry emitters (`Bot.js`, `DuelEconomyBridge.js`, `SwarmEconomyBridge.js`, `CampaignManager.js`)
- New unit/integration tests under `test/`.
