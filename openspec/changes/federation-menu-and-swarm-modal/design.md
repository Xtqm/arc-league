# Design

## Context

See `proposal.md` for motivation. Currently `src/ui/menus.js` renders legacy labels (`LEAGUE CIRCUIT`, `ENTER ARCFIELD (SURVIVAL)`, `PRACTICE (SOLO AI)`, `OUTFITTING`, `TROPHIES`, `DIRECTIVES`) and embeds `#survivalVariantToggle` inline below `#swarmBtn`. Meanwhile `DirectivesModal.js` actually renders keyboard/gamepad/touch Controls.

## Goals / Non-Goals

**Goals:**
- Align all primary rail and utility dock labels to the Arc League Athletic Federation lexicon without harming newcomer comprehension (`AI PRACTICE`, `ATHLETE LOADOUT`, `ACHIEVEMENTS`, `CONTROLS`).
- Replace the inline survival variant toggle with a dedicated **Swarm Deployment Modal** (`SwarmModeModal.js`) presenting `STANDARD` and `HARDCORE` cards clearly.
- Preserve legacy hidden DOM IDs (`#btnSwarmSolo`, `#btnDuelSolo`, `#duelBtn`, `#armoryBtn`, `#achievementsBtn`, `#directivesBtn`) so existing tests and keyboard shortcuts (`?`) remain intact.
- Display both **Arc Credits (AC)** and **Sparks** in the Athlete Loadout header and Identity Dossier.

**Non-Goals:**
- Implementing full Contracts deck logic or Apex Trials event logic inside this change (their `CONTRACTS` and `APEX TRIALS` buttons render clean shells/placeholders if clicked prior to `contracts-system` and `apex-trials-and-spark-vault`, or bind cleanly to their managers when present).

## Decisions

1. **Dedicated `SwarmModeModal` Over Inline Rail Toggle**
   - *Choice*: Extract Standard vs. Hardcore choice into a dedicated modal (`src/ui/modals/SwarmModeModal.js`) triggered by `#swarmBtn` (`SWARM PROTOCOL`).
   - *Rationale*: Removes cramped toggle buttons from the tactical rail, leaves room on the rail for `APEX TRIALS`, and gives clear visual comparison between Standard (AC + XP) and Hardcore (Sparks + XP, Wave 10 lock state).
2. **Preserve Internal DOM IDs While Renaming Visible Copy**
   - *Choice*: Keep `#campaignBtn`, `#swarmBtn`, `#practiceBtn`, `#quickMatchBtn`, `#armoryBtn`, `#achievementsBtn`, `#directivesBtn`, `#settingsBtn` as the element IDs, adding `#apexTrialsBtn` and `#contractsBtn` cleanly.
   - *Rationale*: Minimizes breakage across CSS selectors, keyboard handlers, and automated UI tests.
3. **Rename Controls Surface Copy Without Breaking `DirectivesModal` Export**
   - *Choice*: Update visible title and dock label of `DirectivesModal.js` from `DIRECTIVES & CONTROLS` / `DIRECTIVES` to `CONTROLS`, retaining the `?` shortcut and `window.__tronOpenDirectives` compatibility aliases.
   - *Rationale*: Eliminates terminology collision between Controls and Contracts/Missions.

## Risks / Trade-offs

- **Existing Playwright or DOM text assertions matching `"LEAGUE CIRCUIT"` or `"OUTFITTING"`** → Audit `test/` and `openspec/` assertions in the same task group so UI tests validate the new Federation copy.
- **Unimplemented modals before Changes 3 & 4 land** → Wire `#contractsBtn` and `#apexTrialsBtn` to invoke registered modal singletons if available, or show a clean "PROTOCOL STANDING BY" status badge until Changes 3 & 4 mount them.
