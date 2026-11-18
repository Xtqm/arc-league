# Tasks

## 1. Native Desktop Auth Session IPC

- [x] 1.1 Implement `desktop:load-auth-session`, `desktop:save-auth-session`, and `desktop:clear-auth-session` IPC handlers in `desktop/main.cjs` for `userData/saves/auth_session.json` and verify atomic file creation and cleanup.
- [x] 1.2 Expose `loadAuthSession()`, `saveAuthSession()`, and `clearAuthSession()` on `window.electronDesktop` in `desktop/preload.cjs` and verify bridge API availability in the renderer.

## 2. Auth Provider Session Persistence

- [x] 2.1 Update `MockAuthProvider.js` `init()` to correctly restore `isAnonymous` and `providerId` from stored credentials (eliminating the hardcoded `isAnonymous: true`), wire desktop auth session IPC persistence, and verify with updated tests in `test/auth/auth_mock_provider.test.js`.
- [x] 2.2 Update `SupabaseAuthProvider.js` and `InMemorySupabaseAuth` to check and persist desktop auth sessions via `electronDesktop`, preventing premature fallback to `signInGuest()`, and verify with `test/auth/supabase_auth_provider.test.js`.

## 3. AuthManager & Storage Coordination

- [x] 3.1 Update `AuthManager.js` `init()` to coordinate desktop session loading prior to default guest initialization, and guard `_applyUser()` against overwriting existing authenticated player callsigns in `StorageManager`.
- [x] 3.2 Update `AuthManager.signOut()` to invoke `electronDesktop.clearAuthSession()` on desktop, ensuring clean session termination and graceful transition to a fresh guest subroutine.

## 4. Integration Verification

- [x] 4.1 Add an integration test in `test/auth/` verifying that after federated or credential sign-in, closing/re-initializing the auth engine in desktop mode retains authenticated status (`isAnonymous: false`), callsign, and level tier without resetting to guest.
- [x] 4.2 Run test suites (`npm run test:auth`, `npm run test:storage`, `npm test`) and verify all unit and integration tests pass cleanly.

## Workflow follow-up

- Create and switch to `change/persist-desktop-auth-session` git branch before modifying code.
- Archive the change after implementation and verification are complete.
