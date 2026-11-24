# Proposal

## Why

Cosmetic colors on Kinetic Discs and Athlete Rigs currently exhibit severe visual artifacts:
1. When colors are provided in 8-digit `#rrggbbaa` hex format (such as `#000000ff`), Three.js fails validation and silently defaults to blinding pure white (`#ffffff`).
2. Discs lack physical depth because the entire outer rim is rendered as a flat, unshaded neon tube, while the central hub is hardcoded to a static white lightbulb regardless of equipped cosmetic loadout.
3. The visual presentation imitates a generic vintage glowing hoop rather than Arc League's unique lore—a precision-engineered, aerodynamic ballistic kinetic implement equipped with a tactile composite chassis, an energized strike blade, and an intricate magnetic tether induction core.

Resolving this now provides a distinct, high-fidelity visual identity for Arc League and ensures that multi-tone palettes (including stealth obsidian and stark white contrasts) render accurately across outfitting, diorama simulations, and live arena matches.

## What Changes

- **Centralized Hex Color Sanitizer (`parseCosmeticColor`)**: Implement a robust color parsing and normalization utility that strips 8-digit and 4-digit alpha channels (`#rrggbbaa` -> `#rrggbb`), validates CSS/hex color formats, and provides graceful fallbacks without ever defaulting invalid inputs to white.
- **Arc League Ballistic Implement Material Architecture**:
  - **Tactile Ballistic Chassis (Airframe)**: Render the disc's structural hull with dark PBR composite material properties (matte carbon/slate with beveled specular catchlights) rather than flat, uniform emissive glow.
  - **Kinetic Strike Blade / Edge Channel**: Channel the **Primary Color** into the energized perimeter strike rim that cuts air and damages opponents.
  - **Magnetic Tether Induction Core (Secondary Color)**: Replace the hardcoded white hub with an intricate concentric rotor engine that actively renders the **Secondary Emissive Color**.
  - **Hardlight Aerodynamic Stabilizer (Face)**: Style the internal face as a smoked, translucent hardlight lens with secondary vector telemetry ribs.
- **Athlete Rig & Palm Disc Synchronization**:
  - Apply the centralized color sanitizer to the athlete rig's suit, lit neon channels, visor, edge trims, and palm-hovering disc.
  - Ensure the palm disc dynamically reflects the same multi-tone aerodynamic chassis and induction rotor architecture as thrown projectiles.
- **Catalog & Studio Updates**:
  - Sanitize all catalog entries (including `disc_custom_01`) to standard 6-digit hex format.
  - Update `CosmeticStudioModal` inputs and code generators to enforce 6-digit hex formatting.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `armory-catalog`: Update cosmetic shader parameter validation/sanitization, replace legacy single-color emissive hoop with the Arc League multi-layered ballistic implement architecture (tactile PBR chassis, primary kinetic strike rim, secondary magnetic tether induction core rotor, smoked hardlight stabilizer face), and synchronize athlete rig multi-tone edge trims and palm disc.

## Impact

- **Affected Files**:
  - `src/armory/CosmeticMaterialEngine.js`: Update `applyDiscSkin`, `applyChassisSkin`, color parsing, and material routing.
  - `src/graphics/materials.js`: Update `makeDisc`, `makeProgram`, and palm disc initialization.
  - `src/graphics/DiscGeometryFactory.js`: Provide concentric induction rotor geometry for `createHubGeometry`.
  - `src/armory/ArmoryCatalog.js`: Sanitize hex definitions.
  - `src/ui/modals/CosmeticStudioModal.js`: Enforce sanitized 6-digit hex codes in studio preview and catalog code generator.
- **Dependencies**: Three.js WebGL rendering pipeline (no new third-party dependencies).
- **Backwards Compatibility**: Fully backwards compatible with existing loadouts and catalog items.
