# Design

## Context

See `proposal.md` for background. Following the initial transition to a tactile composite airframe, the central hub was temporarily rendered as a heavy mechanical spoke-wheel. On non-circular procedural shapes (especially squares, triangles, and shurikens), this spoke wheel overlaps and crowds the inner geometry. Furthermore, close-up inspection in `ArmoryPreviewScene` suffers from severe over-saturation: a 2.4-intensity PointLight combined with 2.4 material emissive and uncalibrated bloom transforms the disc into a blinding, blurry neon haze.

## Goals / Non-Goals

**Goals:**
- Replace the mechanical spoke wheel in `createHubGeometry` with a sleek, floating **Faceted Hardlight Prism Core** (an octahedron/diamond energy crystal centered within a micro-containment halo ring).
- Implement dynamic clearance sizing: calculate the minimum inner radius $R_{\text{clearance}}$ of any procedural shape and size the energy core to $\le R_{\text{clearance}} \times 0.48$, guaranteeing clean floating clearance across circles, hexagons, squares, triangles, and shurikens.
- Calibrate preview lighting and material emissive intensity in `ArmoryPreviewScene` and `materials.js` so saturated colors remain rich, beveled facets stay crisp, and bloom creates a soft, atmospheric halo rather than blinding glare.
- Ensure the athlete rig's palm-held construct disc reflects the same floating energy core and dynamic clearance sizing.

**Non-Goals:**
- Modifying game aerodynamics, disc velocity, Magnus curving, or physics simulation.
- Removing bloom from the game entirely (the goal is calibration, not disabling post-processing).

## Decisions

### 1. Faceted Hardlight Prism Geometry (`createHubGeometry`)
- **Decision**: Construct the hub geometry from two synchronized elements:
  1. A floating 3D faceted energy crystal (`THREE.OctahedronGeometry`), slightly flattened on the Z-axis, that catches ambient specular reflections and pulses with `secondaryColor`.
  2. A slender magnetic containment ring (`THREE.RingGeometry` or thin beveled path) framing the crystal.
- **Rationale**: An octahedron prism directly harmonizes with Arc League's faceted construct aesthetic (pure construct rig shards, faceted arena tiles). It provides crystalline reflections rather than mechanical industrial clutter.

### 2. Procedural Shape Clearance Calculation
- **Decision**: Define a helper `getShapeInnerClearance(shape, baseRadius)` in `DiscGeometryFactory.js`:
  - `circle`: clearance $= baseRadius - tube \approx 0.515$
  - `hexagon`: clearance $= baseRadius \times 0.68 \times \cos(\pi/6) \approx 0.353$
  - `square`: clearance $= baseRadius \times 0.68 \times \cos(\pi/4) \approx 0.288$
  - `triangle`: clearance $= baseRadius \times 0.68 \times \sin(\pi/6) \approx 0.204$
  - `shuriken_3` / `shuriken_4`: clearance $= baseRadius \times 0.38 \times \cos(\text{notch}) \approx 0.165$
  - Compute `hubRadius = Math.min(0.12, clearance * 0.48)`.
- **Rationale**: Ensures the core dynamically adapts to any geometry, leaving generous negative space between the floating energy crystal and the inner disc hull.

### 3. Luminance & Bloom Calibration for Armory Preview Viewport
- **Decision**:
  - In `makeDisc` and `CosmeticMaterialEngine`: Calibrate outer rim `emissiveIntensity` to $1.3 \times (\text{glowScale} / 1.5)$ (down from 2.4).
  - In `ArmoryPreviewScene`: Reduce the internal PointLight radiance from 2.4 to 0.8, and configure `CinematicComposer` with tuned turntable parameters (`threshold: 1.15`, `strength: 0.32`).
- **Rationale**: In HDR rendering with ACES tone mapping, emissive values above 1.5 blow out to pure white. Calibrating to 1.3 preserves saturated color hues (cyan, green, amber, red), allows dark composite airframes to catch beveled specular highlights, and prevents bloom from flooding the viewport.

## Risks / Trade-offs

- **[Risk] Energy core appearing too small on large circular discs**  
  → *Mitigation*: Clamp the maximum core radius to 0.12m with a minimum of 0.06m, ensuring the core remains visually distinct without ever clipping.
- **[Risk] Octahedron orientation alignment**  
  → *Mitigation*: Align the octahedron vertices symmetrically along the X and Y axes so it spins cleanly with the disc without visual wobble.
