# Design

## Context

See `proposal.md` for background and problem statement. In Tron Disc Arena, `StorageManager` serves as the authoritative single source of truth for persistent player state, telemetry metrics, and economy balances. `AchievementManager` monitors storage mutations and evaluates criteria for the 6 launch achievements defined in `AchievementRegistry.js`. 

Currently, `StorageManager.get` fails on empty string paths, blocking all metric queries by returning `{}`. In addition, auto-granting rewards mid-match interrupts intense combat. This design outlines how the storage query fix, three-tier achievement lifecycle, distraction-free combat telemetry, interactive reward claim pipeline, and neon UI indicators are implemented.

## Goals / Non-Goals

**Goals:**
- Fix `StorageManager.get(path, defaultValue)` to return deep-cloned root state when `path` is empty (`''`, `null`, `undefined`, or `'*'`), unblocking telemetry evaluation.
- Expand `AchievementManager._onStorageMutated` to handle batch/cloud mutations (`path === '*'`).
- Establish a 3-tier lifecycle for achievements: `LOCKED`, `CLAIMABLE`, and `CLAIMED`.
- Suppress mid-combat HUD toasts and fanfares so matches remain immersive and distraction-free.
- Add `claimReward(achievementId)` and `claimAllRewards()` methods to `AchievementManager` that dispense Arc Credits, cosmetics, play crystal synth fanfare, and persist unlock records.
- Update `AchievementsModal` to render interactive `[ CLAIM REWARD ]` buttons on claimable cards and a `[ CLAIM ALL REWARDS ]` button in the header when multiple milestones are ready.
- Render sleek neon pulsing dot indicators (`●`) on the Main Menu Identity Header and the Program Hub `TROPHY MATRIX` tab when claimable achievements exist.
- Ensure 100% backward compatibility with existing player save states.

**Non-Goals:**
- Creating new achievements beyond the 6 launch milestones.
- Changing cosmetic item definitions, prices, or armory rendering logic.
- Adding multiplayer-exclusive achievement wagering or trading.

## Decisions

### Decision 1: Root State Access in StorageManager
- **Choice**: Enhance `StorageManager.get(path, defaultValue)` so that if `path === '' || path === '*' || path === undefined || path === null`, it returns `this.state ? deepClone(this.state) : defaultValue`. Additionally, use `this.storage.get('', {}) || this.storage.state || {}` defensively in `AchievementManager`.
- **Rationale**: Fixes the root query for all existing callers without introducing breaking API changes or needing schema alterations.
- **Alternatives Considered**:
  - Adding a separate `getState()` method: Rejected as sole solution because existing code and tests already use `get('', {})`.

### Decision 2: In-Memory Claimable Derivation vs Storage Schema Mutation
- **Choice**: Keep the persistent storage schema unchanged (`achievements` array stores unlocked/claimed records). An achievement is dynamically computed as:
  - `CLAIMED`: `this.isUnlocked(ach.id) === true`
  - `CLAIMABLE`: `!this.isUnlocked(ach.id) && ach.evaluate(fullState).satisfied === true`
  - `LOCKED`: `!this.isUnlocked(ach.id) && !ach.evaluate(fullState).satisfied`
- **Rationale**: Clean, zero-migration design. Existing save states with unlocked achievements seamlessly map to `CLAIMED`, while veteran players with satisfied criteria will immediately see them as `CLAIMABLE` upon boot.
- **Alternatives Considered**:
  - Adding a new `claimableAchievements` array in persistent storage: Rejected due to unnecessary schema migrations and synchronization overhead.

### Decision 3: Distraction-Free Combat Telemetry
- **Choice**: During active matches, telemetry (`stats.*`, `campaign.*`) mutates normally, but `AchievementManager` does NOT trigger `onUnlockToast` or procedural audio during gameplay.
- **Rationale**: Prevents screen obstruction and auditory distraction during high-speed disc dodging, curving, and parrying. Players are signaled via the Main Menu indicator once combat finishes.
- **Alternatives Considered**:
  - Mini non-blocking HUD icon during combat: Rejected based on user preference to prevent match distractions entirely.

### Decision 4: Sleek Neon Pulsing Dot Indicator (`●`)
- **Choice**: Create a CSS class `.neon-pip-dot` with a radial gradient glow and subtle pulsating animation (`0 0 6px #ffaa00, 0 0 12px #ffaa00`). Append this element to `#manageIdentityBtn` / `#secureIdentityBtn` in `authTerminal.js` / `menus.js` and to `#tabHubDirectives` in the Program Hub.
- **Rationale**: Sleek, cyberpunk aesthetic that provides an unobtrusive visual cue without disrupting typography or layout dimensions.
- **Alternatives Considered**:
  - Numeric badge count `(1)`: Rejected per user request in favor of a sleek neon pulsing dot.

### Decision 5: Atomic Individual & Batch Claiming
- **Choice**: Implement `claimReward(achievementId)` and `claimAllRewards()` in `AchievementManager`.
  - For each claimed achievement, dispense Arc Credits (`EconomyManager.awardCredits`), grant cosmetic skins (`ArmoryManager.unlockRewardItem`), and append the unlock record to storage with `{ immediate: true }`.
  - Play `playAchievementFanfare()` once per claim action (or once at the end of a batch claim).
  - Emit `ACHIEVEMENT_UNLOCKED` and update DOM elements reactively.
- **Rationale**: Guarantees atomic transaction boundaries and provides immediate tactile feedback.

## Risks / Trade-offs

- **[Risk]**: Rapid multiple clicks on `[ CLAIM REWARD ]` or `[ CLAIM ALL REWARDS ]`.
  - **Mitigation**: Disable buttons immediately upon click and guard `claimReward` against already-unlocked achievements.
- **[Risk]**: Cloud sync merging could overwrite claim states.
  - **Mitigation**: `CloudSyncResolver.js` already guarantees union merging for the `achievements` array (`Local ∪ Cloud`), ensuring claimed achievements are never revoked.
- **[Risk]**: Web Audio context suspended prior to user interaction.
  - **Mitigation**: Claim actions are direct user clicks (`pointerdown` / `click`), which naturally satisfy browser user-gesture requirements to resume the AudioContext.
