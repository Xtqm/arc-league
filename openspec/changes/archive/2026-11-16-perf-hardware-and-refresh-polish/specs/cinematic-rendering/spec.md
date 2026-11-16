# Spec Delta: Cinematic Rendering

## ADDED Requirements

### Requirement: Dedicated High-Performance GPU Context Request
The system SHALL initialize the WebGL rendering context with explicit high-performance power preference (`powerPreference: 'high-performance'`) to ensure host operating systems and dual-GPU hardware select dedicated graphics hardware over integrated CPU graphics.

#### Scenario: Renderer initialization with high-performance preference
- **WHEN** the 3D graphics engine initializes the WebGLRenderer
- **THEN** the context attributes specify `powerPreference: 'high-performance'` to guide host GPU dispatchers toward dedicated graphics hardware.

#### Scenario: Headless or single-GPU fallback
- **WHEN** running in an environment without dedicated discrete graphics hardware
- **THEN** WebGL initialization proceeds normally using available graphics hardware without throwing initialization errors.
