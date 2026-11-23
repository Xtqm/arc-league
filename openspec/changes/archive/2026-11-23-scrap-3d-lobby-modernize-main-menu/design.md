# Design

## Context

The existing main menu interface in `src/ui/menus.js` generates `#mainMenu` as a centered `.card`. It is crowded by 10 lines of static keyboard shortcuts that force primary gameplay buttons below the fold. Simultaneously, `src/ui/lobbyCores.js` manages a 655-line playable 3D lobby that renders 5 floating geometric meshes, requires pointer lock, and uses projectile raycasting for menu navigation. This creates input conflicts, camera mode desynchronizations, and an inconsistent player onboarding experience.

See `proposal.md` for the motivation and `specs/` for behavioral delta specifications.

## Goals / Non-Goals

**Goals:**
- Completely decommission `src/ui/lobbyCores.js` and all associated 3D raycasting, projectile interaction, and confirmation drawers.
- Implement an asymmetric Left-Aligned Tactical Rail (`#mainMenu.tactical-rail`) docked to the left 35-40% of widescreen displays with zero vertical scrolling.
- Extract static desktop and mobile control explanations into a standalone `Directives & Controls` modal (`#directivesModal`), opened on demand via button or `?` shortcut.
- Retain an ambient 3D staging presentation on the right 65% of the viewport (illuminated arena floor with a slowly spinning turntable Identity Disc model) without capturing mouse look or processing locomotion keys.
- Preserve 100% backward compatibility with existing DOM IDs (`#practiceBtn`, `#quickMatchBtn`, `#hostMatchBtn`, `#joinOnlineBtn`, `#campaignBtn`, `#swarmBtn`) and click event handlers.
- Deprecate obsolete settings (`coreLaunchConfirmation`) from `src/ui/modals/SettingsModal.js` and storage schemas.

**Non-Goals:**
- Modifying in-game combat HUD (`src/ui/hud.js`), pause menu, or match debrief screens.
- Introducing heavy UI frameworks or external CSS libraries (retain zero-dependency pure vanilla JS and CSS).
- Altering core combat rules, campaign trial progression, or network protocols.

## Decisions

### Decision 1: Left-Aligned Tactical Rail Architecture
- **Choice**: Dock `#mainMenu` to the left 35-40% of the viewport as a fixed cyber-athletic rail with a dark glass backdrop (`linear-gradient(135deg, rgba(8, 14, 28, 0.92), rgba(4, 8, 16, 0.85))`), chamfered neon cyan borders, and a vertical flex hierarchy:
  1. Header: Canonical Arc League title logo (`assets/branding/arc_league_title_logo.png`) and user identity/Bits status.
  2. Mode Directives: Primary action buttons (`LEAGUE CIRCUIT`, `ARCFIELD SURVIVAL`, `QUICK MATCH`, `PRACTICE (SOLO AI)`, `FRIENDLY MATCH`).
  3. Utility Dock: Bottom bar containing `OUTFITTING` (Armory), `TROPHY MATRIX` (Achievements), `DIRECTIVES & CONTROLS` (`[?]`), and `SETTINGS`.
- **Alternatives Considered**:
  - *Centered Cyber Console*: Retaining a centered card with refreshed styling was evaluated in exploration. It was rejected because it smothers the 3D graphics in the background, feels like a generic web modal, and easily overflows vertically on 768p and 1080p displays.

### Decision 2: Dedicated Directives & Controls Modal
- **Choice**: Extract the 10 desktop keyboard bindings and mobile gesture instructions out of the main menu body into a sleek `#directivesModal` dialog.
- **Rationale**: The controls block consumed over 200px of vertical height in the old menu. Moving it to an accessible on-demand dialog frees up the entire vertical span for primary play modes while allowing richer, tabbed input diagrams for both keyboard and gamepad/touch.
- **Alternatives Considered**:
  - *Accordion / Collapsible Drawer inside the rail*: Would still push buttons down when expanded and cause layout shifting.

### Decision 3: Ambient 3D Staging Presentation
- **Choice**: In `state.gameMode = 'lobby'`, keep the Three.js render loop running the illuminated arena floor with idle volumetric fog, subtle camera parallax (controlled by mouse position without pointer lock), and a turntable Identity Disc model floating in the right 65% staging zone. Player character locomotion (WASD) and click-to-throw disc mechanics are disabled.
- **Rationale**: Preserves the visual immersion of the Pure Construct engine while eliminating the 650+ lines of brittle physics, raycasting, and camera toggling from `lobbyCores.js`.
- **Alternatives Considered**:
  - *Static 2D Background Image*: Would save a small amount of GPU overhead, but loses the dynamic lighting, particle glow, and premium feel of the real-time 3D engine.

### Decision 4: Responsive Viewport Adaptation
- **Choice**: Use CSS media queries (`@media (max-width: 768px)`) to transform the tactical rail on mobile portrait and small displays into a full-width bottom command deck with a horizontally scrolling or compact stacked mode grid.
- **Rationale**: Guarantees seamless usability across mobile phones, tablets, and desktop ultrawide monitors without requiring separate HTML templates.

## Risks / Trade-offs

- **[Risk] Test breakage on automated DOM queries** → Existing tests (`test/modes/decoupled_match_entry.test.js`, etc.) query specific button IDs.
  - *Mitigation*: Maintain exact element IDs (`#campaignBtn`, `#swarmBtn`, `#practiceBtn`, `#quickMatchBtn`, `#hostMatchBtn`, `#joinOnlineBtn`, `#armoryBtn`, `#achievementsBtn`) and ensure event bindings in `src/ui/menus.js` remain identical.
- **[Risk] Camera orientation desynchronization upon match start** → Ambient staging camera may have different pitch/yaw than standard match spawn.
  - *Mitigation*: In `startMode()` and arena loading routines, explicitly reset the Three.js camera position and rotation to the active player spawn anchor before releasing controls.
- **[Risk] Touch device usability** → Touch users need easy access to mode launch and directives without keyboard shortcuts.
  - *Mitigation*: Touch tap targets adhere to 44px+ minimum sizing and touch-friendly button padding, with a prominent `[?] DIRECTIVES` touch button in the secondary dock.

## Migration Plan

1. Safely remove `src/ui/lobbyCores.js` and delete all import/instantiation references across `src/ui/menus.js`, `src/core/main.js`, and `src/ui/hud.js`.
2. Refactor `src/ui/menus.js`:
   - Rewrite `getMainMenuHtml()` to output the Tactical Rail and Directives modal markup.
   - Clean up `activate3DLobbyView()` and `deactivate3DLobbyView()` to toggle menu states cleanly without `.lobby-3d` pointer-events suppression.
3. Update `index.html` CSS:
   - Implement `.tactical-rail`, `.rail-header`, `.mode-directives`, `.utility-dock`, and responsive mobile rules.
   - Remove obsolete `.lobby-3d` rules and unused 3D lobby CSS.
4. Update `src/ui/modals/SettingsModal.js` to remove Energy Core Launch Confirmation toggles.
5. Run full test suite (`node test/runner.js`) to guarantee 100% test pass rate.
