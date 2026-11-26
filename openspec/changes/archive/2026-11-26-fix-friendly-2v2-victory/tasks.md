# Tasks

## 1. Isolate 2v2 Room Transport from 1-to-1 WebRTC

- [x] 1.1 Guard `initWebRTCPeerSession` in `src/network/roomManager.js` (`onClickCreateRoom`, `onClickConfirmJoin`) so `mode === '2v2'` (`duos_multi`) rooms use room-document synchronization without creating a 2-peer `WebRTCPeer` session, and verify in a 4-client test that joining `p1`–`p4` never fires spurious `PEER_LEFT` / `OPPONENT LEFT` events.

## 2. Victim-Authoritative 2v2 Elimination & Host Team-Wipe Settlement

- [x] 2.1 Ensure `src/entities/Disc.js` and `src/entities/Bot.js` enforce victim-authoritative damage/kill suppression for `duos_multi` (matching `1v1` rules) and verify a single opponent hit does not remove `foes` locally or end the round prematurely.
- [x] 2.2 Update `src/entities/Player.js` and `src/network/roomManager.js` so eliminated `2v2` players publish `{ hp: 0, alive: false, eliminatedAtMs }` to `state.<role>` and `eliminations.<role>` on the room document, and Host (`p1`) evaluates full-team elimination across Team 1 (`p1`, `p3`) and Team 2 (`p2`, `p4`) in `onRoomSnapshot` (with simultaneous-wipe draw handling) to emit canonical `round_over`, `finished`, or `round_draw` transitions; verify sequential and simultaneous teammate deaths resolve without hanging.

## 3. Eliminated Teammate Spectator View

- [x] 3.1 Update `src/entities/Player.js` (`damagePlayer`) and `src/core/main.js` (`updatePlayer`, `updateCamera`) so a `2v2` player eliminated while a teammate remains alive enters `state.isSpectating = true` with `state.running` preserved, disabling local combat/sync while interpolating remote entities and tracking the surviving teammate's camera until the round completes; verify spectator camera tracking and clean reset on the next round/rematch.

## 4. Integration Verification

- [x] 4.1 Add a `2v2` (`duos_multi`) friendly room E2E test under `test/gameplay/` covering 4-player join, first-teammate spectator continuation, simultaneous/sequential team wipe, `bestOf: 3` series progression, and final `VICTORY` / `DEREZZED` display across all four roles; run the test suite and verify it passes.
