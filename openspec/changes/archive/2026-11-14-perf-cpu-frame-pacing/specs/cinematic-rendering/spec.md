# Spec Delta: Cinematic Rendering

## ADDED Requirements

### Requirement: Pooled Kinetic Particle and Spark Emission
The system SHALL manage spark bursts, projectile impacts, and floor de-rez particles using a persistent fixed-capacity particle ring-buffer pool, recycling active particle slots without allocating new geometries or materials per impact.

#### Scenario: High-volume particle bursts without buffer reallocation
- **WHEN** multiple kinetic impacts, floor destructions, or disc ricochets trigger particle bursts simultaneously
- **THEN** particle points are activated within a pre-allocated pool buffer without instantiating new BufferGeometry or PointsMaterial instances.

#### Scenario: Particle expiration and recycling
- **WHEN** a spark particle's lifespan expires
- **THEN** its slot in the pool is marked inactive and made available for subsequent emissions without invoking GPU buffer disposal or garbage collection.
