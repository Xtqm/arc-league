# armory-catalog Specification

## Purpose
Establishes the authoritative Armory catalog registry, cosmetic shader metadata, atomic purchase validation pipeline, inventory entitlement tracking, and persistent loadout controller for Tron Disc Arena (SPEC-ARMORY-001 Phase 1).

## Requirements

### Requirement: Categorized Armory Item Metadata Registry
The system SHALL maintain a structured catalog registry indexing cosmetic items and functional variants across four core categories: discSkins, chassisSkins, unlockedMaps, and discTypes.

#### Scenario: Querying catalog items by category
- **WHEN** a system requests all items for a valid category (`discSkins`, `chassisSkins`, `unlockedMaps`, or `discTypes`)
- **THEN** the system returns an array of immutable catalog item records containing id, displayName, category, cost, unlockType, and visual parameters.

#### Scenario: Querying with invalid category
- **WHEN** a system requests items for an unrecognized category
- **THEN** the system returns an empty list without throwing an unhandled exception.

#### Scenario: Looking up item by identifier
- **WHEN** a system queries a specific item ID across the catalog
- **THEN** the system returns the corresponding catalog item definition or null if not found.

### Requirement: Shader and Visual Parameter Specification
The system SHALL define structured visual rendering parameters for all cosmetic items, including primary color, secondary emissive color, trail opacity, and wireframe toggle, enforcing sanitized 6-digit hexadecimal format (`#rrggbb`).

#### Scenario: Retrieving visual parameters for rendering
- **WHEN** a graphics pipeline reads an item's visual properties
- **THEN** the item definition provides normalized primaryHex, secondaryEmissiveHex, trailOpacity, and wireframeToggle.

#### Scenario: Free baseline cosmetics configuration
- **WHEN** default baseline items (`disc_default`, `chassis_default`, `arena_grid_01`) are queried
- **THEN** the system provides default cyan and blue Arc League athletic grid aesthetics with unlockType set to free.

### Requirement: Unlock Condition and Ownership Verification
The system SHALL verify item ownership and unlock criteria based on stored inventory, default entitlements, and achievement requirements.

#### Scenario: Verifying free or default item ownership
- **WHEN** checking unlock status for default free items
- **THEN** the system identifies the item as unlocked even if absent from stored inventory arrays.

#### Scenario: Verifying purchased item ownership
- **WHEN** checking unlock status for an item present in the player's stored inventory category
- **THEN** the system returns true.

#### Scenario: Verifying locked item ownership
- **WHEN** checking unlock status for an unpurchased item that is not free and not in stored inventory
- **THEN** the system returns false.

### Requirement: Purchase Feasibility and Affordability Validation
The system SHALL validate purchase eligibility before executing a transaction, checking existing ownership, Bit balance affordability, and achievement gating.

#### Scenario: Checking affordability for affordable locked item
- **WHEN** a player with sufficient Bits queries purchase feasibility for an unowned Bits-priced item
- **THEN** the system reports purchase eligibility as true.

#### Scenario: Checking affordability with insufficient Bits
- **WHEN** a player with fewer Bits than the item cost queries purchase feasibility
- **THEN** the system reports purchase eligibility as false.

#### Scenario: Checking purchase eligibility for already owned item
- **WHEN** checking purchase feasibility for an item the player already owns
- **THEN** the system rejects the purchase query with an item-already-owned status.

#### Scenario: Checking purchase eligibility for achievement-gated item
- **WHEN** checking purchase feasibility for an item gated by an unearned achievement
- **THEN** the system rejects purchase eligibility.

### Requirement: Atomic Currency Spending and Inventory Grant
The system SHALL execute atomic Bits deduction via the economy engine and immediately append the granted item identifier to persistent inventory storage upon a valid purchase.

#### Scenario: Successfully purchasing a Bits-priced item
- **WHEN** an eligible purchase is requested for a valid locked item
- **THEN** the system deducts the item cost via EconomyManager, appends the item identifier to the relevant inventory category in StorageManager, persists the state, and returns true.

