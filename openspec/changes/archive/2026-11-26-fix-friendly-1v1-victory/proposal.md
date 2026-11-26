# Proposal

## Why

In friendly `1v1` (`duel_multi`) matches, round and match victory detection is broken by dual-authority hit detection and asymmetric damage math:
- The thrower's client ([Disc.js](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/src/entities/Disc.js) -> [Bot.js](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/src/entities/Bot.js)) runs AI bot damage (`55`–`95+` HP) and `killFoe(f)` locally on remote human opponents, immediately triggering `reportMultiplayerMatchEnd({ isLocalWin: true })`.
- Meanwhile, the victim's client ([Disc.js](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/src/entities/Disc.js) -> [Player.js](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/src/entities/Player.js)) uses the `16`–`28.8` HP damage formula, so the thrower declares `VICTORY` or `ROUND_OVER` while the victim still has ~70–84 HP or even parried the disc.
- Simultaneous deaths (or desynced hits) cause both clients to lock `seriesRoundFinished` / `multiplayerMatchFinished` with conflicting winners and diverged `seriesScores`.
- Parried discs (`DISC_PARRY`) drop `isDeflected`, `charge`, and `rallyHits`, have uncapped `1.25x` compounding speed, and invert `originalOwner` on the thrower's screen so the deflected disc returns to the defender instead of back to the original thrower after the `1.5s` deflect window.

## What Changes

- **Victim-authoritative `1v1` damage and death**: Disable thrower-side damage, `killFoe`, and AI bot-catch rolls against remote opponents in `duel_multi`; keep local hit sparks + `D.returning = true` feedback on contact and reconcile via `parentThrowId` if `DISC_PARRY` arrives.
- **Multiplayer damage and parry parity**: Maintain the victim-side `(16 + bounces * 6) * (1 + charge * 0.8)` (`x1.8` rear ricochet) formula for normal throws, forward `isDeflected`, `charge`, `rallyHits`, and `originalOwner` on `DISC_PARRY` with capped speed (`<= 62 m/s`) and scaled parry bonus damage (`~20`–`50` HP max), and restore original-thrower return after `1.5s` or hitting the target player (removing wall-bounce early return for deflected multiplayer discs).
- **WebRTC HP elimination sync**: Handle `s.hp <= 0` in `handleIncomingFastPacket` (`src/network/sync.js`) so rival health bars and death visuals update accurately over WebRTC.
- **Host-refereed `1v1` round settlement**: Have eliminated players emit `PLAYER_ELIMINATED` to the Host (`p1`), who acts as sole round referee using a `RTT/2`-aware settlement window so simultaneous-death draws only occur when both deaths happen within ~16ms of each other, and `p1` broadcasts authoritative `ROUND_OVER` / `ROUND_DRAW` / `GAME_OVER_EVENT`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `multiplayer-networking`: Add requirements for victim-authoritative `1v1` damage/parry ownership, WebRTC `hp <= 0` sync, and host-refereed `1v1` round/draw settlement.

## Impact

- `src/entities/Disc.js`: Skip bot damage/kill/catch in `duel_multi`; `1.5s`-or-hit deflect return (no wall-bounce count); `DISC_PARRY` payload (`parentThrowId`, `originalOwner`, `isDeflected`, `charge`, `rallyHits`, capped speed, scaled parry damage).
- `src/entities/Bot.js`: Prevent `killFoe` from reporting multiplayer victory on predicted remote hits in `duel_multi`.
- `src/entities/Player.js`: Tag throws with `throwId`; emit `PLAYER_ELIMINATED` on death instead of unilaterally incrementing `seriesScores` in `1v1`.
- `src/network/roomManager.js`: Handle `parentThrowId` reconciliation in `handleRemoteThrow`, `originalOwner` restoration, and host-refereed settlement (`PLAYER_ELIMINATED`, `ROUND_DRAW`, `ROUND_OVER`, `GAME_OVER_EVENT`).
- `src/network/sync.js`: Process `s.hp <= 0` visual death state in `handleIncomingFastPacket`.
- `test/gameplay/multiplayer.test.js`: Verify `bestOf: 3`, disc-hit victory, and host-refereed `VICTORY` / `DEREZZED` parity.
