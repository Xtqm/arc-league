# Spec Delta

## MODIFIED Requirements

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