#### Scenario: Rejecting purchase when currency deduction fails
- **WHEN** a purchase is attempted with insufficient Bits or invalid parameters
- **THEN** the system leaves inventory unchanged, aborts the transaction, and returns false.

#### Scenario: Emitting item unlock event
- **WHEN** an item is successfully purchased and unlocked
- **THEN** the system broadcasts an ARMORY_ITEM_UNLOCKED event containing category, itemId, item metadata, and cost.

### Requirement: Loadout Configuration and Equipment Management
The system SHALL manage active equipped items across all loadout categories, enforcing ownership validation before permitting equipment changes.

#### Scenario: Equipping an unlocked item
- **WHEN** a player equips an unlocked item in a valid category
- **THEN** the system updates the corresponding loadout slot in StorageManager, persists the change, and emits a LOADOUT_CHANGED event.

#### Scenario: Rejecting equipping a locked item
- **WHEN** a player attempts to equip an item that is locked and unowned
- **THEN** the system rejects the request, retains the previous equipped item, and returns false.

#### Scenario: Retrieving equipped loadout
- **WHEN** the game queries the active loadout
- **THEN** the system returns the current equipped item identifiers for disc skins, chassis skins, active map, and disc type.

### Requirement: Dynamic Identity Disc Cosmetic Material Application
The system SHALL apply active disc skin cosmetic configurations to the player's 3D Kinetic Disc mesh instances according to the Arc League ballistic implement architecture: rendering the structural airframe with tactile composite PBR properties, channeling primary color into the energized kinetic strike rim, driving secondary emissive color into the magnetic induction tether rotor, and displaying a smoked hardlight stabilizer face.

#### Scenario: Applying standard emissive disc skin
- **WHEN** an equipped disc skin without wireframe is applied to an Identity Disc mesh
- **THEN** the outer airframe displays dark beveled composite PBR material properties, the strike rim channel reflects `shader.primaryHex`, the PointLight radiance matches `shader.primaryHex`, the magnetic induction core rotor is tinted by `shader.secondaryEmissiveHex`, the face displays a smoked hardlight lens, and any wireframe overlay mesh is hidden or removed.

#### Scenario: Applying wireframe overlay disc skin
- **WHEN** an equipped disc skin with `wireframeToggle: true` (e.g. `disc_corrupted_void`) is applied
- **THEN** the system attaches or activates an accented vector telemetry wireframe overlay on the disc geometry styled with secondary emissive coloration while preserving the kinetic strike rim and induction core.

#### Scenario: Dynamic skin swap on loadout changed event
- **WHEN** `ArmoryManager` emits a `LOADOUT_CHANGED` event for category `discSkins`
- **THEN** the system immediately updates the player's active held disc mesh and unthrown disc state to reflect the newly equipped disc skin parameters.

### Requirement: Dynamic Disc Flight Ribbon and Trail Interpolation
The system SHALL configure continuous additive projectile flight ribbon meshes and particle streaks generated by thrown discs using the active disc skin's primary color, secondary emissive color, glow intensity, and opacity parameters.

#### Scenario: Spawning flight ribbon for equipped disc skin
- **WHEN** a player throws a Kinetic Arc Disc with an equipped cosmetic skin while particles are enabled
- **THEN** the spawned continuous ribbon mesh adopts `shader.primaryHex` at its leading edge, interpolates smoothly toward `shader.secondaryEmissiveHex` along its tail length, and clamps peak opacity to `shader.trailOpacity`.

#### Scenario: Retaining owner skin styling through bounces
- **WHEN** a thrown cosmetically-skinned disc deflects off walls or arena pillars
- **THEN** the disc retains its owner's cosmetic skin and continuous ribbon color interpolation until caught or deflected by an opponent.

### Requirement: Dynamic Program Chassis Material Configuration
The system SHALL apply equipped chassis skin configurations to the player construct 3D rig, adjusting faceted armor plating PBR properties (roughness, metalness, diffuse tone) and updating HDR emissive colors across the chest core, tilted halo, visor slit, hairline plate edge trims, hover tips, and Hover-Palm disc using sanitized color values.

