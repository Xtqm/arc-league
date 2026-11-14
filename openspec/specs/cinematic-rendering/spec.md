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
The system SHALL synthesize a procedural environment reflection map at startup and apply it to both the main arena scene and the Armory 3D preview scene so metallic construct surfaces exhibit specular rim highlights without external texture assets.

#### Scenario: Arena metallic surface reflections
- **WHEN** the main WebGL graphics engine initializes
- **THEN** a non-null environment map is assigned to the scene so metallic faceted armor plates reflect cool arena light along beveled edges.

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
