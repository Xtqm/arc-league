# Spec Delta: Cinematic Rendering

## ADDED Requirements

### Requirement: Decoupled Viewport Render Scaling and Downsampled Bloom Compositing
The system SHALL support decoupled 3D viewport drawing buffer scaling and downsampled post-processing render targets, allowing the 3D scene and bloom pyramid to process at a reduced pixel footprint while maintaining full-screen presentation.

#### Scenario: Downsampled bloom blur execution
- **WHEN** bloom quality is set to half-resolution
- **THEN** the initial bloom capture pass downsamples the scene buffer by 50% before executing the 5-mip blur pyramid, reducing fill-rate operations while preserving diffuse neon radiance.

#### Scenario: Viewport resize with active render scaling
- **WHEN** the browser window resizes while render scale is less than 100%
- **THEN** the WebGL drawing buffer and post-processing render targets resize proportionally to the scaled dimensions rather than full native dimensions.
