# Design

## Context

See `proposal.md` — `Why` for the `duos_multi` (`2v2`) failures. `onClickCreateRoom` and `onClickConfirmJoin` currently instantiate a 1-to-1 `WebRTCPeer` even for 4-player rooms, `Disc.js` + `Bot.js:killFoe` allow thrower-side elimination before the victim dies, `Player.js:damagePlayer` stops the entire `update(dt)` loop (`state.running = false`) on the first teammate's death, and `reportMultiplayerMatchEnd` relies on local `state.teammates.every(t => t.hp <= 0)` which deadlocks if both teammates die before syncing `hp: 0`.

## Goals / Non-Goals

**Goals:**
- Isolate `2v2` (`duos_multi`) rooms to room-document synchronization without binding a 1-to-1 `WebRTCPeer` session.
- Enforce victim-authoritative elimination in `duos_multi` with Host (`p1`)-refereed team-wipe evaluation so sequential and near-simultaneous teammate deaths always settle cleanly.
- Provide an active spectator state for an eliminated `2v2` player while their teammate is still fighting.

**Non-Goals:**
- Building a 4-peer full-mesh WebRTC DataChannel topology (room-document sync is already designated for `2v2` in `multiplayer-networking`).
- Dedicated authoritative server / ranked anti-cheat.
- Changing `1v1` (`duel_multi`) WebRTC behavior (covered by `fix-friendly-1v1-victory`).

## Decisions

### 1. Disable 1-to-1 WebRTC Initialization for `2v2` Rooms
- **Choice**: Guard `initWebRTCPeerSession` in `onClickCreateRoom` and `onClickConfirmJoin` with `mode !== '2v2'` (and `data.mode !== '2v2'`).
- **Rationale**: `WebRTCPeer` only manages a single `RTCPeerConnection` (`p1` <-> `p2`). In a 4-player room, `p3` and `p4` joining `SignalingBridge` causes offer collisions and spurious `disconnected` / `PEER_LEFT` events that prematurely end the match with `OPPONENT LEFT`.
- **Alternatives considered**: Multi-peer WebRTC mesh map (`Map<role, WebRTCPeer>`) — deferred as unnecessary complexity for friendly `2v2` when room-document sync is already required by spec.

### 2. Per-Player Elimination State + Host-Refereed Team-Wipe Evaluation
- **Choice**: When a `2v2` player dies (`Player.js:damagePlayer`), write `{ hp: 0, alive: false, eliminatedAtMs }` to `state.<role>` (and an `eliminations.<role>` map on the room doc) rather than expecting each victim to detect whether their teammate is also dead.
- **Host settlement**: `onRoomSnapshot` on Host (`p1`) inspects `eliminations` / `state.{p1,p2,p3,p4}` for Team 1 (`p1`, `p3`) and Team 2 (`p2`, `p4`). Once both members of at least one team are eliminated, `p1` (using a short grace window if the surviving team's last member died near-simultaneously) writes `status: 'round_over'` or `'finished'` (or `'round_draw'`) with canonical `seriesScores` and `winnerTeam`.
- **Rationale**: Eliminates the deadlock where `p1` and `p3` die within one RTT of each other and neither sees the other at `hp: 0`.
- **Note**: Assumes `fix-friendly-1v1-victory`'s victim-authoritative `Disc.js` / `Bot.js` guards apply to both `duel_multi` and `duos_multi` (so `killFoe` never fires prematurely in `2v2` either).

### 3. Eliminated `2v2` Spectator Loop
- **Choice**: When `state.gameMode === 'duos_multi'` and a teammate in `state.teammates` is still `alive && hp > 0`, `Player.js:damagePlayer` marks `state.player.alive = false` and `state.isSpectating = true`, **without** setting `state.running = false`.
- **Behavior**:
  - `updatePlayer` skips movement, jumping, dashing, throwing, and parrying when `!state.player.alive`.
  - `syncNetworkState` stops broadcasting after the final `hp: 0` elimination write.
  - `updateRemotePlayers` continues interpolating teammates and foes normally, and `updateCamera` smoothly tracks the living teammate's `pos` / `yaw`.
  - Once `round_over` or `finished` arrives, `state.isSpectating` clears and the intermission or post-match overlay displays normally.

## Risks / Trade-offs

- **Host (`p1`) eliminated early while `p3` survives**: Host must continue running `onRoomSnapshot` and team-wipe referee checks while spectating `p3` → Mitigation: keeping `state.running = true` in spectator mode and keeping `onRoomSnapshot` independent of `state.player.alive` ensures `p1` stays active as referee.
- **Host leaves mid-round in `2v2`**: Room status transitions to `closed` via `leaveMultiplayerAndReturnToMenu`, triggering `handleRemotePeerLeft` for remaining players.
- **Room-document sync latency in `2v2`**: Without WebRTC, `2v2` relies on ~18 Hz room-doc patches (`sync.js`). That is already the existing fallback for `2v2` and matches the spec's room-document fallback requirement.