#### Scenario: Applying chassis skin to player rig
- **WHEN** an equipped chassis skin is applied to the player construct model
- **THEN** the faceted armor plate standard materials receive the skin's roughness, metalness, and tint values while HDR emissives (core, tilted halo, edge trim, hover tips) update to sanitized `shader.primaryHex`, `shader.secondaryEmissiveHex`, and scaled `glowIntensity`.

#### Scenario: Synchronizing back-mounted disc with equipped disc skin
- **WHEN** player construct materials are updated or initialized
- **THEN** the Hover-Palm held disc mesh floating above the player's right palm synchronizes its visual colors and ballistic implement architecture with the active equipped disc skin.

### Requirement: Memory-Safe WebGL Resource Disposal and Uniform Mutation
The system SHALL mutate Three.js Color instances, scalar uniforms, and opacity properties in-place where materials persist, and SHALL explicitly call `.dispose()` on transient materials, geometries, and textures when items are swapped or discarded.

#### Scenario: In-place material property mutation
- **WHEN** swapping between cosmetics that share compatible material types
- **THEN** the system updates color, emissive, and opacity properties directly on existing materials without constructing new material instances.

#### Scenario: Disposal of transient wireframe or custom materials
- **WHEN** replacing a cosmetic item that instantiated unique auxiliary materials or geometry overlays
- **THEN** the system calls `.dispose()` on discarded auxiliary materials and geometries to release WebGL GPU resources and prevent memory leaks.

### Requirement: Turntable 3D Cosmetic Preview Renderer
The system SHALL provide an isolated Three.js preview scene and camera rig capable of rendering an interactive, rotating 3D preview of any catalog Disc skin or Program Chassis model for inspection within the Armory UI.

#### Scenario: Staging a disc skin for turntable inspection
- **WHEN** the Armory UI requests a preview of a specific disc skin
- **THEN** the preview scene clears existing preview meshes, instantiates the disc model with the specified cosmetic shader configuration, centers it in the camera frustum, and initiates turntable rotation.

#### Scenario: Staging a chassis skin for turntable inspection
- **WHEN** the Armory UI requests a preview of a specific chassis skin
- **THEN** the preview scene instantiates the Program Chassis rig with the specified cosmetic materials, positions the camera at a framed full-body view, and rotates smoothly on the yaw axis.

#### Scenario: Interactive manual rotation and drag controls
- **WHEN** a user interacts with the preview viewport via pointer drag or touch swipe
- **THEN** the preview turntable updates yaw rotation proportionally to pointer delta and resumes auto-rotation when interaction ceases.

#### Scenario: Teardown and disposal of preview renderer
- **WHEN** the preview renderer is destroyed or its parent modal is closed
- **THEN** the system halts the animation loop, removes all objects from the preview sub-scene, disposes materials and geometries, and releases WebGL canvas resources.

### Requirement: Diegetic Main Menu Armory Navigation and Live Balance Counter
The system SHALL provide an Armory entrypoint within the main menu interface that displays the Armory modal, featuring category navigation tabs (`KINETIC DISCS`, `ATHLETE RIGS`, `STADIUM ARENAS`), modal dismiss controls, and a reactive live Arc Credits balance counter.

#### Scenario: Initial page load rendering of Armory navigation button
- **WHEN** the main menu renders upon initial application load
- **THEN** `#armoryBtn` is present in `#mainMenuButtons` with compatibility bindings, while the primary player access point is elevated to the Program Hub `[ LOADOUT ]` or `[ OUTFITTING ]` tab.

#### Scenario: Opening Armory modal from main menu
- **WHEN** the player clicks the Armory button or activates `[ OUTFITTING ]` in the Program Hub
- **THEN** the system pauses background menu interactions, unlocks the cursor, displays the Armory interface, defaults to the `KINETIC DISCS` category, and stages the equipped or first catalog item in the 3D preview bay.

