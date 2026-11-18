# Spec Delta

## ADDED Requirements

### Requirement: Procedural Disc Geometry Shape Variants
The system SHALL support procedural 2D geometric disc shapes including triangles, squares, hexagons, and multi-pointed shurikens, normalized to a maximum circumradius of 0.6 meters for strict collision parity with classic circular discs.

#### Scenario: Spawning a triangular disc
- **WHEN** a player equips a disc skin configured with a triangular shape and throws it
- **THEN** the system generates a 3-sided beveled outer rim, translucent face, and central hub rotating symmetrically around the origin without eccentric wobbling.

#### Scenario: Spawning a bladed shuriken disc
- **WHEN** a player equips a disc skin configured with a shuriken shape
- **THEN** the system renders a multi-bladed geometric star whose outer vertex tips do not exceed the canonical 0.6-meter collision radius.

#### Scenario: Fallback to circular torus for legacy skins
- **WHEN** a disc skin definition omits the shape attribute or specifies circle
- **THEN** the system generates the default circular torus and circular face geometry.

### Requirement: Palm-Held Disc Mesh Synchronization
The system SHALL synchronize the 3D geometry of the player construct rig's Hover-Palm disc to match the equipped disc skin's geometric shape scaled proportionally to the player palm.

#### Scenario: Equipping a non-circular disc in Armory
- **WHEN** a player equips a non-circular disc skin in the Armory or during profile loadout hydration
- **THEN** the player character rig's palm-mounted disc mesh updates to the corresponding procedural shape at palm scale (~0.46) with matching materials.

### Requirement: Shape-Conforming Retro Wireframe Overlays
The system SHALL render retro wireframe overlays that conform to the exact geometric shape and vertex layout of the active procedural disc rather than assuming a circular torus.

#### Scenario: Toggling wireframe on a shaped disc
- **WHEN** a disc skin with wireframe enabled is applied to a non-circular disc mesh
- **THEN** the system attaches an auxiliary wireframe overlay matching the active polygon silhouette.

### Requirement: Catalog-Configurable Ricochet Particle Effects
The system SHALL trigger customized particle bursts upon disc impact when specified by the active catalog skin definition.

#### Scenario: Ricochet impact with custom spark configuration
- **WHEN** a kinetic disc with catalog-defined ricochet particles strikes an arena wall or obstacle
- **THEN** the system spawns a directional particle burst matching the configured count and spark color.

#### Scenario: Ricochet impact without custom particle configuration
- **WHEN** a disc skin without particle overrides strikes a surface
- **THEN** the system executes the default arena impact particle effect without error.
