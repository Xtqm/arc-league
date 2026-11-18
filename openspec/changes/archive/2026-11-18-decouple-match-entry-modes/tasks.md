# Tasks: Decouple Match Entry Modes and Warm-Up Queue

## 1. Main Menu HTML and Modal Layout Restructuring

- [x] 1.1 Update `getMainMenuHtml()` in `src/ui/menus.js` to place `#quickMatchBtn` and `#practiceBtn` directly inside `#mainMenuButtons`, with `#hostMatchBtn` and `#joinOnlineBtn` organized into a side-by-side friendly duel container. Verify via DOM evaluation that all 4 buttons are present on `#overlay`.
- [x] 1.2 Refactor `#hostModal` in `index.html` to clearly represent Friendly Custom Room Setup (with arena sector selector, series selector, `#host1v1Btn`, `#host2v2Btn`, `#cancelHostBtn`, and a backward-compatible `#practiceBtn` alias). Verify modal markup parses cleanly.

## 2. UI Event Binding and Mode Dispatch Decoupling

- [x] 2.1 Update `bindMainMenuEvents()` in `src/ui/menus.js` to attach direct click handlers for `#quickMatchBtn` (invoking `startMatchmakingWithWarmup()`) and `#practiceBtn` (invoking `startSoloDuel()`), while preserving `#hostMatchBtn` and `#joinOnlineBtn` flows. Verify with unit tests that clicking buttons invokes the correct start methods.
- [x] 2.2 Update the `duels` Energy Core handler in `src/ui/lobbyCores.js` to support decoupled quick match and friendly duel launching. Verify that hitting the core initiates the desired modal or match transition.

## 3. Test Suites and End-to-End Verification

- [x] 3.1 Create a dedicated test suite `test/gameplay/decoupled_match_entry.test.js` testing that: (a) clicking `#quickMatchBtn` starts warm-up queue with `#matchmakingQueueHUD`, (b) clicking `#practiceBtn` directly starts offline `duel_ai` with no queue HUD or signaling, and (c) clicking `#host1v1Btn` inside `#hostModal` creates a room code with no warm-up bot. Verify the test suite passes 100%.
- [x] 3.2 Run existing regression suites `test/gameplay/unified_flow.test.js`, `test/gameplay/fullscreen_mode.test.js`, `test/gameplay/mobile_modal_scrolling.test.js`, and `test/gameplay/rematch.test.js` and verify zero test regressions.

## Workflow follow-up

- Review and apply changes on git branch `change/decouple-match-entry-modes`.
- Run full automated test suite to ensure system-wide stability.
