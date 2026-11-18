# Proposal

## Why

Currently, the Trophy Matrix fails to reward achievements even when a player satisfies all milestone requirements. This failure stems from `StorageManager.get('', {})` returning an empty dictionary rather than the root storage state when queried with an empty path, causing telemetry evaluation in `AchievementManager` to evaluate all criteria against `{}`.

Furthermore, auto-granting rewards with sliding neon toasts and audio fanfares during high-speed disc matches introduces visual clutter and distracts players during critical combat maneuvers. Players need a focused, distraction-free combat experience paired with an intentional, diegetic claim flow in the Main Menu and Program Hub, featuring interactive reward claims and subtle neon notification pips.

## What Changes

- **Root State Query Support**: Update `StorageManager.get` to return `deepClone(this.state)` when path is empty (`''`, `null`, `undefined`, or `'*'`), unblocking accurate telemetry reads for the achievement engine.
- **Batch & Cloud Mutation Handling**: Expand `AchievementManager._onStorageMutated` to process wildcard mutations (`path === '*'`), ensuring cloud sync and profile imports evaluate pending milestones.
- **Three-Tier Achievement Lifecycle**: Transition achievement states from binary locked/unlocked to `LOCKED` (criteria unmet), `CLAIMABLE` (criteria met, reward uncollected), and `CLAIMED` (reward granted and recorded).
- **Distraction-Free Combat**: Suppress mid-combat toast popups and intrusive fanfare during active matches. Telemetry silently increments metrics in the background.
- **Trophy Matrix Reward Claiming**:
  - Render an interactive, neon-pulsing `[ CLAIM REWARD ]` button on cards for all achievements in the `CLAIMABLE` state.
  - Render a `[ CLAIM ALL REWARDS ]` header button in the Trophy Matrix when two or more achievements are ready to claim.
  - Clicking claim triggers procedural Web Audio synth crystal fanfare, credits Arc Credits via `EconomyManager.awardCredits`, unlocks skins via `ArmoryManager.unlockRewardItem`, and updates the card to `[ UNLOCKED ]`.
- **Sleek Pulsing Notification Pips**:
  - Add a pulsing neon amber/cyan indicator dot (`●`) to the Main Menu Identity Header button (`#manageIdentityBtn` / `#secureIdentityBtn`) when claimable achievements exist.
  - Add a matching neon indicator dot to the Program Hub `TROPHY MATRIX` tab (`#tabHubDirectives`).

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `achievement-engine`: Transition from mid-combat auto-granting to a distraction-free claim flow with interactive card claims, a batch `[ CLAIM ALL REWARDS ]` control, and active reconciliation on modal open.
- `user-identity`: Add sleek neon pulsing dot indicators (`●`) to the Main Menu Identity Header and the Program Hub navigation tabs whenever claimable achievement rewards are pending.

## Impact

- **Storage**: `StorageManager.js` `get()` method updated to safely return root state for empty or wildcard paths.
- **Achievement Subsystem**: `AchievementManager.js` updated to track claimable status, handle batch mutations (`path === '*'`), and expose `claimReward(id)` and `claimAll()`.
- **UI & Modals**:
  - `AchievementsModal.js` updated to render `[ CLAIM REWARD ]` buttons, `[ CLAIM ALL REWARDS ]` header button, and handle real-time claim interactions.
  - `authTerminal.js` and `menus.js` updated to render sleek pulsing neon notification dots on the Identity Header and Directives hub tab.
- **Backward Compatibility**: Existing save states with previously unlocked achievements remain marked as claimed/unlocked without requiring re-claims.
