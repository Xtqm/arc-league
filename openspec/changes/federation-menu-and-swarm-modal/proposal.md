# Proposal

## Why

The current main menu uses inconsistent or confusing labels (`LEAGUE CIRCUIT`, `PRACTICE (SOLO AI)`, `OUTFITTING`, `TROPHIES`, `DIRECTIVES` for Controls) and embeds a cramped Standard/Hardcore toggle directly inside the survival card. Aligning the entire menu and modal navigation around the high-tech **Arc League Athletic Federation** lexicon and introducing a clean **Swarm Protocol** deployment modal (Standard vs. Hardcore) makes every entry point immediately intuitive to new players while preparing the surface for Contracts and Apex Trials.

## What Changes

- **Main Menu & Dock Lexicon Overhaul**:
  - Primary Rail buttons: `FEDERATION TOUR` (Campaign), `SWARM PROTOCOL` (opens Swarm modal), `APEX TRIALS` (entrypoint badge/shell for Events), `AI PRACTICE` (Solo AI Practice), `ARC LEAGUE RANKED` (Quick Match), and `HOST / JOIN FRIENDLY`.
  - Utility Dock buttons: `ATHLETE LOADOUT` (Armory), `CONTRACTS` (entrypoint for Contracts modal), `ACHIEVEMENTS` (Achievements modal), `CONTROLS` (formerly `DIRECTIVES`, retaining `?` hotkey), and `SETTINGS`.
- **Swarm Protocol Deployment Modal**: Replace the inline survival variant toggle on the main menu rail with a dedicated modal triggered by clicking `SWARM PROTOCOL`, presenting two clear cards: **STANDARD** (Arc Credits + XP) and **HARDCORE** (Sparks + XP, showing Wave 10 Standard unlock status when locked).
- **Loadout & Identity Balance Surfaces**: Update Armory/Loadout modal headers to `ATHLETE LOADOUT`, display both **Arc Credits (AC)** and **Sparks** in the live balance header and identity dossier, and align Achievements modal labels with `ACHIEVEMENTS` and `Fracture` terminology.

## Capabilities

### New Capabilities
- *(None — updates menu navigation, mode selection UX, and loadout/achievements UI copy)*

### Modified Capabilities
- `main-menu`: Replace inline survival toggle with `SWARM PROTOCOL` modal trigger, rename primary rail buttons (`FEDERATION TOUR`, `APEX TRIALS`, `AI PRACTICE`, `ARC LEAGUE RANKED`), rename Controls modal trigger (`CONTROLS`), and update utility dock navigation (`ATHLETE LOADOUT`, `CONTRACTS`, `ACHIEVEMENTS`, `CONTROLS`, `SETTINGS`).
- `game-modes`: Launch Standard and Hardcore Swarm from the dedicated Swarm Protocol deployment modal while preserving Hardcore unlock gating (`swarmHighestWave >= 10` in Standard Swarm).
- `armory-catalog`: Update Armory UI surface naming to `ATHLETE LOADOUT` and display live Arc Credits and Sparks balances in the header.
- `achievement-engine`: Align Achievements UI modal labels with `ACHIEVEMENTS` and `Fracture` terminology, removing legacy Trophy Matrix / Directives wording.

## Impact

- `src/ui/menus.js`, `src/ui/modals/DirectivesModal.js`, `src/ui/modals/ArmoryModal.js`, `src/ui/modals/AchievementsModal.js`, `src/ui/authTerminal.js`, `index.html`, and menu/navigation Playwright or unit checks.
