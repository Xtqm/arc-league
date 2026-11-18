# Tasks

## 1. Storage Query Fix & Wildcard Mutation Support

- [x] 1.1 Update `StorageManager.get(path, defaultValue)` in `src/core/storage/StorageManager.js` to return `this.state ? deepClone(this.state) : defaultValue` when `path` is empty (`''`, `null`, `undefined`, or `'*'`), and verify via node unit assertion.
- [x] 1.2 Update `AchievementManager.js` to query root state with fallback `this.storage.get('', {}) || this.storage.state || {}` and handle `path === '*'` in `_onStorageMutated`, verifying with node tests.
- [x] 1.3 Add test cases to `test/storage/storage_manager.test.js` verifying that `storageManager.get('')` and `storageManager.get('*')` return cloned root state, and run `node test/runner.js`.

## 2. Three-Tier Achievement Lifecycle & Claim Pipeline

- [x] 2.1 Update `AchievementManager.js` to track `LOCKED`, `CLAIMABLE`, and `CLAIMED` status, exposing `getPendingClaimCount()` and `getClaimableAchievements()`, verifying with node assertions.
- [x] 2.2 Implement `claimReward(achievementId)` and `claimAllRewards()` in `AchievementManager.js` dispensing Arc Credits, cosmetics, Web Audio crystal fanfare, and persisting to storage, verifying with unit tests.
- [x] 2.3 Suppress mid-combat HUD toasts and audio fanfare during active gameplay, ensuring combat remains distraction-free; verify with unit tests.
- [x] 2.4 Update `test/achievements/achievement_manager.test.js` to validate `claimReward`, `claimAllRewards`, pending claim counts, and silent combat evaluation.

## 3. Trophy Matrix UI & Interactive Claim Controls

- [x] 3.1 Update `src/ui/modals/AchievementsModal.js` to evaluate pending criteria upon `show()` and render interactive `[ CLAIM REWARD ]` buttons on claimable achievement cards.
- [x] 3.2 Add a `[ CLAIM ALL REWARDS ]` button in the header of `AchievementsModal.js` when 2 or more achievements are ready to claim, binding to `claimAllRewards()`.
- [x] 3.3 Connect procedural crystal fanfare audio (`playAchievementFanfare()`) and real-time DOM updates transitioning claimed cards to `[ UNLOCKED ]` upon claim.
- [x] 3.4 Update `test/ui/achievements_modal.test.js` to verify `[ CLAIM REWARD ]` and `[ CLAIM ALL REWARDS ]` markup and click bindings.

## 4. Sleek Neon Pulsing Notification Indicators

- [x] 4.1 Define the `.neon-pip-dot` CSS styling and pulsating animation in `index.html` for a sleek glowing amber/cyan indicator dot (`●`).
- [x] 4.2 Update `src/ui/authTerminal.js` (`getIdentityHeaderHtml`, `updateIdentityHeader`) to render `.neon-pip-dot` on the Identity button (`#manageIdentityBtn` / `#secureIdentityBtn`) when pending claims exist.
- [x] 4.3 Update `src/ui/authTerminal.js` to render `.neon-pip-dot` on the Hub `TROPHY MATRIX` tab (`#tabHubDirectives`) when pending claims exist and clear it when claims are redeemed.
- [x] 4.4 Update `test/auth/auth_header.test.js` and `test/auth/auth_terminal_integration.test.js` to verify presence and removal of `.neon-pip-dot` indicators.

## 5. Full Integration & Regression Verification

- [x] 5.1 Run full project test suite (`npm test`) and verify all suites pass cleanly.
