# Main Menu Specification

## Purpose

Defines the Left-Aligned Tactical Rail main menu interface, primary game mode selection, dedicated directives modal, and ambient 3D staging presentation for Arc League.

## Requirements

### Requirement: Left-Aligned Tactical Rail Menu Interface
The system SHALL render the primary main menu as an asymmetric tactical rail docked to the left 35% of the viewport on desktop displays, presenting official title branding, player status, and primary mode directives above the fold with zero vertical scrolling.

#### Scenario: Main menu layout on widescreen desktop
- **WHEN** the player enters or returns to the Main Menu on a widescreen viewport
- **THEN** the interface renders docked to the left with canonical Arc League title branding, player identity summary, and primary game mode buttons visible without vertical scrollbars.

#### Scenario: Responsive layout on narrow viewports
- **WHEN** the player loads or resizes the Main Menu on a narrow viewport (< 768px)
- **THEN** the tactical rail transforms into a centered, full-width responsive command deck while maintaining complete access to all primary mode directives.

### Requirement: Dedicated Directives and Controls Modal
The system SHALL isolate desktop keybindings and mobile touch control instructions in a standalone Directives & Controls modal dialog accessible via a dedicated button on the main menu, keeping the primary rail unobstructed.

#### Scenario: Opening Directives modal on desktop
- **WHEN** the player clicks the Directives button or presses `?` from the main menu
- **THEN** the Directives modal opens displaying desktop key mappings for movement, disc throw, curve spin, shield parry, and jump.

#### Scenario: Opening Directives modal on mobile
- **WHEN** the player taps the Directives button on a touch-enabled device
- **THEN** the Directives modal opens displaying touch gesture diagrams and virtual stick instructions.

#### Scenario: Dismissing Directives modal
- **WHEN** the player clicks the modal dismiss button, clicks outside the modal card, or presses Escape
- **THEN** the Directives modal closes cleanly and focus returns to the primary main menu rail.

### Requirement: Ambient 3D Staging Presentation
The system SHALL display an ambient, non-interactive 3D athlete character diorama across the unobstructed viewport canvas featuring the player's customized 3D Athlete Rig with equipped cosmetic skins, executing an autonomous idle animation loop with periodic leaps and telekinetic disc throw/catch cycles, and SHALL completely tear down active match entities, projectiles, hazard states, and combat HUD surfaces upon returning to the main menu.

#### Scenario: Ambient scene active in main menu
- **WHEN** the main menu is displayed
- **THEN** the 3D WebGL canvas renders the glowing arena environment with the player's 3D Athlete Rig executing an autonomous diorama loop with spinning Identity Disc while locomotion keys (W, A, S, D) and click-to-throw disc mechanics remain disabled.

#### Scenario: Clean transition into match
- **WHEN** the player launches any game mode from the tactical rail
- **THEN** the main menu overlay hides, the ambient staging diorama pauses/despawns, pointer lock triggers on match start, and active combat controls initialize immediately.

#### Scenario: Returning to main menu from active match
- **WHEN** the player cancels or exits an active or paused match to return to the main menu
- **THEN** all active combat bot entities and combat discs are disposed and removed from the scene, match timers and hazards are cleared, the combat HUD overlay (reticle, status meters, score/cycle panel) is hidden, and the ambient 3D character diorama activates cleanly.

### Requirement: Secondary System Navigation Dock
The system SHALL provide a compact secondary utility dock at the base of the tactical rail giving instant access to Outfitting (Armory), Trophy Matrix (Achievements), System Settings, and Directives.

#### Scenario: Navigating to Outfitting from main menu dock
- **WHEN** the player activates the Outfitting button on the tactical rail dock
- **THEN** the Armory modal opens smoothly without requiring 3D locomotion or spatial navigation.

#### Scenario: Navigating to Trophy Matrix from main menu dock
- **WHEN** the player activates the Trophy Matrix button on the tactical rail dock
- **THEN** the Achievements modal opens displaying player trophies and milestones.
