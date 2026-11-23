# Tasks

## 1. Pointer Lock Release on Elimination

- [x] 1.1 In `src/entities/Player.js` (inside `hp <= 0` and void fall handling), invoke `document.exitPointerLock()` and `setCursor()` across all game modes; verify unit test confirms pointer lock release on defeat
- [x] 1.2 In `src/ui/modals.js` (`showGameOver()`), defensively invoke `document.exitPointerLock()` and `setCursor()`; verify cursor is visible when Game Over card appears
- [x] 1.3 In `src/input/mouse.js`, prevent canvas click `tryLock()` from re-trapping cursor while `!state.player.alive` or Game Over overlay is displayed; verify clicking on death screen does not capture pointer

## 2. Decoupled Escape Routing and Fullscreen Exit

- [x] 2.1 Refactor Escape key routing in `src/input/keyboard.js` into a state machine that evaluates pointer lock and fullscreen state independently of `state.running`; verify single Escape tap exits fullscreen when pointer is already unlocked
- [x] 2.2 Wire dismissal of `achievementsModal` and `trialDebriefModal` into Escape key handler; verify Escape cleanly closes open modal dialogs before triggering root exit

## 3. Verification and Regression Testing

- [x] 3.1 Implement automated tests in `test/game_over_escape_remediation.test.js` validating pointer release on defeat, single-tap fullscreen exit on Game Over / Pause Menu, and modal dismissal
- [x] 3.2 Run the full test suite (`node test/runner.js`) to verify all existing and new test suites pass with zero regressions
