# Tasks

## 1. Decommission 3D Playable Lobby & Obsolete Core Settings

- [x] 1.1 Remove or archive `src/ui/lobbyCores.js` and purge all `lobbyCoresManager` imports and call sites from `src/ui/menus.js`, `src/core/main.js`, and `src/ui/hud.js`. Verify with `node -c src/ui/menus.js` and syntax checks.
- [x] 1.2 Deprecate `#overlay.lobby-3d` CSS class and pointer-event override rules in `index.html`. Verify `#overlay` remains interactable and does not block cursor interactions.
- [x] 1.3 Remove `coreLaunchConfirmation` preference controls from `src/ui/modals/SettingsModal.js` and verify settings modal renders cleanly without reference errors.

## 2. Dedicated Directives & Controls Modal

- [x] 2.1 Implement the `#directivesModal` dialog displaying dedicated desktop keyboard keybindings and mobile touch gesture diagrams, accessible via `[?] DIRECTIVES & CONTROLS` button and `?` keyboard shortcut. Verify modal opens and renders both desktop and mobile control schemes.
- [x] 2.2 Wire click-outside, close button, and Escape key dismissal for `#directivesModal`. Verify modal closes cleanly and restores focus to the main menu.

## 3. Left-Aligned Tactical Rail Menu Interface

- [x] 3.1 Refactor `getMainMenuHtml()` in `src/ui/menus.js` to render the Left-Aligned Tactical Rail (`#mainMenu.tactical-rail`), containing canonical Arc League branding, user identity status, primary mode buttons (`#campaignBtn`, `#swarmBtn`, `#practiceBtn`, `#quickMatchBtn`, `#hostMatchBtn`, `#joinOnlineBtn`), and secondary utility dock. Verify all required button IDs are present.
- [x] 3.2 Add tactical rail styling to `index.html` with dark glass gradient backdrop, neon cyan borders, and responsive breakpoints (`@media (max-width: 768px)`). Verify layout renders above the fold on desktop without vertical scrollbars.
- [x] 3.3 Connect secondary utility dock buttons to open Outfitting (`armoryModal`), Trophy Matrix (`achievementsModal`), Settings (`settingsModal`), and Directives (`directivesModal`). Verify clicking each dock button opens its respective modal overlay.

## 4. Ambient 3D Staging Presentation

- [x] 4.1 Update menu state initialization in `src/ui/menus.js` and `src/core/main.js` so `state.gameMode = 'lobby'` renders the illuminated arena floor with idle camera perspective and a turntable Identity Disc model, while disabling player locomotion (WASD) and click-to-throw mechanics. Verify 3D canvas renders in the background while UI retains mouse focus.
- [x] 4.2 Verify seamless transition from ambient staging camera to active gameplay camera upon mode launch across all game modes (`campaign`, `swarm`, `duel_ai`, multiplayer). Verify camera resets to player spawn coordinates without orientation glitches.

## 5. Verification & Test Parity

- [x] 5.1 Update `test/modes/decoupled_match_entry.test.js` and related menu tests to validate tactical rail button interactions and instantaneous mode launching. Verify `node test/modes/decoupled_match_entry.test.js` passes 100%.
- [x] 5.2 Execute the full regression test suite with `node test/runner.js`. Verify all tests pass with zero failures.

## Workflow follow-up

- Archive the change after implementation and verification are complete.
- Verify delta specs sync cleanly to main specs during archive.
