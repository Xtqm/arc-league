# Spec Delta: Arena Environment

## ADDED Requirements

### Requirement: Hybrid Instanced Arena Grid Rendering
The system SHALL render the 24x24 destructible floor grid using a hybrid instanced rendering pipeline where intact tiles are rendered via batched instanced meshes and destabilizing or rebuilding tiles are delegated to dynamic meshes to preserve warning strobes, vertical vibration, and physical plunge animations.

#### Scenario: Intact grid draw call batching
- **WHEN** the 24x24 arena grid renders with all or most tiles in the intact state
- **THEN** all intact slabs and edge trims are rendered in two batched instanced draw calls rather than hundreds of individual draw calls.

#### Scenario: Seamless hand-off on tile destabilization
- **WHEN** a kinetic disc or hazard impacts an intact tile triggering the warning state
- **THEN** the tile instance in the instanced mesh is hidden and an active dynamic mesh renders the warning strobe, vertical vibration, and void fall using the original PBR materials.

#### Scenario: Seamless return on tile reconstruction
- **WHEN** a rebuilding tile finishes rising back to floor elevation ($y = 0$)
- **THEN** the tile instance in the instanced mesh is restored and the temporary dynamic mesh is released back to the pool.
