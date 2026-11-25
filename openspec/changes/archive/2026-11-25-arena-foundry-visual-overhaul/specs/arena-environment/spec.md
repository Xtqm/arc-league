## MODIFIED Requirements

### Requirement: Destructible Tile Grid Lifecycle
The system SHALL maintain a 24x24 floor tile grid rendered as beveled dark basalt/metallic magnetic slabs with recessed emissive seam accents, wherein intact tiles transition through warning, falling, and void states upon projectile contact with physicalized warning tilt/jitter and amber-to-crimson magnetic overload strobing for 0.75 seconds while maintaining collision.

#### Scenario: Disc impact triggers tile warning
- **WHEN** an identity disc strikes an intact floor tile
- **THEN** the tile enters a warning state with amber-to-crimson magnetic overload strobing, subtle vertical jitter and destabilizing tilt for 0.75 seconds while maintaining collision.

### Requirement: Tile Collapse and Reconstruction
The system SHALL plunge warning tiles into the lit Null Void chasm upon warning timeout, emit downward kinetic spark and mist bursts, disable collision, and restore tiles via illuminated magnetic reconstruction after a 12-second regeneration interval.

#### Scenario: Tile collapse into void
- **WHEN** a tile completes its warning duration
- **THEN** it tilts and accelerates downward into the lit chasm below, emits de-rez spark and mist bursts, disables collision, and an arena regeneration timer is initiated.

#### Scenario: Tile regeneration
- **WHEN** a fallen tile's 12-second reconstruction timer elapses
- **THEN** the tile rises back into position with magnetic seam glow and returns to the intact state.

### Requirement: Hybrid Instanced Arena Grid Rendering
The system SHALL render the 24x24 destructible floor grid using a hybrid instanced rendering pipeline where intact beveled tile slabs and recessed seam trims are rendered via batched instanced meshes and destabilizing or rebuilding tiles are delegated to dynamic pooled meshes to preserve warning strobes, destabilizing tilt, and physical plunge animations.

#### Scenario: Intact grid draw call batching
- **WHEN** the 24x24 arena grid renders with all or most tiles in the intact state
- **THEN** all intact beveled slabs and seam trims are rendered in batched instanced draw calls rather than hundreds of individual draw calls.

#### Scenario: Seamless hand-off on tile destabilization
- **WHEN** a kinetic disc or hazard impacts an intact tile triggering the warning state
- **THEN** the tile instance in the instanced mesh is hidden and an active dynamic mesh renders the warning strobe, destabilizing tilt, and void fall using the active sector PBR materials.

#### Scenario: Seamless return on tile reconstruction
- **WHEN** a rebuilding tile finishes rising back to floor elevation ($y = 0$)
- **THEN** the tile instance in the instanced mesh is restored and the temporary dynamic mesh is released back to the pool.

## ADDED Requirements

### Requirement: Magnetic Colosseum Stadium Backdrop
The system SHALL surround the Arcfield arena perimeter with a 360-degree Magnetic Colosseum stadium backdrop featuring curved tiered megastructure silhouettes, vertical cyan/amber induction pylons, and deep Null Void chasm framing, hydrating authored 3D architectural model bundles when available and falling back cleanly to procedural geometry without altering playable arena collision boundaries.

#### Scenario: Stadium backdrop visibility in live match
- **WHEN** a combat arena renders in any game mode
- **THEN** a multi-tiered circular stadium ring and vertical light pylons frame the horizon outside the containment walls above a lit Null Void chasm.

#### Scenario: Backdrop respects active sector theme
- **WHEN** a campaign sector theme (`grid_01` through `grid_04`) is applied
- **THEN** stadium pylon accents and chasm glow tint to match the active sector palette while preserving clear foreground projectile readability.

#### Scenario: Headless or uncached architectural fallback
- **WHEN** the arena initializes before external architectural model bundles load or in a headless environment
- **THEN** the stadium backdrop and perimeter structures render via synchronous procedural fallback geometry without throwing exceptions or blocking initialization.

### Requirement: Foundry Containment Walls and Deflector Pylons
The system SHALL render arena perimeter containment walls and static ricochet pillars using multi-layered sculpted magnetic foundry geometry (chamfered structural ribs, induction coils, and recessed emissive conduits) hydrated from authored architectural meshes with procedural fallback and aligned strictly to the existing physics collision dimensions.

#### Scenario: Perimeter wall and pillar collision parity
- **WHEN** a combatant or thrown disc collides with perimeter containment walls or ricochet pillars
- **THEN** collision resolution and disc specular bounce normals match the exact canonical arena bounds and pillar radii regardless of added visual trim geometry.

#### Scenario: Sector theme conduit tinting on authored foundry meshes
- **WHEN** a campaign sector theme (`grid_01` through `grid_04`) is applied to authored foundry wall and pillar meshes
- **THEN** emissive conduit material channels update to match the active sector accent palette while dark armor housing remains crisp.
