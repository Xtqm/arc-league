# Proposal

## Why

Friendly `2v2` (`duos_multi`) rooms share the `1v1` hosting, joining, and match-end pipeline, which breaks in 4-player matches:
- `onClickCreateRoom` and `onClickConfirmJoin` initialize a 1-to-1 `WebRTCPeer` session even when `mode === '2v2'`, causing failed/partial handshakes and false `OPPONENT LEFT` triggers (`handleRemotePeerLeft`) whenever a single peer connection drops.
- Like `1v1`, `Disc.js` + `Bot.js:killFoe` runs thrower-side AI damage (`55`–`95+`) and removes foes from `state.foes` locally before the victim actually dies.
- When the first teammate in a `2v2` pair is eliminated (`Player.js:damagePlayer`), `state.running` is set to `false`, freezing their game loop and dropping them into the orbiting lobby camera instead of letting them spectate their living teammate.
- `reportMultiplayerMatchEnd` checks `state.teammates.every(t => t.hp <= 0)` locally; if both teammates die within one network RTT before Firestore syncs `hp: 0`, neither triggers `allFinished = true` and the round hangs indefinitely.

## What Changes

- **Separate `2v2` room-document transport from 1-to-1 WebRTC**: Do not bind a 2-peer `WebRTCPeer` session for `duos_multi` rooms in `onClickCreateRoom` / `onClickConfirmJoin` (until a multi-peer mesh is introduced), preventing false `PEER_LEFT` / `OPPONENT LEFT` aborts while keeping room-document sync authoritative.
- **Victim-authoritative `2v2` combat & team-wipe settlement**: Disable thrower-side damage/kill in `duos_multi` (`Disc.js` / `Bot.js`); emit per-role `PLAYER_ELIMINATED` state (`hp: 0`, `alive: false`) to the room document and have Host (`p1`) evaluate full-team elimination (`t1` vs `t2`) and broadcast `round_over` / `finished` / `round_draw` cleanly, avoiding simultaneous teammate-death deadlocks.
- **Eliminated `2v2` spectator mode**: Keep `state.running = true` (combat/throw/sync disabled while `!state.player.alive`) when a `2v2` player dies while a teammate remains alive, keeping remote player interpolation active and framing the camera on the living teammate until the round finishes.

## Capabilities

### New Capabilities

### Modified Capabilities
- `multiplayer-networking`: Update `2v2` room lifecycle, victim-authoritative team-wipe settlement, and eliminated-player spectator continuation during active `2v2` rounds.

## Impact

- `src/network/roomManager.js`: Skip 1-to-1 `initWebRTCPeerSession` for `mode === '2v2'`; host-refereed team-wipe evaluation from synchronized per-player elimination state (`p1`–`p4`).
- `src/entities/Player.js`: Enter spectator state instead of setting `state.running = false` when eliminated mid-round in `duos_multi`.
- `src/entities/Disc.js` & `src/entities/Bot.js`: Ensure `duos_multi` shares victim-authoritative hit/parry rules (no local `killFoe` win triggers).
- `src/core/main.js`: Spectator camera follow for dead `duos_multi` players while round remains active.
- `test/gameplay/`: Add `2v2` friendly room lifecycle, mid-round teammate elimination + spectator, and team-wipe victory tests.
