# Proposal: Decouple Match Entry Modes and Warm-Up Queue

## Why

Currently, all multiplayer and duel modes—Quick Match, Solo AI Practice, 1v1 Online Duels, and 2v2 Duos—are conflated inside a single `#hostModal` accessible only through the "HOST ARCFIELD MATCH" button. This creates acute user confusion:
1. Solo players seeking immediate online matchmaking against anyone cannot intuitively find "Quick Match", as it is hidden behind a "Host Match" button that suggests hosting private games.
2. Players wanting simple offline practice against a bot are forced to enter a multiplayer hosting dialog.
3. The interactive warm-up sparring bot system was designed specifically to keep searching players engaged while waiting in the global automated matchmaking queue. However, the UI conflates friendly custom rooms (which use 4-character room codes for friends) with global matchmaking, muddying the purpose of the warm-up arena.

Decoupling these entry points into clean, dedicated paths on the main menu and modals will allow players to immediately find global online matches, practice offline against bots without friction, or host/join private friendly matches with friends using room codes.

## What Changes

- **Direct Quick Match Entry**: Expose a prominent `[ QUICK MATCH // PLAY NOW ]` button directly on the primary Main Menu (`#mainMenuButtons`), enabling 1-click entry into global automated matchmaking with the interactive warm-up sparring arena.
- **Dedicated Solo AI Practice Entry**: Expose a dedicated `[ PRACTICE (SOLO AI) ]` button on the primary Main Menu (and preserve `#practiceBtn` selector), instantly starting offline endless tiered AI duel combat (`duel_ai`) without queue HUD or network signaling.
- **Refocused Friendly Duels (Host & Join)**: Refocus `#hostMatchBtn` into `HOST FRIENDLY MATCH` and `#joinOnlineBtn` into `JOIN FRIENDLY MATCH`, retaining standard 4-character room codes for private 1v1 and 2v2 matches with friends.
- **Strict Warm-Up Arena Isolation**: Explicitly restrict the interactive warm-up sparring bot and matchmaking queue HUD exclusively to automated Quick Match. Friendly custom rooms (`1v1` / `2v2`) will never spawn a warm-up sparring bot; hosts simply generate a room code and wait in `#roomModal` for challengers to enter the code.
- **Backward-Compatible UI Selectors**: Retain all existing DOM IDs (`#hostMatchBtn`, `#joinOnlineBtn`, `#quickMatchBtn`, `#practiceBtn`, `#host1v1Btn`, `#host2v2Btn`, `#cancelHostBtn`) and verify text matching expectations so existing automated test suites remain 100% compliant.

## Capabilities

### New Capabilities
*(None. This change refines existing matchmaking, menu, and game mode lifecycle contracts.)*

### Modified Capabilities
- `online-matchmaking`: Restrict the interactive warm-up sparring arena and matchmaking queue HUD exclusively to automated Quick Match. Clarify direct entry from the main menu and ensure clean cancellation back to the main menu without lingering warm-up bots or signaling tokens.
- `game-modes`: Formally decouple the three duel combat modalities—Solo AI Practice (offline tiered bot), Quick Match (automated online queue with warm-up sparring bot), and Friendly Duels (custom hosted rooms with code exchange and no warm-up bot)—specifying distinct entry points, lifecycle states, and UI representations.

## Impact

- **UI / Menus (`src/ui/menus.js`, `index.html`)**:
  - Update `getMainMenuHtml()` in `src/ui/menus.js` to render direct `quickMatchBtn` and `practiceBtn` actions alongside `hostMatchBtn` and `joinOnlineBtn`.
  - Refactor `#hostModal` into a dedicated Friendly Custom Room configuration modal (map selection, series format selection, 1v1/2v2 room creation) with legacy alias compatibility.
  - Update 3D lobby core triggers (`src/ui/lobbyCores.js`) to support direct quick match and friendly duel choices.
- **Networking (`src/network/roomManager.js`, `src/network/matchmakingQueue.js`)**:
  - Ensure `startMatchmakingWithWarmup()` is triggered cleanly from main menu Quick Match.
  - Ensure queue cancellation returns cleanly to `showModeSelectMenu()`.
  - Confirm friendly room hosting (`onClickCreateRoom`) maintains standard room modal waiting flow without queue HUD or sparring bot instantiation.
- **Test Suites (`test/gameplay/unified_flow.test.js`, etc.)**:
  - Maintain button IDs (`#swarmBtn`, `#hostMatchBtn`, `#joinOnlineBtn`, `#practiceBtn`, `#host1v1Btn`, `#host2v2Btn`, `#cancelHostBtn`, `#quickMatchBtn`) and text contents (`HOST`, `JOIN`) to guarantee zero test regressions.
