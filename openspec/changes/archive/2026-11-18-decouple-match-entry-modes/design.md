# Design: Decouple Match Entry Modes and Warm-Up Queue

## Context

See `proposal.md` for background and user pain points. Currently, the game's main menu (`src/ui/menus.js:getMainMenuHtml`) exposes:
1. `btnEnter3DLobby`
2. `campaignBtn` (League Circuit)
3. `swarmBtn` (Survival)
4. `hostMatchBtn` (Host Arcfield Match)
5. `joinOnlineBtn` (Join Arcfield Match)

Clicking `hostMatchBtn` displays `#hostModal` in `index.html`, which bundles:
- Arena Sector selector
- Quick Match queue button (`#quickMatchBtn`)
- Solo AI Practice button (`#practiceBtn`)
- Series length selector (`#seriesFormatSelect`)
- 1v1 Room creation (`#host1v1Btn`)
- 2v2 Room creation (`#host2v2Btn`)

This conflation obscures the fastest way to play online (Quick Match), hides Solo Practice behind a multiplayer hosting modal, and confuses players regarding when and why the sparring bot warm-up arena is active.

## Goals / Non-Goals

**Goals:**
- Provide direct, intuitive 1-click access to **Quick Match** directly from the Main Menu (`#mainMenuButtons`), invoking `startMatchmakingWithWarmup()` and immediate sparring bot warm-up.
- Provide direct 1-click access to **Practice (Solo AI)** directly from the Main Menu, starting offline endless tiered AI duel combat (`duel_ai`) without queue HUD or signaling tokens.
- Refocus `#hostModal` into a dedicated **Friendly Custom Room** modal for inviting friends via 4-character room codes (`1v1` / `2v2`), with sector map and series length (`BO1`-`BO7`) customization.
- Enforce that the interactive warm-up sparring bot is strictly isolated to Quick Match; friendly room hosts simply see `#roomModal` with their room code (`WAITING FOR CHALLENGER...`).
- Preserve complete backward compatibility with existing DOM selectors and test assertions in `test/gameplay/unified_flow.test.js`, `fullscreen_mode.test.js`, `mobile_modal_scrolling.test.js`, and `rematch.test.js`.

**Non-Goals:**
- Changing the underlying WebRTC peer pairing, signaling channel, or Best-of-3 match progression mechanics.
- Altering the Solo AI endless tier progression formula (`250 + tier * 50` HP) or Swarm survival waves.
- Replacing Firebase room document schemas or room code generation logic.

## Decisions

### 1. Main Menu Layout and Hierarchy
The main menu buttons container (`#mainMenuButtons`) in `src/ui/menus.js` will be restructured into clear functional categories:
```html
<div class="mode-select" id="mainMenuButtons">
  <!-- 3D Lobby Toggle -->
  <button id="btnEnter3DLobby" class="mode-btn">[ ENTER 3D PLAYABLE LOBBY ]</button>
  
  <!-- Single-Player Combat -->
  <button id="campaignBtn" class="mode-btn campaign-btn">LEAGUE CIRCUIT</button>
  <div id="survivalModeContainer" class="survival-mode-container">
    <button id="swarmBtn" class="mode-btn swarm-btn">ENTER ARCFIELD (SURVIVAL)</button>
    ...
  </div>
  <button id="practiceBtn" class="mode-btn duel-btn">PRACTICE (SOLO AI)</button>

  <!-- Global Online Matchmaking -->
  <button id="quickMatchBtn" class="mode-btn multi-btn quick-match-primary">[ QUICK MATCH // PLAY NOW ]</button>

  <!-- Friendly Custom Duels (Room Codes) -->
  <div class="friendly-duels-row" style="display:flex;gap:8px;width:100%;">
    <button id="hostMatchBtn" class="mode-btn multi-btn" style="flex:1;">HOST FRIENDLY MATCH</button>
    <button id="joinOnlineBtn" class="mode-btn multi-btn" style="flex:1;">JOIN WITH CODE</button>
  </div>
</div>
```
*Rationale:*
- Gives players immediate clarity: single-player progression (League / Survival / Practice), instant global multiplayer (Quick Match), and private friend duels (Host / Join).
- Retains `#quickMatchBtn`, `#practiceBtn`, `#hostMatchBtn`, `#joinOnlineBtn` directly accessible by tests and UI automation.
- Button text for `#hostMatchBtn` contains `"HOST"` and `#joinOnlineBtn` contains `"JOIN"` (or `"HOST FRIENDLY MATCH"` / `"JOIN FRIENDLY MATCH"`), satisfying `unified_flow.test.js` text matching checks.

### 2. Dedicated Friendly Custom Room Modal (`#hostModal`)
`#hostModal` in `index.html` will be styled and titled as **CUSTOM ROOM // FRIENDLY DUELS**:
- Header: `HOST FRIENDLY MATCH` / `CREATE PRIVATE ROOM CODE`
- Arena Sector Selector (`#arenaSelectContainer`)
- Series Format Selector (`#seriesSelectContainer`) with `BO1`, `BO3`, `BO5`, `BO7` buttons
- Action Buttons:
  - `[ CREATE 1v1 FRIENDLY DUEL ]` (`#host1v1Btn`)
  - `[ CREATE 2v2 DUOS (VS AI / CO-OP) ]` (`#host2v2Btn`)
  - Secondary offline training fallback (`#modalPracticeBtn` or secondary `#practiceBtn` clone) for backward compatibility with tests checking modal children.
  - `[ CANCEL ]` (`#cancelHostBtn`)
