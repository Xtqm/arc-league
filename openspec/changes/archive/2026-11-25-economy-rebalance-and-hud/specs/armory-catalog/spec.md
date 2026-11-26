# Spec Delta

## MODIFIED Requirements

### Requirement: Shader and Visual Parameter Specification
The system SHALL define structured visual rendering parameters for all cosmetic items, including primary color, secondary emissive color, trail opacity, and wireframe toggle, enforcing sanitized 6-digit hexadecimal format (`#rrggbb`), and SHALL define rebalanced Arc Credits costs totaling 62,200 AC alongside Sparks-exclusive prestige unlocks.

#### Scenario: Retrieving visual parameters for rendering
- **WHEN** a graphics pipeline reads an item's visual properties
- **THEN** the item definition provides normalized primaryHex, secondaryEmissiveHex, trailOpacity, and wireframeToggle.

#### Scenario: Free baseline cosmetics configuration
- **WHEN** default baseline items (`disc_default`, `chassis_default`, `arena_grid_01`, `disc_standard`) are queried
- **THEN** the system provides default cyan and blue Arc League athletic grid aesthetics with unlockType set to free and cost 0.

#### Scenario: Rebalanced Arc Credits catalog pricing
- **WHEN** purchasable Arc Credits items are queried from the catalog
- **THEN** Kinetic Discs (`disc_neon_amber`: 1200, `disc_retro_green`: 2000, `disc_plasma_violet`: 3500, `disc_delta_triad`: 5500, `disc_quantum_quad`: 8000), Athlete Rigs (`chassis_infiltrator`: 2500, `chassis_iso_guardian`: 5000, `chassis_black_guard`: 9500), and Stadium Arenas (`arena_zero_g_nexus`: 10000, `arena_derez_chasm`: 15000) reflect a total purchasable catalog cost of 62,200 AC.

#### Scenario: Sparks-exclusive prestige catalog configuration
- **WHEN** `disc_hex_dark_matter` and `disc_shuriken_void` are queried from the catalog
- **THEN** `disc_hex_dark_matter` has `unlockType` set to `sparks` with cost 75 (replacing legacy 0 cost) and `disc_shuriken_void` has `unlockType` set to `sparks` with cost 100 and `achievementId` set to null.

### Requirement: Purchase Feasibility and Affordability Validation
The system SHALL validate purchase eligibility before executing a transaction, checking existing ownership, Arc Credits or Sparks balance affordability according to `unlockType`, and achievement gating.

#### Scenario: Checking affordability for affordable locked item
- **WHEN** a player with sufficient Arc Credits queries purchase feasibility for an unowned credits-priced item
- **THEN** the system reports purchase eligibility as true.

#### Scenario: Checking affordability with insufficient Bits
- **WHEN** a player with fewer Arc Credits than the item cost queries purchase feasibility
- **THEN** the system reports purchase eligibility as false.

#### Scenario: Checking purchase eligibility for already owned item
- **WHEN** checking purchase feasibility for an item the player already owns
- **THEN** the system rejects the purchase query with an item-already-owned status.

#### Scenario: Checking purchase eligibility for achievement-gated item
- **WHEN** checking purchase feasibility for an item gated by an unearned achievement
- **THEN** the system rejects purchase eligibility.

### Requirement: Atomic Currency Spending and Inventory Grant
The system SHALL execute atomic Arc Credits or Sparks deduction via the economy engine and immediately append the granted item identifier to persistent inventory storage upon a valid purchase.

#### Scenario: Successfully purchasing a Bits-priced item
- **WHEN** an eligible purchase is requested for a valid locked Arc Credits item
- **THEN** the system deducts the item cost in Arc Credits via EconomyManager, appends the item identifier to the relevant inventory category in StorageManager, persists the state, and returns true.

#### Scenario: Rejecting purchase when currency deduction fails
- **WHEN** a purchase is attempted with insufficient currency or invalid parameters
- **THEN** the system leaves inventory unchanged, aborts the transaction, and returns false.

#### Scenario: Emitting item unlock event
- **WHEN** an item is successfully purchased and unlocked
- **THEN** the system broadcasts an ARMORY_ITEM_UNLOCKED event containing category, itemId, item metadata, and cost.

