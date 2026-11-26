# Tasks

## 1. Victim-Authoritative Combat & Disc Parry Ownership

- [x] 1.1 Disable thrower-side damage, `killFoe`, and `0.35` deflected bot-catch rolls in `src/entities/Disc.js` and `src/entities/Bot.js` when `state.gameMode === 'duel_multi'`, keeping local sparks + `D.returning = true` feedback on contact and verifying via unit/browser test that local hits on a remote opponent never mutate `foe.hp` or trigger premature `VICTORY`.
- [x] 1.2 Tag outgoing `DISC_THROW` packets in `src/entities/Player.js` with `throwId`, attach `parentThrowId`, `originalOwnerRole`, `isDeflected`, `charge`, and `rallyHits` to `DISC_PARRY` in `src/entities/Disc.js`, cap parried velocity at `Math.min(62, Math.max(42, incomingSpd * 1.12))`, apply scaled parry bonus damage (`baseDmg * (1 + Math.min(0.75, 0.25 + (rallyHits - 1) * 0.15))`) on the victim while preserving `16`–`28.8` (`x1.8` rear ricochet) for normal throws, and verify parry payload fields and damage bounds with automated tests.
- [x] 1.3 Update `src/entities/Disc.js` and `src/network/roomManager.js` (`handleRemoteThrow`) so multiplayer deflected discs expire strictly after `1.5s` (removing `deflectBounces >= 2` early return) OR on hitting the target player, flip ownership back to `originalOwner` (the original thrower) on expiry/hit, and reconcile `parentThrowId` on `DISC_PARRY` arrival (despawning any matching unconfirmed local disc and resetting `hasDisc = false` if not yet re-thrown); verify in a 2-client test that the deflected disc returns to the original thrower after `1.5s` or hit.

## 2. WebRTC Kinematic Elimination & Host-Refereed Round Settlement

- [x] 2.1 Update `handleIncomingFastPacket` in `src/network/sync.js` to trigger opponent derez burst, `opp.alive = false`, and hiding `opp.obj` when `s.hp <= 0`, and verify the rival HUD bar and visual derez update over WebRTC packets.
- [x] 2.2 Replace dual-side `reportMultiplayerMatchEnd` score mutation in `1v1` (`src/entities/Player.js`, `src/network/roomManager.js`) with victim `PLAYER_ELIMINATED { role, reason, roundId, seriesRound, clientElapsedMs }` events and Host (`p1`) round-referee settlement (`clamp((ping || 60) / 2 + 20, 35, 140) ms` trade window, `±16ms` draw threshold emitting `ROUND_DRAW`, otherwise canonical `ROUND_OVER` / `GAME_OVER_EVENT`), verifying staggered deaths, simultaneous-death draws, and `bestOf: 3` progression via unit tests.

## 3. End-to-End Integration Verification

- [x] 3.1 Expand `test/gameplay/multiplayer.test.js` to verify `bestOf: 3` multi-round progression, disc-hit victim-authoritative elimination (no thrower-side 1–2 shot kill), and strict `VICTORY` / `DEREZZED` parity on both Host and Guest overlays; run the multiplayer test suite and verify all assertions pass.