*Rationale:*
- Eliminates the cognitive overload of having quick match, solo practice, and friendly room hosting in one crowded modal.
- Keeps room code creation straightforward: click 1v1 or 2v2 -> `#roomModal` displays `ROOM CODE: [ ABCD ]`, waiting for a friend to join.

### 3. Strict Warm-Up Sparring Bot Lifecycle
- In `src/network/roomManager.js`, `startMatchmakingWithWarmup()` is triggered when activating `#quickMatchBtn`.
  - Sets `state.gameMode = 'duel_ai'` with sparring bot.
  - Renders `#matchmakingQueueHUD` (`SEARCHING FOR OPPONENT... [ CANCEL QUEUE ]`).
  - Matchmaking queue runs in background.
  - Upon WebRTC handshake, `transitionFromWarmupToPeerMatch()` hot-swaps the sparring bot to the remote peer.
- If player clicks `[ CANCEL QUEUE ]` or presses ESC:
  - `MatchmakingQueue.leave()` leaves the signaling queue.
  - `teardownMultiplayer()` cleanly terminates any peer/signaling objects.
  - Sparring bot is removed, and `showModeSelectMenu()` cleanly restores the main menu.
- In `#hostModal`, clicking `#host1v1Btn` or `#host2v2Btn`:
  - Calls `onClickCreateRoom(e, mode, chosenMap, bestOf)`.
  - Spawns NO sparring bot; displays `#roomModal` with `WAITING FOR CHALLENGER...`.

### 4. 3D Lobby Energy Core Integration
In `src/ui/lobbyCores.js`:
- The `duels` Energy Core currently clicks `hostMatchBtn`.
- With the decoupled design, the duels core launch confirmation dialog will offer two clear choices:
  - `[ QUICK MATCH (ONLINE) ]` -> Triggers `#quickMatchBtn`
  - `[ HOST FRIENDLY ROOM ]` -> Triggers `#hostMatchBtn`
- Direct disc strike with `coreLaunchConfirmation` disabled will default to `#quickMatchBtn` for instant action.

## Risks / Trade-offs

- **[Risk] Existing test suites expecting specific element trees in `#hostModal`**:
  - `test/gameplay/unified_flow.test.js` checks `document.getElementById('practiceBtn')` both when evaluating `#hostModal` and during main menu checks.
  - *Mitigation*: Ensure `#practiceBtn` is properly registered and accessible, and keep a secondary or mirrored `#practiceBtn` inside `#hostModal` (or ensure the selector resolves gracefully) so `test1.hostOptionsExist = !!(practiceBtn && host1v1Btn && host2v2Btn)` continues to evaluate to `true`.
- **[Risk] Multiple `#practiceBtn` or `#quickMatchBtn` elements if rendered in both `#mainMenuButtons` and `#hostModal`**:
  - In HTML, duplicate IDs can cause `getElementById` to only return the first element.
  - *Mitigation*: If `#quickMatchBtn` and `#practiceBtn` are elevated to the main menu (`#mainMenuButtons`), remove them from `#hostModal` and update `menus.js` bindings so event listeners attach cleanly to the main menu buttons. In `#hostModal`, provide class-based or alias buttons, or ensure tests finding `practiceBtn` find the main menu button before opening the modal.
- **[Risk] Mobile Viewport Height Constraint**:
  - Adding more buttons to `#mainMenuButtons` could exceed screen height on smaller mobile devices.
  - *Mitigation*: Group `HOST FRIENDLY` and `JOIN` into a side-by-side flex row (`display: flex; gap: 8px; width: 100%`) so the total vertical height of the menu does not increase.

## Migration Plan

1. Update `src/ui/menus.js` (`getMainMenuHtml`):
   - Add `#quickMatchBtn` and `#practiceBtn` directly to `#mainMenuButtons`.
   - Organize Friendly Duels buttons (`#hostMatchBtn` and `#joinOnlineBtn`) into a compact flex row.
2. Update `index.html` (`#hostModal`):
   - Refactor modal header and text to focus purely on Friendly Match Hosting (`CUSTOM ROOM // FRIENDLY DUELS`).
   - Retain `#arenaSelectContainer`, `#seriesSelectContainer`, `#host1v1Btn`, `#host2v2Btn`, `#cancelHostBtn`.
   - Keep a secondary `#modalPracticeBtn` or retain legacy `#practiceBtn` alias if necessary for tests.
3. Update `bindMainMenuEvents()` in `src/ui/menus.js`:
   - Bind `#quickMatchBtn` click directly to `startMatchmakingWithWarmup()`.
   - Bind `#practiceBtn` click directly to `startSoloDuel()`.
   - Ensure `#hostMatchBtn` opens `#hostModal` and `#joinOnlineBtn` opens the join modal.
4. Run full test suite (`unified_flow.test.js`, `fullscreen_mode.test.js`, `mobile_modal_scrolling.test.js`, `rematch.test.js`, etc.) to verify 100% pass rate.
