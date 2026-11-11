# Program Humanoid Rigs Specification

## Purpose

Defines the hierarchical anatomical humanoid 3D rig, movie-authentic Tron: Legacy styling (Flynn-style player visor vs Rinzler-style bot T-visor, dorsal magnetic disc docks, segmented composite armor plates), procedural kinematics (walking/running strides, jump tucks), and combat pose articulation for all program entities.

## Requirements

### Requirement: Hierarchical Anatomical Humanoid Rig
The system SHALL construct character 3D construct rigs with an articulated parent-child joint hierarchy consisting of pelvis, abdomen, torso with glowing central core, invisible neck pivot, floating head, articulated shoulders, upper arms, forearms, hands, hips, thighs, shins, and tapered hover tips.

#### Scenario: Rig hierarchy initialization
- **WHEN** a character avatar is instantiated via `makeProgram`
- **THEN** the root group contains the articulated parent-child joint hierarchy (`pelvis`, `abdomen`, `torso`, `neck`, `head`, `left/rightShoulder`, `left/rightElbow`, `left/rightHand`, `left/rightHip`, `left/rightKnee`) with floating construct geometry rather than unlinked primitives or solid neck/boot connectors.

#### Scenario: Part tag preservation for cosmetic engine compatibility
- **WHEN** the construct rig is constructed
- **THEN** core component meshes maintain standard `userData.part` identifiers (`chassis_suit`, `chassis_trim`, `chassis_visor`, `chassis_back_disc`, `chassis_halo`) permitting dynamic PBR armor, HDR core/edge-trim emissive tinting, and legacy caller compatibility.

### Requirement: Procedural Locomotion and Combat Poses
The system SHALL articulate the construct joint hierarchy dynamically across locomotion, floating shard micro-hover, core pulsing, telekinetic throw wind-up/release/catch phases, and a Hover-Palm forward defensive shield brace.

#### Scenario: Running locomotion stride
- **WHEN** an avatar moves across the arena floor
- **THEN** hip joints swing legs in alternating antiphase with knee flexing, shoulder joints swing arms in counter-balance proportional to velocity, and floating armor plates hover smoothly on phase offsets around the pulsing central core.

#### Scenario: Aerial jump posture
- **WHEN** an avatar is airborne with upward or downward vertical velocity
- **THEN** hover-legs trail aerodynamically while torso pitch tilts to reflect vertical acceleration.

#### Scenario: Holographic shield defensive brace
- **WHEN** the player activates the shield block action
- **THEN** both shoulders rotate forward and the open right palm elevates in front of the chest to project the hovering disc forward as a defensive parry barrier.

#### Scenario: Telekinetic throw wind-up, palm thrust, and magnetic catch
- **WHEN** an avatar charges a throw, releases a disc, or catches a returning disc
- **THEN** the right arm draws back with coiled torso rotation during charge, executes a snappy open-palm forward thrust on release without closing the hand around the disc, and cushions forward on catch as the disc re-arms above the palm.

### Requirement: Role-Differentiated Construct Archetypes
The system SHALL build distinct floating construct silhouettes per role: a wingless Pure Construct with icosahedron head, tilted halo, and spherical core for player athletes; a headless inverted-triangle Chevron Drone with glowing V-core for standard bots; and a sharp triangular-shard body with blazing core and hornless Monolith Prism head (no concentric back rings) for Duel and Arbiter bosses.

#### Scenario: Player and athlete construct assembly
- **WHEN** a player, teammate, or multiplayer athlete rig is instantiated
- **THEN** the rig renders faceted dark slate-obsidian floating torso/limb shards around a radiant spherical chest core, an icosahedron head encircled by a tilted glowing halo, tapered hover-point legs, and no back wings on the base frame.

#### Scenario: Standard combat bot Chevron Drone assembly
- **WHEN** a standard AI bot rig is instantiated
- **THEN** the rig renders a sharp inverted-triangle upper torso/shoulder monolith with no separate spherical head, a glowing amber V-core with inner rib vents, and detached floating arms and tapered legs.

#### Scenario: Duel Boss and Arbiter Boss Sentinel assembly
- **WHEN** a Duel Boss or Arbiter Boss is spawned
- **THEN** the rig scales to 1.15x or 1.22x with sharp triangular-prism shoulder and chest shards framing a blazing tier-colored core, a sleek hornless Monolith Prism head with a single vertical glowing visor slit, and a clean back silhouette without concentric orbital rings behind the shoulders.

### Requirement: Hover-Palm Telekinetic Disc Carry
The system SHALL mount a single spinning energy disc magnetically above the open upturned right palm across all character archetypes when armed, hiding it upon throw and restoring it upon catch or re-arming without dual wielding.

#### Scenario: Armed Hover-Palm idle carry
- **WHEN** a player, bot, or boss possesses a ready disc and is not blocking
- **THEN** a single disc spins horizontally in mid-air slightly above the upturned right palm while the left hand remains bare.

#### Scenario: Disc deployed in flight and re-armed on catch
- **WHEN** the character throws its disc into flight
- **THEN** the palm-hovering disc hides immediately until the thrown disc returns to the character or the re-arm watchdog completes.

### Requirement: Faceted Construct Armor and Edge Trim
The system SHALL render construct armor plates with flat-shaded faceted geometry, glowing chest cores, and crisp hairline glowing edge trim along plate contours, reserving an optional dorsal mount pivot without rendering wings on base rigs.

#### Scenario: Faceted obsidian plates with luminous edge trim
- **WHEN** any construct rig is built
- **THEN** armor shards use flat-shaded faceted geometry paired with hairline glowing border edges and HDR emissive cores tagged for cosmetic tinting.

#### Scenario: Base player rig excludes default wings
- **WHEN** the default player construct rig is created
- **THEN** no wing meshes are visible on the back unless explicitly enabled via future cosmetic attachment support.
