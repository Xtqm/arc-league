# Spec Delta

## MODIFIED Requirements

### Requirement: Diegetic Main Menu Armory Navigation and Live Balance Counter
The system SHALL provide an `ATHLETE LOADOUT` entrypoint within the main menu dock that displays the Loadout modal, featuring category navigation tabs (`KINETIC DISCS`, `ATHLETE RIGS`, `STADIUM ARENAS`), modal dismiss controls, and reactive live Arc Credits (`AC`) and `Sparks` balance counters.

#### Scenario: Initial page load rendering of Armory navigation button
- **WHEN** the main menu renders upon initial application load
- **THEN** `#armoryBtn` is present in `#utilityDock` labeled `ATHLETE LOADOUT`, while the Program Hub tab aligns with `[ ATHLETE LOADOUT ]`.

#### Scenario: Opening Armory modal from main menu
- **WHEN** the player clicks `ATHLETE LOADOUT` or activates `[ ATHLETE LOADOUT ]` in the Program Hub
- **THEN** the system pauses background menu interactions, unlocks the cursor, displays the Loadout interface, defaults to `KINETIC DISCS`, and stages the equipped or first catalog item in the 3D preview bay.

#### Scenario: Displaying and updating live Bit balance counter
- **WHEN** the Athlete Loadout modal is opened or when currency changes occur via purchase or earning
- **THEN** the balance display renders both `{credits} AC` and `{sparks} SPARKS` without legacy `BITS` wording and immediately updates upon any economy balance change.

#### Scenario: Switching catalog category tabs
- **WHEN** the player clicks a category tab (`KINETIC DISCS`, `ATHLETE RIGS`, or `STADIUM ARENAS`)
- **THEN** the system sets the active category tab state, populates the catalog grid with items belonging to that category, and stages the first item of that category in the 3D preview bay.

#### Scenario: Armory dismiss control in Program Hub
- **WHEN** the Loadout view is displayed within the Program Hub modal
- **THEN** internal return/dismiss buttons (`[ESC // RETURN]`) are omitted, leaving modal exit exclusively to the Hub's top-right dismiss control.
