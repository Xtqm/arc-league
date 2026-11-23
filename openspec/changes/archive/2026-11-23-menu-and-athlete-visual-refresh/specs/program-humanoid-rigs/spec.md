# Spec Delta: Program Humanoid Rigs

## MODIFIED Requirements

### Requirement: Hierarchical Anatomical Humanoid Rig
The system SHALL construct character 3D construct rigs with an articulated parent-child joint hierarchy consisting of pelvis, abdomen, torso with glowing central core, invisible neck pivot, floating head, articulated shoulders, upper arms, forearms, hands, hips, thighs, shins, and tapered hover tips. On Player Athlete Rigs, hands SHALL be articulated 5-finger humanoid hands featuring a faceted palm chassis, an opposable thumb, and four segmented digits cupped to cradle the hover disc.

#### Scenario: Rig hierarchy initialization
- **WHEN** a character avatar is instantiated via `makeProgram`
- **THEN** the root group contains the articulated parent-child joint hierarchy (`pelvis`, `abdomen`, `torso`, `neck`, `head`, `left/rightShoulder`, `left/rightElbow`, `left/rightHand`, `left/rightHip`, `left/rightKnee`) with floating construct geometry rather than unlinked primitives or solid neck/boot connectors.

#### Scenario: Player athlete humanoid hand articulation
- **WHEN** a Player Athlete Rig (`archetype: 'player'`) is instantiated
- **THEN** each hand construct contains a faceted palm chassis with five distinct articulated digits (an opposable thumb and four segmented fingers) posed in a relaxed, athletic cradle framing the wrist and palm zone.

#### Scenario: Part tag preservation for cosmetic engine compatibility
- **WHEN** the construct rig is constructed
- **THEN** core component meshes including the faceted palm and articulated digits maintain standard `userData.part` identifiers (`chassis_suit`, `chassis_trim`, `chassis_visor`, `chassis_back_disc`, `chassis_halo`) permitting dynamic PBR armor, HDR core/edge-trim emissive tinting, and legacy caller compatibility.
