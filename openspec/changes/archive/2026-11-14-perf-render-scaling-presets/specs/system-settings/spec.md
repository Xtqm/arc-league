# Spec Delta: System Settings

## ADDED Requirements

### Requirement: Render Resolution Scaling Configuration
The system SHALL provide a user-configurable 3D render resolution scaling slider (ranging from 50% to 100%) that scales the WebGL 3D canvas drawing buffer dimensions while preserving native display resolution for 2D HUD and user interface elements.

#### Scenario: Adjusting render scale slider
- **WHEN** the player adjusts the render scale slider to 75% in the settings interface
- **THEN** the WebGL canvas drawing buffer resizes to 75% of the viewport dimensions with bicubic display scaling, while HUD elements retain native device pixel resolution.

#### Scenario: Persistent render scale restoration
- **WHEN** the player relaunches the game with a saved render scale value
- **THEN** the engine applies the stored render scale immediately upon graphics initialization.

### Requirement: Graphics Quality Presets Configuration
The system SHALL provide one-click graphics quality presets (Competitive, Low, Medium, High, Ultra) that batch-configure shadow map resolution, bloom quality, particle budget, and render resolution scaling.

#### Scenario: Selecting competitive preset
- **WHEN** the player selects the Competitive preset
- **THEN** shadows are disabled or reduced to 512, bloom is disabled or set to half-resolution, and frame rate cap is uncapped.

#### Scenario: Selecting ultra preset
- **WHEN** the player selects the Ultra preset
- **THEN** shadows are set to 1024 or higher, bloom is set to full HDR resolution, particles are enabled at 100%, and render scale is set to 100%.
