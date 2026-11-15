# Design

## Context

See `proposal.md` for background and motivation.

When launching a multiplayer match (1v1 or 2v2), client identity is established by reading `getLocalCallsign()`, which is broadcast to peers via WebRTC reliable packets (`PLAYER_INFO`) and stored in the room document (`playerNames`).

In headless test environments (such as GitHub Actions Ubuntu runners executing Chromium under SwiftShader), asynchronous boot processes in `AuthManager` (`authManager.init()`) can take longer than the simple synchronous DOM exposure of `window.__dbg`. If `multiplayer.test.js` attempts to mutate `auth._currentUser` before `authManager.init()` resolves, shallow property mutations are skipped or overwritten by newly generated guest credentials (`GUEST_SUBROUTINE_XXXX`).

## Goals / Non-Goals

**Goals:**
- Guarantee that `roomManager.js` never creates or joins a room with an uninitialized or stale auth state.
- Ensure `getLocalCallsign()` checks `StorageManager` as an authoritative fallback alongside `authManager.currentUser`.
- Eliminate the timing race condition in `test/gameplay/multiplayer.test.js` by awaiting auth readiness and using the official `auth.updateCallsign(...)` API.
- Ensure 100% deterministic test execution in CI without changing the expected fixture values (`FLYNN_GUEST` / `TRON_HOST`).

**Non-Goals:**
- Modifying the nameplate renderer (`updateArenaNameplates`), 3D projection math, or HUD element styling.
- Changing WebRTC binary netcode or packet serialization formats.
- Reworking the underlying anonymous guest handle generator format (`GUEST_SUBROUTINE_${shortId}`).

## Decisions

### Decision 1: Await `authManager.init()` in `onClickCreateRoom` and `onClickConfirmJoin`
- **Choice**: In `src/network/roomManager.js`, insert `if (authManager?.init) { await authManager.init(); }` prior to `initNetwork()`.
- **Rationale**: Guarantees that even if a user or script triggers room creation immediately on page load, the local auth identity is fully settled before the room code, document, or signaling channels are opened.
- **Alternatives Considered**:
  - *Gate inside `initNetwork()`*: `initNetwork` is in `firebaseSetup.js`, which is focused on Firebase/mock Firestore connection rather than local identity orchestration. Putting it in `roomManager.js` preserves single responsibility.

### Decision 2: Add `StorageManager` fallback to `getLocalCallsign()`
- **Choice**: Update `getLocalCallsign()` in `src/network/roomManager.js`:
  ```javascript
  export function getLocalCallsign() {
    const handle =
      authManager?.currentUser?.handle ||
      authManager?.saveState?.handle ||
      (authManager?.storage?.state?.player?.handle) ||
      state.currentUser?.handle ||
      'PROGRAM';
    const clean = String(handle).trim().toUpperCase();
    return clean || 'PROGRAM';
  }
  ```
- **Rationale**: Since `StorageManager` acts as the single source of truth across the app, reading `player.handle` from storage ensures consistency if `_currentUser` or `_saveState` are undergoing a background transition.
- **Alternatives Considered**:
  - *Only read `authManager.currentUser`*: Vulnerable if an external event temporarily overrides `state.currentUser` (e.g. Firebase anonymous auth token exchange).

### Decision 3: Deterministic Auth Synchronization in `multiplayer.test.js`
- **Choice**: Mirror the robust pattern used in `rematch.test.js`:
  1. Wait for auth readiness after page load:
     ```javascript
     await hostPage.waitForFunction(() => !!window.__dbg && !!window.__TRON__?.auth()?._currentUser, { polling: 100 });
     await guestPage.waitForFunction(() => !!window.__dbg && !!window.__TRON__?.auth()?._currentUser, { polling: 100 });
     ```
  2. In `TEST 1`, invoke `auth.init()` and `auth.updateCallsign(...)`:
     ```javascript
     await hostPage.evaluate(async () => {
       const auth = window.__TRON__.auth();
       await auth.init();
       await auth.updateCallsign('TRON_HOST');
     });
     await guestPage.evaluate(async () => {
       const auth = window.__TRON__.auth();
       await auth.init();
       await auth.updateCallsign('FLYNN_GUEST');
     });
     ```
- **Rationale**: `auth.updateCallsign()` is the official domain method. It updates `_currentUser`, `_saveState`, `StorageManager`, and `MockAuthProvider`'s storage, ensuring no layer can revert or rehydrate the anonymous `GUEST_SUBROUTINE_XXXX` handle.
- **Alternatives Considered**:
  - *Keep shallow mutation with longer `setTimeout`*: Inherently brittle and prone to timeout failures in CI under heavy CPU load.
  - *Dynamic regex assertions in Test 3B (`/^GUEST_SUBROUTINE_/`)*: Masks potential identity assignment bugs and fails to verify custom callsign propagation.

## Risks / Trade-offs

- **[Risk]** Awaiting `authManager.init()` in `onClickCreateRoom` could add a delay if auth initialization stalls.  
  → **Mitigation**: `authManager.init()` in `MockAuthProvider` resolves almost instantly (< 10ms) from local memory/storage, and `AuthManager` caches its `_initPromise` so subsequent calls return immediately.
- **[Risk]** Calling `auth.updateCallsign(...)` in `multiplayer.test.js` triggers `crossTabSync.broadcastAuthState(...)`.  
  → **Mitigation**: `CrossTabSync` checks `incomingUser.uid !== this._currentUser.uid`. Because each client session has a unique UID, cross-tab broadcasts will not overwrite the peer's handle.