#### Scenario: Displaying and updating live Bit balance counter
- **WHEN** the Armory modal is opened or when currency changes occur via purchase or earning
- **THEN** the balance display renders the current Arc Credits total formatted as `CR {balance}` and immediately updates upon any economy balance change.

#### Scenario: Switching catalog category tabs
- **WHEN** the player clicks a category tab (`KINETIC DISCS`, `ATHLETE RIGS`, or `STADIUM ARENAS`)
- **THEN** the system sets the active category tab state, populates the catalog grid with items belonging to that category, and stages the first item of that category in the 3D preview bay.

#### Scenario: Armory dismiss control in Program Hub
- **WHEN** the Armory view is displayed within the Program Hub modal
- **THEN** internal return/dismiss buttons (`[ESC // RETURN]`) are omitted, leaving modal exit exclusively to the Hub's top-right dismiss control.

### Requirement: Split-Pane Catalog Grid and Integrated 3D Turntable Preview Bay
The system SHALL present a split-pane layout inside the Armory modal containing a scrollable item grid on the left and an interactive 3D turntable preview viewport with an item lore dossier on the right.

#### Scenario: Populating the scrollable item grid
- **WHEN** a category is selected in the Armory modal
- **THEN** the left pane displays a scrollable grid of item cards, each indicating item name, cost or unlock requirement, rarity accent, and current ownership/equipped badge.

#### Scenario: Selecting an item for 3D inspection
- **WHEN** the player clicks an item card in the catalog grid
- **THEN** the item card is marked with active focus styling, the right pane updates its dossier with the item's name, description, and shader parameters, and the 3D turntable bay immediately stages and rotates the selected item model.

#### Scenario: Interactive manual rotation in preview bay
- **WHEN** the player drags or swipes across the 3D preview viewport
- **THEN** the turntable rotates smoothly along yaw and pitch axes matching pointer movement, and automatically resumes idle auto-rotation after pointer release.

#### Scenario: Modal closure and WebGL resource teardown
- **WHEN** the Armory modal is closed via close button, overlay click, or Escape key
- **THEN** the system stops the turntable render loop, disposes all staged geometries and materials in the preview scene, hides the modal overlay, and restores the main menu view.

### Requirement: Contextual State-Driven Action Bar
The system SHALL render dynamic, state-sensitive action controls for the inspected item based on ownership, affordability, milestone locks, and loadout status.

#### Scenario: Inspecting an unowned Bit-purchasable item with sufficient Bits
- **WHEN** the inspected item is unowned, costs Arc Credits, and the player has enough Credits to afford it
- **THEN** the action bar displays an enabled `[ ACQUIRE // {cost} CREDITS ]` button.

#### Scenario: Inspecting an unowned Bit-purchasable item with insufficient Bits
- **WHEN** the inspected item is unowned, costs Arc Credits, but the player has fewer Credits than the required cost
- **THEN** the action bar displays a disabled `[ ACQUIRE // {cost} CREDITS ]` button accompanied by an amber warning message indicating insufficient Credits.

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
- **WHEN** the player clicks the `[ FABRICATE // {cost} BITS ]` button for an eligible item
- **THEN** the system deducts Bits, grants the item to inventory, synthesizes a digital fabrication laser-sweep sound effect, triggers a pulsing neon border animation across the preview bay, and transforms the action button into `[ EQUIP TO LOADOUT ]`.

#### Scenario: Equipping an unlocked cosmetic item
- **WHEN** the player clicks `[ EQUIP TO LOADOUT ]` for an unlocked item
- **THEN** the system updates the loadout slot, persists the state, synthesizes a confirmation equip audio click, triggers a cyan pulse on the item card, and updates the action bar to display `[ ACTIVE PROTOCOL ]`.

### Requirement: Direct Achievement Reward Entitlement Unlocking
The system SHALL provide an authoritative method (`unlockRewardItem`) on the Armory manager to directly grant cosmetic rewards awarded by achievements into persistent inventory and broadcast unlock notifications.

