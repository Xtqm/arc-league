# Proposal: Unify Multiplayer Rematch Over WebRTC

## Why

While active multiplayer combat kinematics and disc throws already run over WebRTC DataChannels, post-match rematch voting, round restarts, and peer departure remain coupled to Firestore/mock room-document polling in `src/network/roomManager.js`. As a result, automated Quick Match sessions (`MatchmakingQueue`)—which establish WebRTC connections without creating a room document—have broken rematch voting and end-of-match signaling, while custom rooms suffer from rematch payout regressions, premature 2v2 mid-match respawns, stale end-of-match timers, and unhandled WebRTC disconnects.

## What Changes

- **WebRTC-Primary Rematch & Match-End Protocol**: Transmit `GAME_OVER_EVENT`, `REMATCH_VOTE`, `REMATCH_START` (carrying an explicit `roundId`), and `PEER_LEFT` events over the reliable ordered WebRTC DataChannel (`WebRTCPeer.sendReliable`) across both Quick Match and custom 1v1 rooms.
- **Room-Document Fallback Preservation**: Keep Firestore/mock `roomUpdateDoc` and `onRoomSnapshot` synchronization as a fallback transport whenever a direct WebRTC DataChannel is unavailable (such as strict NAT environments or 4-player `duos_multi` rooms).
- **Quick Match In-Place Rematch & Clean Re-Queueing**: Enable Quick Match peers to vote for and launch in-place rematches with their current opponent over WebRTC without re-entering the queue, and reset `MatchmakingQueue` to `IDLE` on menu exit or disconnect so players can queue again cleanly.
- **Post-Duel Lifecycle & Economy Fixes**:
  - Replace the `!state.running` round-start check with an explicit `roundId` guard so dead players in 2v2 (`duos_multi`) do not prematurely respawn mid-match.
  - Eliminate the duplicate victory payout in `Bot.js` (`killFoe`) and reset `state.multiplayerPayoutProcessed` in `startMultiplayerDuel()` so Match 1 pays once and every rematch pays accurately.
  - Clear lingering `state.onCountdownEnd` callbacks, cancel pending 900ms end-screen timers on round start/teardown, reset stale room coordinates on rematch, and remove all multiplayer meshes in `teardownMultiplayer()`.
  - Handle WebRTC `disconnected` / `closed` / `failed` state transitions on the post-match overlay by disabling rematch and displaying `OPPONENT LEFT`.

## Capabilities

### New Capabilities
<!-- None — all requirements belong to existing multiplayer and matchmaking capabilities. -->

### Modified Capabilities
- `multiplayer-networking`: Extend `In-Place Rematch Voting` to require WebRTC reliable DataChannel transport as primary (with room-document fallback when P2P channels are unavailable), `roundId`-gated round transitions, disconnect detection disabling rematch, and clean per-round state/payout resets.
- `online-matchmaking`: Add post-match lifecycle requirements covering in-place WebRTC rematch voting with the matched opponent and resetting `MatchmakingQueue` back to `IDLE` upon leaving or disconnecting.

## Impact

- **Networking**: `src/network/roomManager.js`, `src/network/matchmakingQueue.js`, `src/network/sync.js`, and `src/network/webrtcPeer.js` (unifying reliable match-lifecycle message dispatch across both session origins).
- **Combat & Match End**: `src/entities/Player.js` and `src/entities/Bot.js` (fixing `GAME_OVER_EVENT` payload/gating, deduplicating multiplayer payouts, cancelling pending end-of-match timers).
- **State & Teardown**: `src/core/state.js` (tracking round/rematch state such as `roundId`, `rematchVotes`, and pending modal timer handles) and `teardownMultiplayer()` cleanup for 2v2 and Quick Match.
- **Verification**: `test/gameplay/rematch.test.js`, `test/gameplay/multiplayer.test.js`, `test/network/matchmaking_queue.test.js`, and `test/network/warmup_sparring.test.js`.
