# Spec Delta: System Settings

## ADDED Requirements

### Requirement: Touch Camera and Aim Preferences
The system SHALL expose controls in the System Settings interface (both Pause Modal and Terminal `SYSTEM CONFIG`) to adjust touch camera sensitivity (`touchSensitivity`, `0.5x`–`2.0x`), select touch camera inertia behavior (`touchInertia`: `SMOOTH`, `LIGHT`, or `OFF`), and toggle vertical Y-axis inversion (`invertY`), persisting selections across sessions and applying them immediately to touch camera look.

#### Scenario: Adjusting touch aim sensitivity
- **WHEN** the player changes the Touch Aim Sensitivity slider in System Settings
- **THEN** the engine persists `touchSensitivity` and scales active touch drag and inertia rotation speeds proportionally on subsequent frames.

#### Scenario: Switching touch camera inertia preset
- **WHEN** the player selects `SMOOTH`, `LIGHT`, or `OFF` for Touch Camera Inertia
- **THEN** `OFF` disables post-release camera glide (pure 1:1 direct touch aiming), `LIGHT` applies fast exponential braking, and `SMOOTH` applies balanced glide decay, with the selection persisted across reloads.

#### Scenario: Toggling Y-axis inversion
- **WHEN** the player toggles Invert Y-Axis in System Settings
- **THEN** `state.invertY` updates immediately and vertical touch look reverses sign while remaining persisted across sessions.
