# Design

## Context

See `proposal.md` for motivation and background. 

In Arc League, Kinetic Discs and Athlete Rigs are rendered via Three.js in `src/graphics/materials.js`, `src/graphics/DiscGeometryFactory.js`, and `src/armory/CosmeticMaterialEngine.js`. Hex colors defined in `ArmoryCatalog.js` or produced by `CosmeticStudioModal.js` are currently passed directly to `new THREE.Color(...)`. Because Three.js rejects 8-digit hex strings (`#rrggbbaa`), custom items like `disc_custom_01` (configured with `#000000ff`) trigger runtime warnings and silently fallback to pure white (`#ffffff`).

Furthermore, the disc geometry pipeline currently creates a single outer torus/extrusion where the entire surface is painted with glowing emissive color, the inner face is a flat solid polygon, and the central hub is hardcoded to a static white lightbulb. This produces a flat, glowing hoop that lacks physical weight, aerodynamic tactical depth, and secondary color integration.

## Goals / Non-Goals

**Goals:**
- Implement a centralized, robust color sanitizer `parseCosmeticColor(hex, fallback)` that normalizes 3-, 6-, and 8-digit hex strings, strips alpha components, and prevents unhandled white fallbacks.
- Establish the Arc League Ballistic Implement Architecture across all procedural shapes:
  - **Tactile Composite Airframe**: PBR structural chassis (matte carbon / dark slate composite with beveled specular catchlights).
  - **Energized Kinetic Strike Rim**: Recessed perimeter cutting channel illuminated by **Primary Color**.
  - **Magnetic Tether Induction Rotor**: An intricate concentric induction engine in the center illuminated by **Secondary Emissive Color**.
  - **Hardlight Aerodynamic Stabilizer**: Smoked translucent aerodynamic lens with optional secondary vector telemetry ribs.
- Synchronize this architecture across the player's active held disc, thrown flight projectiles, the player character rig's palm-mounted disc, the Armory 3D turntable preview scene, and the main menu diorama flight disc.
- Maintain strict backwards compatibility with existing catalog items, loadouts, and the 77 existing test suites.

**Non-Goals:**
- Altering the Euler aerodynamics, Magnus curve rates, deflection restitution, or physics collision math in `src/physics/`.
- Introducing external raster textures, HDRI files, or third-party shader libraries.
- Changing catalog unlock pricing or progression mechanics.

## Decisions

### 1. Centralized Hex Color Sanitizer (`parseCosmeticColor`)
- **Decision**: Export `parseCosmeticColor(hex, fallbackColor)` from `src/graphics/materials.js` and re-export in `src/armory/CosmeticMaterialEngine.js`.
  - Normalizes string inputs: strips whitespace and handles leading `#` or `0x`.
  - Checks string length:
    - 8-digit hex (`#rrggbbaa`): extracts first 6 hex digits (`#rrggbb`) and ignores alpha.
    - 4-digit hex (`#rgba`): expands to 6-digit (`#rrggbb`).
    - 3-digit hex (`#rgb`): standard 6-digit expansion.
    - 6-digit hex (`#rrggbb`): parsed directly.
  - Returns a validated `THREE.Color`. If parsing fails, returns the specified `fallbackColor` (or cyan `0x00f3ff`) without throwing or logging console warnings.
- **Alternatives Considered**: 
  - Overriding `THREE.Color.prototype.setStyle` globally. *Rejected*: Mutating vendor library prototypes introduces brittle side-effects and breaks encapsulation.

### 2. Concentric Rotor Induction Core Geometry (`createHubGeometry`)
- **Decision**: Update `createHubGeometry` in `src/graphics/DiscGeometryFactory.js` to build a high-tech concentric induction rotor (an outer stator collar, recessed induction coil vents, and a central magnetic eye) rather than echoing the outer polygon shape.
- **Rationale**: Echoing the outer polygon (e.g. a small hexagon inside a big hexagon) makes the disc look doubled and repetitive. A concentric mechanical rotor gives the disc functional weight, looking like an actual magnetic motor tethered to the player's palm.
- **Alternatives Considered**: 
  - Nested procedural polygon. *Rejected*: User confirmed a concentric mechanical rotor provides a far more unique, high-tech aesthetic.

### 3. Ballistic Implement Material & Shader Routing
- **Decision**: In `makeDisc` and `CosmeticMaterialEngine.applyDiscSkin`:
  - **Outer Rim (`disc_outer`)**: Receives a dark, beveled composite PBR material (`roughness: 0.32, metalness: 0.82, color: #0a0d14`) that catches sharp specular highlights from arena key and rim lights, while its emissive channel is energized by `primaryColor` at focused, calibrated intensity (or channeled through a beveled perimeter rail).
  - **Face (`disc_face`)**: Smoked dark translucent material (`color: #04080e, opacity: 0.32, transparent: true, roughness: 0.1, metalness: 0.9`).
  - **Hub (`disc_hub`)**: Dynamically colored with `secondaryColor` with HDR emissive boost (`emissiveIntensity: 2.2 * glowScale`), eliminating the hardcoded white lightbulb.
  - **PointLight (`disc_light`)**: Matches `primaryColor`.
  - **Wireframe Overlay (`disc_wireframe_overlay`)**: Styled with `secondaryColor` at high-contrast opacity.
- **Alternatives Considered**:
  - Full PBR body without any primary emissive on the rim. *Rejected*: The disc still needs clear primary team/player color identification across the fast-paced 92m arena.

### 4. Athlete Rig Edge Trim & Palm Synchronization
- **Decision**: In `CosmeticMaterialEngine.applyChassisSkin`:
  - Sanitize `primaryHex`, `secondaryEmissiveHex`, and `suitHex` through `parseCosmeticColor`.
  - Apply `secondaryColor` directly to `edgeMaterial` and the palm disc's inner induction hub.
  - Synchronize palm disc geometry and materials using the same ballistic implement architecture as thrown discs.

## Risks / Trade-offs

- **[Risk] Test suite breakages due to unexpected `userData.part` changes**  
  → *Mitigation*: Strictly preserve all existing identifiers (`disc_outer`, `disc_face`, `disc_hub`, `disc_light`, `disc_wireframe_overlay`, `chassis_back_disc`, `chassis_suit`, `chassis_trim`).
- **[Risk] Black discs becoming completely invisible in dark stadium sectors**  
  → *Mitigation*: The beveled ballistic chassis has calibrated PBR roughness and metalness, ensuring arena directional lights and procedural environment reflections create sharp specular rim catchlights even on `#000000` hulls, while the secondary induction core and wireframe provide internal illumination.
- **[Risk] Studio modal code exporter regenerating 8-digit hex codes**  
  → *Mitigation*: Update `formatCatalogCode` and input listeners in `CosmeticStudioModal.js` to enforce sanitized 6-digit hex format on export.
