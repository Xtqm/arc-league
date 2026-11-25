# cinematic-rendering Specification

## Purpose

Defines the cinematic WebGL rendering pipeline for Arc League, including HDR selective bloom, ACES filmic tone mapping, procedural environment reflections, and continuous additive projectile and movement ribbon trails.

## Requirements

### Requirement: HDR Selective Bloom and Tone Mapping
The system SHALL render the live 3D arena through an HDR post-processing pipeline with thresholded selective bloom and ACES filmic tone mapping so high-intensity emissive elements glow while dark armor surfaces remain crisp.

#### Scenario: Active HDR bloom rendering
- **WHEN** the render loop runs with bloom enabled in a supported WebGL context
- **THEN** emissive cores, halos, discs, and edge trims above the luminance threshold produce a soft bloom halo while matte armor plating stays unblurred.

#### Scenario: Graceful degradation when bloom is disabled or unsupported
- **WHEN** bloom is disabled in settings or post-processing targets cannot initialize in a headless environment
- **THEN** the renderer falls back cleanly to direct scene rendering without throwing exceptions or blanking the viewport.

#### Scenario: Viewport resize target synchronization
- **WHEN** the browser or desktop window resizes or changes display mode
- **THEN** post-processing render targets resize to match the updated viewport dimensions and pixel ratio.

### Requirement: Procedural Environment Reflections
The system SHALL synthesize a procedural environment reflection map at startup with contrasting cool cyan/cobalt and warm amber rim panels and apply it alongside directional stadium rim lighting to both the main arena scene and the Armory 3D preview scene so beveled dark basalt, slate, and obsidian surfaces exhibit crisp specular highlights without external HDRI texture assets.

#### Scenario: Arena metallic surface reflections
- **WHEN** the main WebGL graphics engine initializes
- **THEN** a non-null environment map and contrasting stadium rim lights are active in the scene so beveled arena tiles, foundry walls, and construct armor plates catch sharp cyan and amber edge highlights.

#### Scenario: Armory preview scene metallic reflections
- **WHEN** the Armory 3D turntable preview scene initializes
- **THEN** an environment map is assigned to the preview scene so inspected construct rigs display consistent metallic sheen.

### Requirement: Continuous Additive Projectile Ribbon Trails
The system SHALL render continuous tapering additive mesh ribbon trails behind flying projectiles whenever particle effects are enabled, interpolating trail coloration smoothly along each projectile's path and disposing trail GPU buffers on cleanup.

#### Scenario: Flying projectile emits continuous ribbon trail
- **WHEN** a disc is thrown or returning in flight while particle effects are enabled
- **THEN** a smooth continuous ribbon mesh trails behind the disc's trajectory rather than emitting solely sparse detached dots.

#### Scenario: Projectile trail cleanup on catch or removal
- **WHEN** a flying disc is caught, re-armed, or removed from the arena
- **THEN** its ribbon trail fades or detaches cleanly and disposes all associated GPU geometries and materials without memory leaks.

### Requirement: Locomotion and Dash Hover Streaks
The system SHALL emit brief additive kinetic hover streaks from construct thruster points during directional dashes and high-velocity aerial movement when particle effects are enabled.

#### Scenario: Dash burst hover streaks
- **WHEN** a player or AI construct executes a directional dash while particle effects are enabled
- **THEN** glowing kinetic streaks trail behind the construct's hover tips in the direction opposite the dash impulse.

### Requirement: Pooled Kinetic Particle and Spark Emission
The system SHALL manage spark bursts, projectile impacts, and floor de-rez particles using a persistent fixed-capacity particle ring-buffer pool, recycling active particle slots without allocating new geometries or materials per impact.

#### Scenario: High-volume particle bursts without buffer reallocation
- **WHEN** multiple kinetic impacts, floor destructions, or disc ricochets trigger particle bursts simultaneously
- **THEN** particle points are activated within a pre-allocated pool buffer without instantiating new BufferGeometry or PointsMaterial instances.

#### Scenario: Particle expiration and recycling
- **WHEN** a spark particle's lifespan expires
- **THEN** its slot in the pool is marked inactive and made available for subsequent emissions without invoking GPU buffer disposal or garbage collection.

### Requirement: Decoupled Viewport Render Scaling and Downsampled Bloom Compositing
The system SHALL support decoupled 3D viewport drawing buffer scaling and downsampled post-processing render targets, allowing the 3D scene and bloom pyramid to process at a reduced pixel footprint while maintaining full-screen presentation.

#### Scenario: Downsampled bloom blur execution
- **WHEN** bloom quality is set to half-resolution
- **THEN** the initial bloom capture pass downsamples the scene buffer by 50% before executing the 5-mip blur pyramid, reducing fill-rate operations while preserving diffuse neon radiance.

#### Scenario: Viewport resize with active render scaling
- **WHEN** the browser window resizes while render scale is less than 100%
- **THEN** the WebGL drawing buffer and post-processing render targets resize proportionally to the scaled dimensions rather than full native dimensions.

### Requirement: Dedicated High-Performance GPU Context Request
The system SHALL initialize the WebGL rendering context with explicit high-performance power preference (`powerPreference: 'high-performance'`) to ensure host operating systems and dual-GPU hardware select dedicated graphics hardware over integrated CPU graphics.

#### Scenario: Renderer initialization with high-performance preference
- **WHEN** the 3D graphics engine initializes the WebGLRenderer
- **THEN** the context attributes specify `powerPreference: 'high-performance'` to guide host GPU dispatchers toward dedicated graphics hardware.

#### Scenario: Headless or single-GPU fallback
- **WHEN** running in an environment without dedicated discrete graphics hardware
- **THEN** WebGL initialization proceeds normally using available graphics hardware without throwing initialization errors.

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