#### Scenario: Granting an achievement cosmetic skin
- **WHEN** an achievement unlock awards a cosmetic item (such as `disc_corrupted_void` or `chassis_arbiter`)
- **THEN** the system validates the item identifier, appends it to the category's persistent inventory array, commits storage, and emits an `ARMORY_ITEM_UNLOCKED` event.

#### Scenario: Granting an already owned reward skin
- **WHEN** an achievement reward is granted for an item already unlocked in persistent inventory
- **THEN** the system prevents duplicate inventory entries and completes idempotently.

### Requirement: In-Browser Developer Cosmetic Studio Interface
The system SHALL provide an interactive developer modal overlay launched via browser console hooks (`window.gameDebug.openStudio` and `window.gameDebug.armory.openStudio`), exposing real-time visual design controls paired with a live 3D turntable preview bay.

#### Scenario: Launching studio from developer console
- **WHEN** a developer invokes `window.gameDebug.openStudio()` in the browser console
- **THEN** the system pauses game background camera pointer-lock, mounts the `#cosmeticStudioModal` interface, renders an active 3D turntable scene, and sets focus to the studio controls.

#### Scenario: Switching cosmetic categories inside studio
- **WHEN** the developer changes the category selector between Kinetic Discs and Athlete Rigs
- **THEN** the studio swaps the staged turntable 3D mesh between a Kinetic Disc and an Athlete Rig, updating the visible control inputs to reflect category-specific parameters.

#### Scenario: Closing the studio
- **WHEN** the developer triggers the studio close button or invokes `window.gameDebug.closeStudio()`
- **THEN** the system cleanly disposes of the studio turntable WebGL resources, detaches listeners, and hides the modal overlay.

### Requirement: Real-Time Shader and PBR Parameter Tuning
The system SHALL update the active 3D turntable mesh materials instantaneously in response to UI input events for color, emissive, glow intensity, flight trail opacity, wireframe overlays, and PBR surface parameters without requiring page refreshes.

#### Scenario: Adjusting primary and emissive colors
- **WHEN** the developer changes the primary or secondary emissive color input in the studio
- **THEN** the turntable 3D mesh reflects the new hex colors on emissive trims, point lights, and material shaders within the current frame.

#### Scenario: Tuning PBR surface properties for Athlete Rigs
- **WHEN** the developer adjusts suit hex color, roughness, or metalness controls while inspecting an Athlete Rig
- **THEN** the turntable character model's armor suit material color, roughness, and metalness update in real time.

#### Scenario: Toggling retro wireframe overlay
- **WHEN** the developer enables the retro wireframe toggle
- **THEN** a wireframe overlay mesh is dynamically attached to the turntable model and styled with the secondary emissive color.

### Requirement: Live Player In-Game Preview and Testing
The system SHALL support testing newly tuned cosmetic configurations directly on the active in-game player character rig and kinetic disc without requiring catalog registration or save state modification.

#### Scenario: Testing design on live player
- **WHEN** the developer clicks the "Test on Player" action button in the studio
- **THEN** the system applies the current studio shader and PBR parameters directly to the active in-game player rig and equipped disc instances via the cosmetic material engine.

### Requirement: Formatted Catalog Code Generation
The system SHALL format the active studio cosmetic configuration into an immutable, schema-compliant JavaScript definition and copy it to the developer clipboard.

#### Scenario: Exporting catalog code definition
- **WHEN** the developer clicks the "Copy Catalog Code" button
- **THEN** the system formats the current inputs into a valid `Object.freeze` structure compatible with `ArmoryCatalog.js` and writes the text to the system clipboard.

### Requirement: Procedural Disc Geometry Shape Variants
The system SHALL support procedural 2D geometric disc shapes including triangles, squares, hexagons, and multi-pointed shurikens, normalized to a maximum circumradius of 0.6 meters for strict collision parity with classic circular discs.

#### Scenario: Spawning a triangular disc
- **WHEN** a player equips a disc skin configured with a triangular shape and throws it
- **THEN** the system generates a 3-sided beveled outer rim, translucent face, and central hub rotating symmetrically around the origin without eccentric wobbling.

