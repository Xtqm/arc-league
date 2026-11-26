# Main Menu Specification

## Purpose

Defines the Left-Aligned Tactical Rail main menu interface, primary game mode selection, dedicated directives modal, and ambient 3D staging presentation for Arc League.

## Requirements

### Requirement: Left-Aligned Tactical Rail Menu Interface
The system SHALL render the primary main menu as an asymmetric tactical rail docked to the left 35% of the viewport on desktop displays, presenting Arc League Athletic Federation primary mode buttons (`FEDERATION TOUR`, `SWARM PROTOCOL`, `APEX TRIALS`, `AI PRACTICE`, `ARC LEAGUE RANKED`, `HOST FRIENDLY MATCH`, `JOIN FRIENDLY MATCH`) without inline survival toggles.

#### Scenario: Main menu layout on widescreen desktop
- **WHEN** the player enters or returns to the Main Menu on a widescreen viewport
- **THEN** the interface renders docked to the left with canonical Arc League title branding, player identity summary, and all primary Federation mode buttons visible without vertical scrollbars.

#### Scenario: Responsive layout on narrow viewports
- **WHEN** the player loads or resizes the Main Menu on a narrow viewport (< 768px)
- **THEN** the tactical rail transforms into a centered, full-width responsive command deck while maintaining complete access to all primary mode buttons and utility dock actions.

#### Scenario: Tactical button interaction and audio feedback
- **WHEN** the user hovers over or clicks any primary mode button or utility dock button
- **THEN** the button renders a high-velocity neon sheen animation across its face and triggers procedural WebAudio interface audio feedback.

#### Scenario: Integrated survival variant selector
- **WHEN** the player clicks `SWARM PROTOCOL` on the tactical rail
- **THEN** the system opens the dedicated Swarm Protocol deployment modal presenting `STANDARD` and `HARDCORE` choices instead of rendering an inline toggle on the main menu rail.

### Requirement: Dedicated Directives and Controls Modal
The system SHALL isolate desktop keybindings and mobile touch control instructions in a standalone Controls modal dialog labeled `CONTROLS` accessible via the utility dock or `?` hotkey, keeping the primary rail unobstructed.

#### Scenario: Opening Directives modal on desktop
- **WHEN** the player clicks the `CONTROLS` dock button or presses `?` from the main menu
- **THEN** the Controls modal opens displaying desktop key mappings for movement, disc throw, curve spin, shield parry, and jump.

#### Scenario: Opening Directives modal on mobile
- **WHEN** the player taps the `CONTROLS` dock button on a touch-enabled device
- **THEN** the Controls modal opens displaying touch gesture diagrams and virtual stick instructions.

#### Scenario: Dismissing Directives modal
- **WHEN** the player clicks the modal dismiss button, clicks outside the modal card, or presses Escape
- **THEN** the Controls modal closes cleanly and focus returns to the primary main menu rail.

### Requirement: Ambient 3D Staging Presentation
The system SHALL display an ambient, non-interactive 3D athlete character diorama across the unobstructed viewport canvas featuring the player's customized 3D Athlete Rig with equipped cosmetic skins, executing an autonomous idle animation loop featuring periodic two-stage aerial double-jumps with kinetic mid-air bursts and telekinetic disc throw/catch cycles, and SHALL completely tear down active match entities, projectiles, hazard states, and combat HUD surfaces upon returning to the main menu.

#### Scenario: Ambient scene active in main menu
- **WHEN** the main menu is displayed
- **THEN** the 3D WebGL canvas renders the glowing arena environment with the player's 3D Athlete Rig executing an autonomous diorama loop with spinning Identity Disc while locomotion keys (W, A, S, D) and click-to-throw disc mechanics remain disabled.

#### Scenario: Autonomous diorama double-jump execution
- **WHEN** the diorama animation timer triggers the aerial jump action
- **THEN** the 3D Athlete Rig leaps from the pedestal ring, executes a mid-air secondary impulse kick with an energetic particle burst at the primary apex, reaches a secondary height, and descends with an aerodynamic hang-time into a knee-cushioned landing.

#### Scenario: Clean transition into match
- **WHEN** the player launches any game mode from the tactical rail
- **THEN** the main menu overlay hides, the ambient staging diorama pauses/despawns, pointer lock triggers on match start, and active combat controls initialize immediately.

#### Scenario: Returning to main menu from active match
- **WHEN** the player cancels or exits an active or paused match to return to the main menu
- **THEN** all active combat bot entities and combat discs are disposed and removed from the scene, match timers and hazards are cleared, the combat HUD overlay (reticle, status meters, score/cycle panel) is hidden, and the ambient 3D character diorama activates cleanly.

### Requirement: Secondary System Navigation Dock
The system SHALL provide a compact secondary utility dock at the base of the tactical rail giving instant access to `ATHLETE LOADOUT`, `CONTRACTS`, `ACHIEVEMENTS`, `CONTROLS`, and `SETTINGS`.

#### Scenario: Navigating to Outfitting from main menu dock
- **WHEN** the player activates `ATHLETE LOADOUT` on the tactical rail dock
- **THEN** the Loadout (Armory) modal opens smoothly without requiring 3D locomotion or spatial navigation.

#### Scenario: Navigating to Trophy Matrix from main menu dock
- **WHEN** the player activates `ACHIEVEMENTS` on the tactical rail dock
- **THEN** the Achievements modal opens displaying player achievements, progress bars, and claim controls.
