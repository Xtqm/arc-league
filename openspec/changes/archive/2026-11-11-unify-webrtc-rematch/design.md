# Design: Unify Multiplayer Rematch Over WebRTC

## Context

See `proposal.md` for motivation. Currently, `src/network/roomManager.js` splits multiplayer networking across two half-migrated paths:
- **Custom rooms (`onClickCreateRoom`, `onClickConfirmJoin`)** initialize both a Firestore/mock room listener (`roomOnSnapshot`) and a single 1-to-1 `WebRTCPeer` (`initWebRTCPeerSession`), yet match-end, rematch voting (`#voteRematchBtn`), round restarts, and `RETURN TO MENU` remain wired exclusively to `roomUpdateDoc` and `onRoomSnapshot`.
- **Quick Match (`startMatchmakingWithWarmup` + `MatchmakingQueue`)** connects peers solely via `SignalingBridge` and `WebRTCPeer` without creating a room document or subscribing to `onRoomSnapshot`. Consequently, `GAME_OVER_EVENT`, `REMATCH_VOTE`, and `PEER_LEFT` never propagate between Quick Match peers, and `matchmakingQueue.status` stays stuck in `MATCHED` after leaving.

Additionally, `state.running` is overloaded as the round-transition trigger (`!state.running`), `state.multiplayerPayoutProcessed` is never reset in `startMultiplayerDuel()`, `Bot.js` double-credits multiplayer victories, and pending `setTimeout(..., 900)` / `state.onCountdownEnd` callbacks leak across rematches.

## Goals / Non-Goals

**Goals:**
- Route `GAME_OVER_EVENT`, `REMATCH_VOTE`, `REMATCH_START`, and `PEER_LEFT` over `WebRTCPeer.sendReliable` for both Quick Match and custom 1v1 rooms with zero cloud DB writes during rematch voting.
- Preserve automatic fallback to `roomUpdateDoc` / `onRoomSnapshot` when `WebRTCPeer` is not connected (e.g., strict NAT fallback or 4-player `duos_multi` rooms).
- Introduce a monotonic `roundId` (`state.multiplayerRoundId`) so round starts and rematches never misfire for eliminated players in `duos_multi`.
- Fix post-match economy payout duplication/omission, timer leaks, stale `onCountdownEnd` callbacks, WebRTC disconnect detection, and `MatchmakingQueue` state resets.

**Non-Goals:**
- Implementing a full 4-peer WebRTC mesh/star topology for `duos_multi` (2v2 keeps room-doc rematch fallback while benefiting from `roundId`, payout, and teardown fixes).
- Changing Solo AI Duel (`duel_ai`) or Campaign (`campaign`) post-match rematch/re-compile flows.
- Adding a rematch vote un-vote/cancel toggle or countdown timer on the post-match screen.

## Decisions

### 1. Unified Reliable Lifecycle Router (`roomManager.js` + `matchmakingQueue.js`)
- **Choice**: Centralize reliable match-lifecycle dispatch and handling inside `roomManager.js` (`dispatchMatchEvent`, `handleReliableMatchMessage`, `handlePeerConnectionStateChange`), and have `MatchmakingQueue._initPeerConnection` invoke registered lifecycle callbacks alongside its existing throw/tile handlers.
- **Rationale**: Avoids duplicating rematch state-machine logic between `initWebRTCPeerSession` and `MatchmakingQueue._initPeerConnection`, while keeping the module dependency unidirectional (`roomManager.js` registers handlers into `matchmakingQueue.js`, preventing circular imports).
- **Alternative Considered**: Moving `WebRTCPeer` instantiation out of `MatchmakingQueue` entirely. Rejected because `MatchmakingQueue` unit tests (`test/network/matchmaking_queue.test.js`, `test/network/warmup_sparring.test.js`) test `MatchmakingQueue`'s internal `WebRTCPeer` lifecycle directly.

### 2. WebRTC-Primary Transport with Room-Document Fallback
- **Choice**:
  - When `state.webrtcPeer?.connectionState === 'connected'` and `state.gameMode === 'duel_multi'`, send `GAME_OVER_EVENT`, `REMATCH_VOTE`, `REMATCH_START`, and `PEER_LEFT` strictly over `state.webrtcPeer.sendReliable(...)`.
  - When WebRTC is not connected (NAT-blocked rooms or `duos_multi` 4-player rooms) and `state.roomUnsubscribe` is active, fall back to `roomUpdateDoc` and `onRoomSnapshot`.
- **Rationale**: Eliminates database writes for all 1v1 WebRTC sessions (including Quick Match where no room document exists) while preserving 100% compatibility for 2v2 rooms and environments where P2P ICE fails.
- **Alternative Considered**: Falling back to `SignalingBridge` broadcast for rematch votes instead of Firestore. Deferred because `duos_multi` rooms already use the Firestore/mock room document for player roster (`players.p1..p4`) and state fallback, and keeping the existing room-doc fallback guarantees backward compatibility with existing multi-tab mock tests.

