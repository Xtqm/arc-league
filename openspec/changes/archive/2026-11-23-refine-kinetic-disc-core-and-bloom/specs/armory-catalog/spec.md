# Spec Delta

## MODIFIED Requirements

### Requirement: Dynamic Identity Disc Cosmetic Material Application
The system SHALL apply active disc skin cosmetic configurations to the player's 3D Kinetic Disc mesh instances according to the Arc League ballistic implement architecture: rendering the structural airframe with tactile composite PBR properties, channeling primary color into the energized kinetic strike rim, driving secondary emissive color into a floating faceted hardlight energy core sized dynamically to prevent hull overlap, and displaying a smoked hardlight stabilizer face.

#### Scenario: Applying standard emissive disc skin
- **WHEN** an equipped disc skin without wireframe is applied to an Identity Disc mesh
- **THEN** the outer airframe displays dark beveled composite PBR material properties, the strike rim channel reflects `shader.primaryHex`, the PointLight radiance matches `shader.primaryHex` at calibrated intensity, the faceted hardlight energy core is dynamically scaled to the shape's inner clearance and tinted by `shader.secondaryEmissiveHex`, the face displays a smoked hardlight lens, and any wireframe overlay mesh is hidden or removed.

#### Scenario: Applying wireframe overlay disc skin
- **WHEN** an equipped disc skin with `wireframeToggle: true` (e.g. `disc_corrupted_void`) is applied
- **THEN** the system attaches or activates an accented vector telemetry wireframe overlay on the disc geometry styled with secondary emissive coloration while preserving the kinetic strike rim and floating energy core.

#### Scenario: Dynamic skin swap on loadout changed event
- **WHEN** `ArmoryManager` emits a `LOADOUT_CHANGED` event for category `discSkins`
- **THEN** the system immediately updates the player's active held disc mesh and unthrown disc state to reflect the newly equipped disc skin parameters.

### Requirement: Turntable 3D Cosmetic Preview Renderer
The system SHALL provide an isolated Three.js preview scene and camera rig capable of rendering an interactive, rotating 3D preview of any catalog Disc skin or Program Chassis model for inspection within the Armory UI, calibrating preview lighting and bloom thresholds to preserve sharp beveled facets and prevent over-saturated blinding glare.

#### Scenario: Staging a disc skin for turntable inspection
- **WHEN** the Armory UI requests a preview of a specific disc skin
- **THEN** the preview scene clears existing preview meshes, instantiates the disc model with calibrated preview emissive intensity and softened internal point lighting, centers it in the camera frustum, and initiates turntable rotation with crisp non-blinding bloom.

#### Scenario: Staging a chassis skin for turntable inspection
- **WHEN** the Armory UI requests a preview of a specific chassis skin
- **THEN** the preview scene instantiates the Program Chassis rig with the specified cosmetic materials, positions the camera at a framed full-body view, and rotates smoothly on the yaw axis.

#### Scenario: Interactive manual rotation and drag controls
- **WHEN** a user interacts with the preview viewport via pointer drag or touch swipe
- **THEN** the preview turntable updates yaw rotation proportionally to pointer delta and resumes auto-rotation when interaction ceases.

#### Scenario: Teardown and disposal of preview renderer
- **WHEN** the preview renderer is destroyed or its parent modal is closed
- **THEN** the system halts the animation loop, removes all objects from the preview sub-scene, disposes materials and geometries, and releases WebGL canvas resources.
