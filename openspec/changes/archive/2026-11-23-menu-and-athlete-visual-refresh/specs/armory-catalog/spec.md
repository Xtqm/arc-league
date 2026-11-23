# Spec Delta: Armory Catalog

## MODIFIED Requirements

### Requirement: Palm-Held Disc Mesh Synchronization
The system SHALL synchronize the 3D geometry and auxiliary visual overlays of the player construct rig's Hover-Palm disc to match the equipped disc skin's geometric shape and shader properties scaled proportionally to the player palm (~0.46), maintaining active retro wireframe overlays across idle, locomotion, and combat stances when enabled.

#### Scenario: Equipping a non-circular disc in Armory
- **WHEN** a player equips a non-circular disc skin in the Armory or during profile loadout hydration
- **THEN** the player character rig's palm-mounted disc mesh updates to the corresponding procedural shape at palm scale (~0.46) with matching materials.

#### Scenario: Palm-held disc wireframe synchronization
- **WHEN** a player equips a disc skin with `wireframeToggle: true`
- **THEN** the system attaches and displays a scaled shape-conforming retro wireframe overlay to the palm-mounted disc mesh while the player is idle, walking, or charging a throw.

### Requirement: Shape-Conforming Retro Wireframe Overlays
The system SHALL render retro wireframe overlays that conform to the exact geometric shape and vertex layout of the active procedural disc across both thrown flight projectiles and palm-held construct discs rather than assuming a circular torus or restricting wireframes to thrown projectiles.

#### Scenario: Toggling wireframe on a shaped disc
- **WHEN** a disc skin with wireframe enabled is applied to a non-circular disc mesh
- **THEN** the system attaches an auxiliary wireframe overlay matching the active polygon silhouette.

#### Scenario: Persistent wireframe visibility during idle and flight
- **WHEN** a kinetic disc with an active wireframe configuration is held in the player's palm or thrown into flight
- **THEN** the conforming wireframe overlay remains visible throughout the projectile and construct lifecycle without vanishing during locomotion or idle states.