### 3. Canonical Message Protocol & Host Consensus
All reliable match-lifecycle packets carry `type` and `roundId`:
```text
+-------------------+-------------------------------------------------------------+
| Message Type      | Payload & Behavior                                          |
+-------------------+-------------------------------------------------------------+
| GAME_OVER_EVENT   | { type, roundId, winner, winnerTeam, loserRole, reason }    |
|                   | Emitted by Player.js (death) & Bot.js (foe kill).           |
|                   | Surviving peer shows VICTORY/DEREZZED if round matches.     |
+-------------------+-------------------------------------------------------------+
| REMATCH_VOTE      | { type, roundId, role, voted: true }                        |
|                   | Updates local state.rematchVotes[role] & vote label.        |
|                   | Host ('p1') checks vCount >= pCount -> emits REMATCH_START. |
+-------------------+-------------------------------------------------------------+
| REMATCH_START     | { type, roundId: nextRoundId, mode: '1v1' | '2v2' }         |
|                   | Host increments roundId, notifies peers, and restarts       |
|                   | locally via startMultiplayerDuel(..., { roundId }).         |
+-------------------+-------------------------------------------------------------+
| PEER_LEFT         | { type, roundId, role, reason: 'RETURN_TO_MENU' }           |
|                   | Disables #voteRematchBtn ('OPPONENT LEFT') and updates      |
|                   | label ('OPPONENT RETURNED TO MENU').                        |
+-------------------+-------------------------------------------------------------+
```
- **Alternative Considered**: Peer-symmetric rematch start where the second voter starts immediately without waiting for `REMATCH_START` from `'p1'`. Rejected because simultaneous clicks could race or desynchronize `roundId` when expanding to >2 players; keeping `'p1'` as the single round-transition coordinator matches existing room semantics.

### 4. Monotonic `roundId` Instead of `!state.running`
- **Choice**: Track `state.multiplayerRoundId` (reset to `0` on `teardownMultiplayer()` and `onClickCreateRoom`/`onClickConfirmJoin`, set to `1` on initial match entry, and incremented on `REMATCH_START` / room `resetPatch.roundId`).
- **Rationale**: Currently `onRoomSnapshot` restarts the arena whenever `data.status === 'active' && !state.running`, which wrongly respawns dead players mid-match in `duos_multi` while teammates are still fighting. Comparing `nextRoundId > state.multiplayerRoundId` guarantees each round starts at most once per client.

### 5. Single-Source Payouts, Timer Cancellation, and Clean Teardown
- **Choice**:
  - Remove the redundant `duelEconomyBridge.processMatchOutcome('victory', 'multiplayer')` call from `Bot.js:killFoe`, keeping `showMultiplayerVictory()` and `showMultiplayerDefeat()` as the single guarded payout point (`!state.multiplayerPayoutProcessed`).
  - Reset `state.multiplayerPayoutProcessed = false`, `state.multiplayerMatchFinished = false`, `state.peerDeparted = false`, `state.rematchVotes = { p1: false, p2: false, p3: false, p4: false }`, and `state.onCountdownEnd = null` at the start of `startMultiplayerDuel()`.
  - Store the 900ms end-screen timeout ID in `state.matchEndOverlayTimer` and clear it in `startMultiplayerDuel()` and `teardownMultiplayer()`.
  - On `leaveMultiplayerAndReturnToMenu()`, send `PEER_LEFT` over `sendReliable` (and `SignalingBridge` presence `{ left: true }`) before closing the peer after a short flush grace (~50ms) so the frame actually leaves the local SCTP buffer, set a `state.isTearingDownMultiplayer` guard so local close does not trigger `OPPONENT LEFT` UI, remove all `state.multiPlayers` / `state.foes` / `state.teammates` meshes in `teardownMultiplayer()`, and reset `matchmakingQueue` back to `IDLE`.

## Risks / Trade-offs

- **[Risk] Local `peer.close()` drops outgoing `PEER_LEFT` frame** -> Defer `peer.close()` by ~50ms inside `leaveMultiplayerAndReturnToMenu()` (closing a captured local reference) while tearing down local UI/state immediately; also listen to `WebRTCPeer` `disconnected`/`closed`/`failed` and `SignalingBridge.onPeerLeft` as a backup signal.
- **[Risk] Quick Match `p1` disconnect leaves `p2` unable to rematch** -> Surface `onConnectionChange` (`disconnected`/`closed`/`failed`) directly to the post-match overlay handler (`handlePeerDisconnected`), disabling `#voteRematchBtn` as `OPPONENT LEFT` so `p2` is never trapped in `VOTED` limbo.
- **[Risk] Dual-mode drift in custom 1v1 rooms if one peer is WebRTC-connected and the other fell back to room doc** -> Host `REMATCH_START` also writes `resetPatch` (`status: 'active'`, `roundId`) if `state.roomUnsubscribe` is active and WebRTC wasn't used, and `GAME_OVER_EVENT` uses `state.multiplayerMatchFinished` to stay idempotent if received via both channels.
- **[Risk] Test suites verifying room-doc fallback vs WebRTC path** -> Keep mock `BroadcastChannel` room-doc tests passing in `test/gameplay/rematch.test.js` AND add explicit WebRTC-only (no `state.db` / no `roomOnSnapshot`) rematch and disconnect integration/unit coverage.
