## MODIFIED Requirements

### Requirement: HDR Selective Bloom and Tone Mapping
The system SHALL render the live 3D arena through an HDR post-processing pipeline with thresholded selective bloom and ACES filmic tone mapping so high-intensity emissive elements glow while dark armor surfaces and intact arena floor tiles remain crisp and free of blinding specular glitter.

#### Scenario: Active HDR bloom rendering
- **WHEN** the render loop runs with bloom enabled in a supported WebGL context
- **THEN** emissive cores, halos, discs, and edge trims above the luminance threshold produce a soft bloom halo while matte armor plating stays unblurred.

#### Scenario: Calibrated bloom threshold prevents floor specular glare
- **WHEN** beveled arena floor tiles catch directional rim reflections and render intact magnetic seams under active HDR bloom
- **THEN** intact floor tile seams and specular bevels stay below the bloom cutoff so only true HDR elements (Construct cores, halos, discs, and Vectorfall warnings) bloom strongly.

#### Scenario: Graceful degradation when bloom is disabled or unsupported
- **WHEN** bloom is disabled in settings or post-processing targets cannot initialize in a headless environment
- **THEN** the renderer falls back cleanly to direct scene rendering without throwing exceptions or blanking the viewport.

#### Scenario: Viewport resize target synchronization
- **WHEN** the browser or desktop window resizes or changes display mode
- **THEN** post-processing render targets resize to match the updated viewport dimensions and pixel ratio.
