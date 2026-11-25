## MODIFIED Requirements

### Requirement: Procedural Environment Reflections
The system SHALL synthesize a procedural environment reflection map at startup with contrasting cool cyan/cobalt and warm amber rim panels and apply it alongside directional stadium rim lighting to both the main arena scene and the Armory 3D preview scene so beveled dark basalt, slate, and obsidian surfaces exhibit crisp specular highlights without external HDRI texture assets.

#### Scenario: Arena metallic surface reflections
- **WHEN** the main WebGL graphics engine initializes
- **THEN** a non-null environment map and contrasting stadium rim lights are active in the scene so beveled arena tiles, foundry walls, and construct armor plates catch sharp cyan and amber edge highlights.

#### Scenario: Armory preview scene metallic reflections
- **WHEN** the Armory 3D turntable preview scene initializes
- **THEN** an environment map is assigned to the preview scene so inspected construct rigs display consistent metallic sheen.

## ADDED Requirements

### Requirement: Procedural PBR Surface Detail Mapping
The system SHALL generate tileable procedural normal, roughness, and emissive seam detail textures for arena floor slabs, containment walls, and foundry pylons at initialization without requiring external network texture fetches, while degrading cleanly in headless environments.

#### Scenario: Procedural PBR maps applied to arena surfaces
- **WHEN** the graphics engine initializes in a browser or Electron WebGL context
- **THEN** arena floor tiles and foundry structures render with micro-surface normal and roughness variation plus recessed emissive seam detail.

#### Scenario: Headless test environment graceful fallback
- **WHEN** arena or graphics modules are imported in a Node headless environment without a 2D canvas or WebGL context
- **THEN** procedural texture generation falls back safely without throwing exceptions or failing instancing tests.

### Requirement: Layered Chasm Atmospheric Mist
The system SHALL render atmospheric mist and chasm haze layers suspended below and around the Arcfield perimeter to establish depth above the Null Void, dynamically scaling or disabling volumetric haze according to active graphics quality presets and particle settings.

#### Scenario: Chasm mist active on Medium through Ultra presets
- **WHEN** the game runs with graphics quality presets supporting particles and atmosphere (`Medium`, `High`, `Ultra`)
- **THEN** layered chasm mist drifts beneath open Void gaps and outside the stadium perimeter without obscuring foreground disc trajectories.

#### Scenario: Chasm mist suppressed on Competitive preset or disabled particles
- **WHEN** the player selects the `Competitive` preset or disables particle effects
- **THEN** chasm mist layers hide cleanly to maximize competitive visual clarity and frame rate.
