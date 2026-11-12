# Proposal

## Why

Two user-facing gaps remain after unifying WebRTC rematch messaging:
1. Solo AI Duel (`duel` / `duel_ai`) still disagrees with `game-modes/spec.md` (the spec describes a 280 HP single duel ending in a victory modal, whereas the runtime and tests run endless tier escalation starting at 250 HP, and defeat always resets back to Tier 1 without a same-tier rematch option).
2. Two partial edge cases remain from the multiplayer lobby and rematch flows: players cannot un-vote after clicking `VOTE REMATCH` (nor recover cleanly from a stalled/dropped Firestore host rematch), and `#hostModal`'s `#arenaSelect` sector picker still has no effect on hosted multiplayer rooms (`1v1` / `2v2`) even though `game-modes/spec.md` requires host lobby map synchronization.

## What Changes

- Align `game-modes` specification for Solo AI Duel (`duel` / `duel_ai`) with the implemented endless tier progression (`250 HP` Tier 1 scaling as `250 + tier * 50` HP on subsequent tiers with automatic next-tier countdown on kill).
- Update Solo AI Duel defeat Game Over UI (`showGameOver`) and round reset helpers (`resetGame`) to offer **`REMATCH TIER <N>`** (preserving current tier progression) alongside **`RESTART TIER 1`** (`#recompileBtn`) and **`MODE SELECT`**.
- Turn multiplayer `#voteRematchBtn` into a reversible **vote / un-vote toggle** across both WebRTC `REMATCH_VOTE` and Firestore room `rematchVotes`, and add `beforeunload` departure notifications plus bounded rematch-vote timeout recovery when a host or peer goes unresponsive.
- Synchronize `#hostModal` `#arenaSelect` / `state.selectedArenaMap` into hosted `1v1` / `2v2` rooms (`onClickCreateRoom`, room doc, `REMATCH_START`, `onRoomSnapshot`, and `startMultiplayerDuel`) so all participants load the host's chosen sector arena theme and hazards on start and rematches, while resetting shared arena materials cleanly on `teardownSectorArena()` and keeping Quick Match on the symmetric default arena.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `game-modes`: Align `Duel AI Match Flow` to endless tier scaling (250 HP base, auto-advance on victory), add same-tier `REMATCH TIER <N>` vs `RESTART TIER 1` options in `Player Defeat Lifecycle` for Solo AI Duel, and clarify `Dynamic Duel Arena Map Selection Lobby` propagation into hosted multiplayer rooms while reserving Quick Match for the symmetric default arena.
- `multiplayer-networking`: Allow reversible rematch vote toggling in `In-Place Rematch Voting`, add `beforeunload` departure signaling and rematch timeout recovery for unresponsive hosts/peers in `Rematch Peer Departure and Disconnect Handling`, and add `Multiplayer Room Arena Synchronization` so hosted `1v1` / `2v2` rooms instantiate and preserve the host's chosen arena across start and rematches.

## Impact

- Affected source modules: `src/ui/modals.js`, `src/entities/Player.js`, `src/network/roomManager.js`, `src/ui/menus.js`, `src/entities/Arena.js`, `src/core/state.js`.
- Affected tests: `test/gameplay/rematch.test.js` (update `voteBtnDisabled` check for toggle behavior; add un-vote, rematch timeout, and multiplayer arena sync assertions), `test/gameplay/unified_flow.test.js` (add Solo AI Duel defeat `REMATCH TIER <N>` vs `RESTART TIER 1` assertions), `test/ui/duel_map_selector.test.js` (optional/complementary room creation propagation check).
- No database schema migrations or external package dependencies required.
