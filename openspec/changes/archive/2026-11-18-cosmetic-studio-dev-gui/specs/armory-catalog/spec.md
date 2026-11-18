# Spec Delta

## ADDED Requirements

### Requirement: In-Browser Developer Cosmetic Studio Interface
The system SHALL provide an interactive developer modal overlay launched via browser console hooks (`window.gameDebug.openStudio` and `window.gameDebug.armory.openStudio`), exposing real-time visual design controls paired with a live 3D turntable preview bay.

#### Scenario: Launching studio from developer console
- **WHEN** a developer invokes `window.gameDebug.openStudio()` in the browser console
- **THEN** the system pauses game background camera pointer-lock, mounts the `#cosmeticStudioModal` interface, renders an active 3D turntable scene, and sets focus to the studio controls.

#### Scenario: Switching cosmetic categories inside studio
- **WHEN** the developer changes the category selector between Kinetic Discs and Athlete Rigs
- **THEN** the studio swaps the staged turntable 3D mesh between a Kinetic Disc and an Athlete Rig, updating the visible control inputs to reflect category-specific parameters.

#### Scenario: Closing the studio
- **WHEN** the developer triggers the studio close button or invokes `window.gameDebug.closeStudio()`
- **THEN** the system cleanly disposes of the studio turntable WebGL resources, detaches listeners, and hides the modal overlay.

### Requirement: Real-Time Shader and PBR Parameter Tuning
The system SHALL update the active 3D turntable mesh materials instantaneously in response to UI input events for color, emissive, glow intensity, flight trail opacity, wireframe overlays, and PBR surface parameters without requiring page refreshes.

#### Scenario: Adjusting primary and emissive colors
- **WHEN** the developer changes the primary or secondary emissive color input in the studio
- **THEN** the turntable 3D mesh reflects the new hex colors on emissive trims, point lights, and material shaders within the current frame.

#### Scenario: Tuning PBR surface properties for Athlete Rigs
- **WHEN** the developer adjusts suit hex color, roughness, or metalness controls while inspecting an Athlete Rig
- **THEN** the turntable character model's armor suit material color, roughness, and metalness update in real time.

#### Scenario: Toggling retro wireframe overlay
- **WHEN** the developer enables the retro wireframe toggle
- **THEN** a wireframe overlay mesh is dynamically attached to the turntable model and styled with the secondary emissive color.

### Requirement: Live Player In-Game Preview and Testing
The system SHALL support testing newly tuned cosmetic configurations directly on the active in-game player character rig and kinetic disc without requiring catalog registration or save state modification.

#### Scenario: Testing design on live player
- **WHEN** the developer clicks the "Test on Player" action button in the studio
- **THEN** the system applies the current studio shader and PBR parameters directly to the active in-game player rig and equipped disc instances via the cosmetic material engine.

### Requirement: Formatted Catalog Code Generation
The system SHALL format the active studio cosmetic configuration into an immutable, schema-compliant JavaScript definition and copy it to the developer clipboard.

#### Scenario: Exporting catalog code definition
- **WHEN** the developer clicks the "Copy Catalog Code" button
- **THEN** the system formats the current inputs into a valid `Object.freeze` structure compatible with `ArmoryCatalog.js` and writes the text to the system clipboard.
