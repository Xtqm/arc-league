# Tasks

## 1. Main Menu Rail & Utility Dock Lexicon Overhaul

- [ ] 1.1 Create branch `change/federation-menu-and-swarm-modal` from `main` and verify active branch is `change/federation-menu-and-swarm-modal`
- [ ] 1.2 Update `getMainMenuHtml()` and bindings in `src/ui/menus.js` and `index.html` CSS to render `FEDERATION TOUR`, `SWARM PROTOCOL`, `APEX TRIALS` (`#apexTrialsBtn`), `AI PRACTICE`, `ARC LEAGUE RANKED`, `HOST FRIENDLY MATCH`, `JOIN FRIENDLY MATCH`, and dock buttons `ATHLETE LOADOUT`, `CONTRACTS` (`#contractsBtn`), `ACHIEVEMENTS`, `CONTROLS`, and `SETTINGS`; verify desktop and mobile rail layout without vertical overflow
- [ ] 1.3 Update `src/ui/modals/DirectivesModal.js` visible headings/copy from `DIRECTIVES` to `CONTROLS` while keeping `?` hotkey and legacy global aliases intact; verify modal open/close and focus restoration

## 2. Swarm Protocol Deployment Modal

- [ ] 2.1 Implement `src/ui/modals/SwarmModeModal.js` presenting `STANDARD` (Arc Credits + XP) and `HARDCORE` (Sparks + XP, showing locked state when `stats.swarmHighestWave < 10`) options, keyboard Escape/backdrop dismissal, and launch hooks into `startSoloSwarm({ hardcore })`; verify modal open, lock gating, and mode launch
- [ ] 2.2 Remove the inline `#survivalVariantToggle` from `src/ui/menus.js` and wire `#swarmBtn` (`SWARM PROTOCOL`) to open `SwarmModeModal`; verify both Standard and Hardcore runs initialize with correct `state.isHardcoreSurvival` flag

## 3. Loadout, Identity & Achievements Surface Alignment

- [ ] 3.1 Update `src/ui/modals/ArmoryModal.js` and `src/ui/authTerminal.js` to display `ATHLETE LOADOUT`, dual live **Arc Credits (AC)** and **Sparks** counters, and updated Program Hub tab titles (`[ ATHLETE LOADOUT ]`, `[ ACHIEVEMENTS ]`), verifying live balance updates on `EconomyManager` events
- [ ] 3.2 Update `src/ui/modals/AchievementsModal.js` headers and copy to `ACHIEVEMENTS` and `Fracture` terminology, verifying rendering and claim flows

## 4. Verification

- [ ] 4.1 Update affected menu/UI assertions in `test/` and run `npm test` on branch `change/federation-menu-and-swarm-modal` confirming all suites pass
