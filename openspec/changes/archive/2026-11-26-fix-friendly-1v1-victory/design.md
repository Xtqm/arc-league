# Design

## Context

See `proposal.md` — `Why` for the root causes in `duel_multi`. Friendly `1v1` (and `duel_multi` generally) runs over a WebRTC DataChannel with a room-document fallback. Currently `Disc.js` + `Bot.js:killFoe` execute AI combat math (`55`–`95` dmg, `35%` bot catch, and `killFoe` win triggers) on the thrower's client while `Player.js:damagePlayer` executes `16`–`28.8` dmg on the victim's client, and both clients independently call `reportMultiplayerMatchEnd()`.

## Goals / Non-Goals

**Goals:**
- Make the victim client the single source of truth for its own damage (`16`–`28.8` base, scaled parry bonus) and elimination in `duel_multi`.
- Fix `DISC_PARRY` ownership/reconciliation so the deflected disc remains hostile for `1.5s` (ignoring `deflectBounces`) or until hitting the thrower, then returns to the original thrower (`originalOwner`).
- Make Host (`p1`) the sole `1v1` round referee (`PLAYER_ELIMINATED` -> `ROUND_OVER` / `ROUND_DRAW` / `GAME_OVER_EVENT`) using a `~RTT/2 + 20ms` trade window and `±16ms` simultaneity threshold.

**Non-Goals:**
- Modifying `2v2` (`duos_multi`) room transport, spectator flow, or team-wipe logic (deferred to `fix-friendly-2v2-victory`).
- Dedicated authoritative game server / anti-cheat for ranked play.
- Player disc-catching mechanics for deflected discs (planned separately).

## Decisions

### 1. Victim-Authoritative Hit Detection with Local Bounce + `parentThrowId` Reconciliation
- **Choice**: In `duel_multi`, `Disc.js` skips `applyDamageToTarget`, `killFoe`, and `BotCombatBrain` / `0.35` deflected catch rolls when `D.owner === 'player'` hits a remote `foe`. Local contact still spawns hit sparks and sets `D.returning = true` so the thrower reliably recovers their disc when the defender does not parry.
- **Reconciliation**: Every `throwData` carries a `throwId` (`id`), and `DISC_PARRY` carries `parentThrowId` plus `originalOwnerRole`. When the original thrower receives `DISC_PARRY`, `handleRemoteThrow` despawns any local disc matching `parentThrowId`, sets `state.player.hasDisc = false` (undoing any premature point-blank local return from that same throw), and spawns the deflected disc with `D.originalOwner = 'player'`.
- **Alternatives considered**: Passing through the enemy locally until `1.5s` timeout (rejected: feels unresponsive on valid hits).

### 2. Multiplayer Parry Scaling & Return Rules
- **Choice**: `DISC_PARRY` forwards `isDeflected: true`, `charge`, `rallyHits`, and `originalOwnerRole`. Speed is capped via `Math.min(62, Math.max(42, incomingSpd * 1.12))` so repeated parries cannot turn into hitscan beams. Victim damage uses `baseDmg * (1 + Math.min(0.75, 0.25 + (rallyHits - 1) * 0.15))` (yielding ~20–50 HP max on parries while normal throws remain `16`–`28.8`).
- **Return trigger**: In `duel_multi`, deflected discs flip back to `D.originalOwner` (`D.isDeflected = false`, `D.returning = true`) after `D.deflectTime >= 1.5` OR hitting the target player (`Disc.js` collision), with `D.deflectBounces >= 2` disabled for multiplayer.

### 3. Host-Refereed `1v1` Round Settlement (P2P Trade Window)
- **Choice**: Eliminated clients send `PLAYER_ELIMINATED { role, reason, roundId, seriesRound, clientElapsedMs }` instead of immediately advancing `seriesScores`.
  - If `p2` dies while `p1` is alive, `p1` settles immediately (`ROUND_OVER` or `GAME_OVER_EVENT`).
  - If `p1` dies while `p2` appears alive, `p1` enters a brief pending settlement timer of `clamp((state.ping || 60) / 2 + 20, 35, 140) ms`. If `p2`'s `PLAYER_ELIMINATED` arrives within that window, `p1` compares estimated elimination instants (using `RTT / 2` transit compensation and round-elapsed time): within `±16ms` -> `ROUND_DRAW` (replay `seriesRound` with unchanged `seriesScores`); otherwise the earlier elimination loses.
- **Alternatives considered**: Always waiting on a dedicated server (rejected: server cost and added input/parry latency); immediate local win/loss on both clients (rejected: causes score desync and false draws).

## Risks / Trade-offs

- **Point-blank `DISC_PARRY` after immediate throw**: If A throws point-blank at B, catches local return, and immediately fires a second disc within 1 RTT before `DISC_PARRY` arrives → Mitigation: `parentThrowId` tracks only the throw that was parried; if A already threw a *new* disc (`throwId !== parentThrowId`), don't clear the new in-flight throw, only despawn the matching `parentThrowId` disc.
- **Host disconnect during settlement**: If `p1` closes/disconnects while `p1`'s settlement timer is pending → Mitigation: existing `PEER_LEFT` / `handleRemotePeerLeft` handler cancels timers and awards match completion to `p2`.
- **Clock skew**: System clocks differ between peers → Mitigation: compare round-relative elapsed time (`performance.now() - roundStartPerfMs`) adjusted by measured `state.ping / 2` rather than raw wall-clock `Date.now()`.
