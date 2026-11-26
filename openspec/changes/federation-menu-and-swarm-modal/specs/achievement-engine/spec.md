# Spec Delta

## MODIFIED Requirements

### Requirement: Diegetic Main Menu Trophy Matrix UI Modal
The system SHALL provide an interactive `ACHIEVEMENTS` modal accessible from the main menu dock and Program Hub displaying player achievement progression, completion percentage, unlocked timestamps, reward previews, and interactive claim controls using Fracture terminology.

#### Scenario: Initial page load rendering of Achievements navigation button
- **WHEN** the main menu renders upon initial application load
- **THEN** `#achievementsBtn` is present in `#utilityDock` labeled `ACHIEVEMENTS`, with Program Hub tab access labeled `[ ACHIEVEMENTS ]`.

#### Scenario: Inspection of Trophy Matrix modal
- **WHEN** the user opens the Achievements modal or activates `[ ACHIEVEMENTS ]` in the Program Hub
- **THEN** the system performs active reconciliation against root storage state, displays overall completion percentage, a badge grid of all launch achievements, current progress bars, visual previews of unlockable cosmetic skins, and interactive `[ CLAIM REWARD ]` buttons on claimable cards.

#### Scenario: Trophy Matrix dismiss control in Program Hub
- **WHEN** the Achievements view is displayed within the Program Hub modal
- **THEN** internal return/dismiss buttons (`[ ESC // CLOSE ]`) are omitted, leaving modal exit exclusively to the Hub's top-right dismiss control.

#### Scenario: Claiming reward updates card presentation
- **WHEN** a player claims an achievement reward within the Achievements modal
- **THEN** the card transitions immediately from claimable state to `[ UNLOCKED ]`, the progress bar reflects 100% completion with a neon cyan glow, and notification indicators update in real-time.
