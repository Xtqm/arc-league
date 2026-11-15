# Tasks

## 1. Production Netcode Identity Gating

- [x] 1.1 In `src/network/roomManager.js`, await `authManager.init()` in `onClickCreateRoom` and `onClickConfirmJoin` before `initNetwork()`, verifying syntax and imports.
- [x] 1.2 In `src/network/roomManager.js`, update `getLocalCallsign()` to incorporate `authManager?.storage?.state?.player?.handle` in the identity resolution fallback hierarchy.

## 2. Test Harness Synchronization Hardening

- [x] 2.1 In `test/gameplay/multiplayer.test.js`, add `waitForFunction` polling checks for `!!window.__TRON__?.auth()?._currentUser` on both `hostPage` and `guestPage` before `TEST 1`.
- [x] 2.2 In `test/gameplay/multiplayer.test.js`, update `TEST 1` to await `auth.init()` and call `await auth.updateCallsign('TRON_HOST')` / `await auth.updateCallsign('FLYNN_GUEST')` to persist callsigns through `AuthManager` and `StorageManager`.

## 3. Verification & Validation

- [x] 3.1 Run `node test/runner.js gameplay` and verify all tests in `gameplay/multiplayer.test.js` (including TEST 3B and TEST 8) pass with matching callsigns.
- [x] 3.2 Run `node test/runner.js network` and `node test/runner.js auth` to ensure identity gating causes zero regressions across networking and auth test suites.
