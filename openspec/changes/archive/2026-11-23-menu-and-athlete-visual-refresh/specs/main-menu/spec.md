# Spec Delta: Main Menu

## MODIFIED Requirements

### Requirement: Left-Aligned Tactical Rail Menu Interface
The system SHALL render the primary main menu as an asymmetric tactical rail docked to the left 35% of the viewport on desktop displays, styled with chamfered cyberpunk geometry, hairline neon corner accents, and a high-contrast dark slate-glass backdrop. The rail SHALL present official title branding, responsive guest/user status telemetry, primary mode directives with distinct visual hierarchy, an integrated flush sub-mode toggle, and interactive light-sheen hover feedback.

#### Scenario: Main menu layout on widescreen desktop
- **WHEN** the player enters or returns to the Main Menu on a widescreen viewport
- **THEN** the interface renders docked to the left with canonical Arc League title branding, player identity summary, and primary game mode buttons visible without vertical scrollbars.

#### Scenario: Responsive layout on narrow viewports
- **WHEN** the player loads or resizes the Main Menu on a narrow viewport (< 768px)
- **THEN** the tactical rail transforms into a centered, full-width responsive command deck while maintaining complete access to all primary mode directives and utility dock actions.

#### Scenario: Tactical button interaction and audio feedback
- **WHEN** the user hovers over or clicks any primary mode directive or utility button
- **THEN** the button renders a high-velocity neon sheen animation across its face and triggers procedural WebAudio interface audio feedback.

#### Scenario: Integrated survival variant selector
- **WHEN** the player interacts with the Arcfield Survival mode card on the tactical rail
- **THEN** the interface displays an integrated flush segment toggle switching between Standard and Hardcore rules without disjointed nested bounding boxes.

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
