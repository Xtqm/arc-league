## MODIFIED Requirements

### Requirement: Hierarchical Anatomical Humanoid Rig
The system SHALL construct character 3D construct rigs—either from authored GLTF/GLB sharded magnetic-construct meshes or synchronous procedural geometry fallback—preserving an articulated parent-child joint hierarchy (`pelvis`, `abdomen`, `torso`, `neck`, `head`, `left/rightShoulder`, `left/rightElbow`, `left/rightHand`, `left/rightHip`, `left/rightKnee`), five-fingered humanoid hands, and standard cosmetic part identifiers (`chassis_suit`, `chassis_trim`, `chassis_visor`, `chassis_back_disc`, `chassis_halo`).

#### Scenario: Rig hierarchy initialization
- **WHEN** a character avatar is instantiated via `makeProgram` (including before external GLB assets load or in a headless test environment)
- **THEN** the root group immediately contains the articulated parent-child joint hierarchy (`pelvis`, `abdomen`, `torso`, `neck`, `head`, `left/rightShoulder`, `left/rightElbow`, `left/rightHand`, `left/rightHip`, `left/rightKnee`) with floating construct geometry rather than unlinked primitives or solid neck/boot connectors.

#### Scenario: Rig upgrade from authored GLB construct bundle
- **WHEN** an authored GLB construct model bundle is cached and instantiated for an athlete or opponent rig
- **THEN** the rig exposes the same joint hierarchy, `rightHand` Hover-Palm socket, `dorsalWingPivot`, and semantic cosmetic part tags (`chassis_suit`, `chassis_trim`, `chassis_visor`, `chassis_back_disc`, `chassis_halo`) for seamless Armory skinning.

#### Scenario: Player athlete humanoid hand articulation
- **WHEN** a Player Athlete Rig (`archetype: 'player'`) is instantiated
- **THEN** each hand construct contains a tapered palm chassis and five distinct articulated digits including an opposable thumb and four three-segment fingers with natural radial splay.

#### Scenario: Part tag preservation for cosmetic engine compatibility
- **WHEN** the construct rig is constructed from either GLB assets or procedural geometry
- **THEN** core component meshes including the faceted palm and articulated digits maintain standard `userData.part` identifiers (`chassis_suit`, `chassis_trim`, `chassis_visor`, `chassis_back_disc`, `chassis_halo`) permitting dynamic PBR armor, HDR core/edge-trim emissive tinting, and legacy caller compatibility.

### Requirement: Procedural Locomotion and Combat Poses
The system SHALL articulate construct rigs across idle hover, locomotion strides, aerial jump tucks, directional dashes, telekinetic throw wind-up/release/catch phases, and forward shield parry braces using smooth animation clip blending when authored GLB clips are present, falling back to procedural joint kinematics otherwise.

#### Scenario: Blended clip playback on authored GLB rig
- **WHEN** an authored GLB construct rig transitions between idle hover, running, throw charge, release thrust, dash, or shield parry states
- **THEN** the animation mixer cross-fades cleanly between the corresponding authored combat clips while maintaining continuous core pulse and halo rotation.

#### Scenario: Running locomotion stride
- **WHEN** an avatar moves across the arena floor
- **THEN** hip joints swing legs in alternating antiphase with knee flexing, shoulders swing arms in counter-balance, and floating armor plates hover smoothly around the central core (driven by blended clips when GLB animations are active or procedural kinematics otherwise).

#### Scenario: Aerial jump posture
- **WHEN** an avatar is airborne with upward or downward vertical velocity
- **THEN** hover-legs trail aerodynamically while torso pitch tilts to reflect vertical acceleration.

#### Scenario: Telekinetic throw wind-up, palm thrust, and magnetic catch
- **WHEN** an avatar charges a throw, releases a disc, or catches a returning disc
- **THEN** the throwing arm draws back with coiled torso rotation during charge, executes a snappy open-palm forward thrust on release, and cushions forward on catch as the disc re-arms above the palm.

#### Scenario: Holographic shield defensive brace
- **WHEN** the player activates the shield block action
- **THEN** the rig enters a forward defensive parry brace projecting the Hover-Palm disc forward as a parry barrier.

### Requirement: Role-Differentiated Construct Archetypes
The system SHALL build distinct floating construct visual silhouettes per combat role (`player`, `drone`, `sentinel`) while enforcing a unified, purely skill-driven competitive baseline across all Player Athlete Rigs with zero gameplay stat, hitbox, or physics differences between cosmetic rig variants.

#### Scenario: Player and athlete construct assembly
- **WHEN** a player, teammate, or multiplayer athlete rig is instantiated
- **THEN** the rig renders faceted dark obsidian/ceramic floating torso and limb shards around a radiant spherical chest core, a faceted head encircled by a tilted glowing halo, tapered hover-point legs, and no back wings on the base frame.

#### Scenario: Purely cosmetic parity across player rig variants
- **WHEN** a player equips any unlocked Athlete Rig skin or visual chassis variant
- **THEN** collision radius, movement velocity, jump impulse, dash speed, and parry window remain identical to the default baseline rig.

#### Scenario: Standard combat bot Chevron Drone assembly
- **WHEN** a standard AI bot rig is instantiated
- **THEN** the rig renders a sharp inverted-triangle upper torso/shoulder monolith with no separate spherical head, a glowing amber V-core with inner rib vents, and detached floating arms and tapered legs.

#### Scenario: Duel Boss and Arbiter Boss Sentinel assembly
- **WHEN** a Duel Boss or Arbiter Boss is spawned
- **THEN** the rig scales to 1.15x or 1.22x with sharp triangular-prism shoulder and chest shards framing a blazing tier-colored core, a sleek hornless Monolith Prism head with a single vertical glowing visor slit, and a clean back silhouette without concentric orbital rings behind the shoulders.
