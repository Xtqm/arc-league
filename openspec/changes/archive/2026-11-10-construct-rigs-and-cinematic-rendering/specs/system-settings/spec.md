# Spec Delta

## ADDED Requirements

### Requirement: Graphics Fidelity Toggles Runtime Enforcement
The system SHALL apply `bloom` and `particles` graphics settings immediately upon toggle and startup initialization to enable or disable HDR post-processing bloom and continuous projectile/locomotion ribbon trails.

#### Scenario: Toggling HDR bloom preference at runtime
- **WHEN** the player toggles the `NEON GLOW / BLOOM` option in the settings modal
- **THEN** the live renderer enables or disables the HDR bloom pass immediately on subsequent frames and persists the preference.

#### Scenario: Toggling particle and ribbon effects preference
- **WHEN** the player disables `particles` in settings
- **THEN** continuous disc ribbon trails, hover-dash streaks, and impact bursts cease spawning while existing effects clean up cleanly.