#### Scenario: Spawning a bladed shuriken disc
- **WHEN** a player equips a disc skin configured with a shuriken shape
- **THEN** the system renders a multi-bladed geometric star whose outer vertex tips do not exceed the canonical 0.6-meter collision radius.

#### Scenario: Fallback to circular torus for legacy skins
- **WHEN** a disc skin definition omits the shape attribute or specifies circle
- **THEN** the system generates the default circular torus and circular face geometry.

### Requirement: Palm-Held Disc Mesh Synchronization
The system SHALL synchronize the 3D geometry and auxiliary visual overlays of the player construct rig's Hover-Palm disc to match the equipped disc skin's geometric shape and shader properties scaled proportionally to the player palm (~0.46), maintaining active retro wireframe overlays across idle, locomotion, and combat stances when enabled.

#### Scenario: Equipping a non-circular disc in Armory
- **WHEN** a player equips a non-circular disc skin in the Armory or during profile loadout hydration
- **THEN** the player character rig's palm-mounted disc mesh updates to the corresponding procedural shape at palm scale (~0.46) with matching materials.

#### Scenario: Palm-held disc wireframe synchronization
- **WHEN** a player equips a disc skin with `wireframeToggle: true`
- **THEN** the system attaches and displays a scaled shape-conforming retro wireframe overlay to the palm-mounted disc mesh while the player is idle, walking, or charging a throw.

### Requirement: Shape-Conforming Retro Wireframe Overlays
The system SHALL render retro wireframe overlays that conform to the exact geometric shape and vertex layout of the active procedural disc across both thrown flight projectiles and palm-held construct discs rather than assuming a circular torus or restricting wireframes to thrown projectiles.

#### Scenario: Toggling wireframe on a shaped disc
- **WHEN** a disc skin with wireframe enabled is applied to a non-circular disc mesh
- **THEN** the system attaches an auxiliary wireframe overlay matching the active polygon silhouette.

#### Scenario: Persistent wireframe visibility during idle and flight
- **WHEN** a kinetic disc with an active wireframe configuration is held in the player's palm or thrown into flight
- **THEN** the conforming wireframe overlay remains visible throughout the projectile and construct lifecycle without vanishing during locomotion or idle states.

### Requirement: Catalog-Configurable Ricochet Particle Effects
The system SHALL trigger customized particle bursts upon disc impact when specified by the active catalog skin definition.

#### Scenario: Ricochet impact with custom spark configuration
- **WHEN** a kinetic disc with catalog-defined ricochet particles strikes an arena wall or obstacle
- **THEN** the system spawns a directional particle burst matching the configured count and spark color.

#### Scenario: Ricochet impact without custom particle configuration
- **WHEN** a disc skin without particle overrides strikes a surface
- **THEN** the system executes the default arena impact particle effect without error.

### Requirement: Centralized Hex Color Normalization and Sanitization
The system SHALL validate and normalize all hex color strings across cosmetic definitions, stripping alpha channels (converting `#rrggbbaa` to `#rrggbb` and `#rgba` to `#rrggbb`) and returning valid Three.js Color objects with explicit fallbacks rather than defaulting invalid inputs to white.

#### Scenario: Sanitizing 8-digit RGBA hex string
- **WHEN** a cosmetic definition provides an 8-digit hex string with alpha (such as `#000000ff` or `#ff0000ff`)
- **THEN** the sanitizer extracts the 6-digit RGB component (`#000000` or `#ff0000`) and constructs a valid Three.js Color instance without throwing or logging invalid color warnings.

#### Scenario: Sanitizing 4-digit RGBA hex string
- **WHEN** a cosmetic definition provides a 4-digit hex string with alpha (such as `#000f`)
- **THEN** the sanitizer expands and normalizes the string to standard 6-digit `#rrggbb` representation.

#### Scenario: Handling invalid color inputs gracefully
- **WHEN** an unparseable or malformed color string is supplied to the cosmetic pipeline
- **THEN** the system applies a safe designated fallback color rather than defaulting to pure white.
