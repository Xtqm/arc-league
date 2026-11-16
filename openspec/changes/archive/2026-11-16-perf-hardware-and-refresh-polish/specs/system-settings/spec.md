# Spec Delta: System Settings

## MODIFIED Requirements

### Requirement: Graphics Quality Presets Configuration
The system SHALL provide one-click graphics quality presets (Competitive, Low, Medium, High, Ultra) that batch-configure shadow map resolution, bloom quality, particle budget, render resolution scaling, and frame rate caps, defaulting High and Ultra presets to uncapped frame rate (`fpsCap: 0`) to match native high-refresh displays.

#### Scenario: Selecting competitive preset
- **WHEN** the player selects the Competitive preset
- **THEN** shadows are disabled or reduced to 512, bloom is disabled or set to half-resolution, and frame rate cap is uncapped.

#### Scenario: Selecting ultra preset
- **WHEN** the player selects the Ultra preset
- **THEN** shadows are set to 1024 or higher, bloom is set to full HDR resolution, particles are enabled at 100%, render scale is set to 100%, and frame rate cap is set to uncapped (`fpsCap: 0`).

#### Scenario: Selecting high preset
- **WHEN** the player selects the High preset
- **THEN** shadows are set to 1024, bloom is set to full HDR resolution, particles are enabled at 100%, render scale is set to 100%, and frame rate cap defaults to uncapped (`fpsCap: 0`) for smooth display refresh synchronization.
