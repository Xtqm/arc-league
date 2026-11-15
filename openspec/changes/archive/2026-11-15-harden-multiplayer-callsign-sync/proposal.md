# Proposal

## Why

In headless CI and resource-constrained environments (e.g. GitHub Actions Ubuntu runners under SwiftShader), asynchronous authentication initialization can lag behind synchronous DOM/debug hook exposure. When multiplayer room creation or join actions execute before `AuthManager` finishes initializing, identity resolution either falls back prematurely to an anonymous generated handle (e.g., `GUEST_SUBROUTINE_XXXX`) or drops shallow handle assignments, causing nameplates and post-match HUD screens to display unintended anonymous handles instead of configured callsigns. 

Hardening the identity initialization lifecycle in both production network setup and the browser integration test suite guarantees deterministic callsign propagation and prevents test flakiness in CI.

## What Changes

- **Production Netcode Identity Gating**: Await `authManager.init()` in `onClickCreateRoom` and `onClickConfirmJoin` within `src/network/roomManager.js` before initializing network sessions or reading local callsigns.
- **Authoritative Callsign Resolution**: Update `getLocalCallsign()` in `src/network/roomManager.js` to also check `authManager.storage?.get('player.handle')` as a persistent fallback, ensuring seamless parity with `StorageManager`.
- **Deterministic Test Harness Synchronization**: Update `test/gameplay/multiplayer.test.js` to explicitly wait for `!!window.__TRON__?.auth()?._currentUser` before executing room tests, and invoke `auth.updateCallsign(...)` rather than shallow object property mutation to ensure proper propagation across `AuthManager`, `MockAuthProvider`, and `StorageManager`.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `multiplayer-networking`: Harden the Online Combatant Callsign Synchronization requirement to guarantee that participant identity and profile callsigns are resolved and settled prior to room document generation and WebRTC peer signaling.

## Impact

- `src/network/roomManager.js`: Async safety in `onClickCreateRoom` and `onClickConfirmJoin`, enhanced fallback in `getLocalCallsign()`.
- `test/gameplay/multiplayer.test.js`: Deterministic auth readiness waiting and official callsign update methods in Test 1.
- Zero breaking changes to public APIs, netcode protocol formats, or gameplay mechanics.
