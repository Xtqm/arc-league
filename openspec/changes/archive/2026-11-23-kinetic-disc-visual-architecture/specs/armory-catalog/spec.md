# Spec Delta

## MODIFIED Requirements

### Requirement: Shader and Visual Parameter Specification
The system SHALL define structured visual rendering parameters for all cosmetic items, including primary color, secondary emissive color, trail opacity, and wireframe toggle, enforcing sanitized 6-digit hexadecimal format (`#rrggbb`).

#### Scenario: Retrieving visual parameters for rendering
- **WHEN** a graphics pipeline reads an item's visual properties
- **THEN** the item definition provides normalized primaryHex, secondaryEmissiveHex, trailOpacity, and wireframeToggle.

#### Scenario: Free baseline cosmetics configuration
- **WHEN** default baseline items (`disc_default`, `chassis_default`, `arena_grid_01`) are queried
- **THEN** the system provides default cyan and blue Arc League athletic grid aesthetics with unlockType set to free.

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

### Requirement: Dynamic Program Chassis Material Configuration
The system SHALL apply equipped chassis skin configurations to the player construct 3D rig, adjusting faceted armor plating PBR properties (roughness, metalness, diffuse tone) and updating HDR emissive colors across the chest core, tilted halo, visor slit, hairline plate edge trims, hover tips, and Hover-Palm disc using sanitized color values.

#### Scenario: Applying chassis skin to player rig
- **WHEN** an equipped chassis skin is applied to the player construct model
- **THEN** the faceted armor plate standard materials receive the skin's roughness, metalness, and tint values while HDR emissives (core, tilted halo, edge trim, hover tips) update to sanitized `shader.primaryHex`, `shader.secondaryEmissiveHex`, and scaled `glowIntensity`.

#### Scenario: Synchronizing back-mounted disc with equipped disc skin
- **WHEN** player construct materials are updated or initialized
- **THEN** the Hover-Palm held disc mesh floating above the player's right palm synchronizes its visual colors and ballistic implement architecture with the active equipped disc skin.

## ADDED Requirements

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