### Requirement: Diegetic Main Menu Armory Navigation and Live Balance Counter
The system SHALL provide an Armory entrypoint within the main menu interface that displays the Armory modal, featuring category navigation tabs (`KINETIC DISCS`, `ATHLETE RIGS`, `STADIUM ARENAS`), modal dismiss controls, and reactive live Arc Credits and Sparks balance counters.

#### Scenario: Initial page load rendering of Armory navigation button
- **WHEN** the main menu renders upon initial application load
- **THEN** `#armoryBtn` is present in `#mainMenuButtons` with compatibility bindings, while the primary player access point is elevated to the Program Hub `[ LOADOUT ]` or `[ OUTFITTING ]` tab.

#### Scenario: Opening Armory modal from main menu
- **WHEN** the player clicks the Armory button or activates `[ OUTFITTING ]` in the Program Hub
- **THEN** the system pauses background menu interactions, unlocks the cursor, displays the Armory interface, defaults to the `KINETIC DISCS` category, and stages the equipped or first catalog item in the 3D preview bay.

#### Scenario: Displaying and updating live Bit balance counter
- **WHEN** the Armory modal is opened or when currency changes occur via purchase or earning
- **THEN** the balance display renders the current Arc Credits total formatted as `{balance} AC` without legacy `BITS` wording and immediately updates upon any economy balance change.

#### Scenario: Switching catalog category tabs
- **WHEN** the player clicks a category tab (`KINETIC DISCS`, `ATHLETE RIGS`, or `STADIUM ARENAS`)
- **THEN** the system sets the active category tab state, populates the catalog grid with items belonging to that category, and stages the first item of that category in the 3D preview bay.

#### Scenario: Armory dismiss control in Program Hub
- **WHEN** the Armory view is displayed within the Program Hub modal
- **THEN** internal return/dismiss buttons (`[ESC // RETURN]`) are omitted, leaving modal exit exclusively to the Hub's top-right dismiss control.

### Requirement: Contextual State-Driven Action Bar
The system SHALL render dynamic, state-sensitive action controls for the inspected item based on ownership, affordability, milestone locks, and loadout status using Arc Credits (`AC`) terminology.

#### Scenario: Inspecting an unowned Bit-purchasable item with sufficient Bits
- **WHEN** the inspected item is unowned, costs Arc Credits, and the player has enough Arc Credits to afford it
- **THEN** the action bar displays an enabled `[ ACQUIRE // {cost} AC ]` button.

#### Scenario: Inspecting an unowned Bit-purchasable item with insufficient Bits
- **WHEN** the inspected item is unowned, costs Arc Credits, but the player has fewer Arc Credits than the required cost
- **THEN** the action bar displays a disabled `[ ACQUIRE // {cost} AC ]` button accompanied by an amber warning message indicating insufficient Arc Credits.

#### Scenario: Inspecting an achievement-gated milestone item
- **WHEN** the inspected item requires an unearned achievement
- **THEN** the action bar displays a disabled `[ LOCKED // REQUIRES: {milestoneName} ]` banner.

#### Scenario: Inspecting an owned but unequipped item
- **WHEN** the inspected item is unlocked in inventory but not currently equipped in the active loadout slot
- **THEN** the action bar renders an active `[ EQUIP TO LOADOUT ]` button.

#### Scenario: Inspecting the currently equipped item
- **WHEN** the inspected item matches the player's active loadout slot for that category
- **THEN** the action bar displays an illuminated `[ ACTIVE PROTOCOL ]` cyan badge and disables further equip actions.

### Requirement: Audio-Visual Fabrication Feedback and Purchase Fanfare
The system SHALL synthesize procedural audio sound effects and trigger neon visual fanfare animations upon fabricating or equipping an Armory cosmetic item.

#### Scenario: Executing a cosmetic fabrication purchase
- **WHEN** the player clicks the `[ ACQUIRE // {cost} AC ]` button for an eligible item
- **THEN** the system deducts Arc Credits, grants the item to inventory, synthesizes a digital fabrication laser-sweep sound effect, triggers a pulsing neon border animation across the preview bay, and transforms the action button into `[ EQUIP TO LOADOUT ]`.

#### Scenario: Equipping an unlocked cosmetic item
- **WHEN** the player clicks `[ EQUIP TO LOADOUT ]` for an unlocked item
- **THEN** the system updates the loadout slot, persists the state, synthesizes a confirmation equip audio click, triggers a cyan pulse on the item card, and updates the action bar to display `[ ACTIVE PROTOCOL ]`.
