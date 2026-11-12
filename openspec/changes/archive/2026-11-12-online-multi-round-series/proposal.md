# Proposal

## Why

Online `1v1` and `2v2` matches currently conclude after a single elimination, dropping players immediately into the post-match rematch/leave overlay after one round. Adding configurable Best-of-N multi-round series strictly for online `1v1` and `2v2` lets players compete across full sets (`BO1`, `BO3`, `BO5`, `BO7`) with automatic between-round transitions and clear series results before choosing to rematch or leave.

## What Changes

- **Host Lobby Series Length Selection**: Add a compact series format selector (`BO1`, `BO3`, `BO5`, `BO7`, defaulting to `BO3`) in `#hostModal` applied strictly when hosting online `1v1` or `2v2` rooms; persist `bestOf` on created rooms without altering Solo AI Practice, Swarm, or Campaign.
- **Quick Match Best-of-3 Default**: Default automated WebRTC Quick Match duels to Best of 3 (`bestOf = 3`, first to 2 round wins) with full round-win synchronization directly over the reliable WebRTC DataChannel (zero room database writes).
- **Best-of-N Clinch & Automatic Intermission Flow**: Track team round wins (`seriesScores` for Team 1 and Team 2) and current sub-round index (`seriesRound`). When a round ends before either side reaches `ceil(bestOf / 2)` wins, show a brief `~2s` round-result callout (`ROUND X WON` / `ROUND X LOST` + current score), then automatically reset floor tiles, discs, spawn positions, and health/energy to 100% and launch a 3-second countdown into the next round.
- **Series Completion, Final Results, Economy Payout & Rematch**: Trigger the post-match `VICTORY` / `DEREZZED` overlay (including final series score such as `SERIES 2 - 1` + participant callsigns, `VOTE REMATCH`, and `RETURN TO MENU`) and process `duelEconomyBridge` Bits/XP payout **once per completed series** (or immediately if an opponent forfeits/disconnects mid-series). Voting unanimously for a rematch starts a fresh `0 - 0` series in the same `bestOf` format and selected arena.
- **Ultra-Compact Online HUD Series Indicator**: Keep `#roundLabel`, `#scoreRow`, and `#subLabel` hidden in online matches, and render an ultra-compact team win-pip / score strip directly beneath `#bossBarWrap` inside `#tr` only when `bestOf > 1` (hidden during `BO1` and single-player modes).
- **Out of Scope**: Offline/single-player AI Duel (`duel_ai`), Swarm, Campaign, and non-series combat mechanics remain unchanged.

## Capabilities

### New Capabilities
<!-- None: series rules, matchmaking defaults, lobby selection, and compact HUD indicators extend existing capabilities. -->

### Modified Capabilities
- `multiplayer-networking`: Add Best-of-N (`BO1`/`BO3`/`BO5`/`BO7`) series scoring, mid-series ~2s auto-advance round transitions, mid-series disconnect victory, per-series single economy payout, and full `0-0` series reset on unanimous rematch.
- `online-matchmaking`: Default automated WebRTC Quick Match matches to Best of 3 (`BO3`) using reliable WebRTC series state synchronization without database writes.
- `game-modes`: Add series format selection (`BO1`/`BO3`/`BO5`/`BO7`, default `BO3`) in Host Match lobby strictly for online `1v1` and `2v2` rooms, leaving Solo AI/Swarm/Campaign untouched.
- `combat-hud`: Render ultra-compact series win-pips / score strip beneath `#bossBarWrap` strictly during `bestOf > 1` online matches plus brief between-round intermission callout feedback.

## Impact

- **Networking & Series Lifecycle**: `src/core/state.js`, `src/network/roomManager.js`, `src/network/matchmakingQueue.js`.
- **UI & HUD**: `index.html` (`#hostModal` series selector, compact `#seriesScoreRow` under `#bossBarWrap`, optional intermission banner styling), `src/ui/menus.js`, `src/ui/hud.js`, `src/core/main.js` (optional `window.__dbg` helpers).
- **Tests**: `test/gameplay/multiplayer.test.js`, `test/gameplay/rematch.test.js`, `test/gameplay/unified_flow.test.js`.
