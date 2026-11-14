# Spec Delta: Combat HUD

## ADDED Requirements

### Requirement: Dirty-Checked HUD DOM Mutation
The system SHALL cache all combat HUD DOM element references at initialization and mutate layout properties, widths, and text content strictly when player integrity, disc possession, dash energy, or opponent status values change.

#### Scenario: Steady-state combat execution without DOM thrashing
- **WHEN** combat updates occur while player and opponent health, energy, and disc readiness remain unchanged
- **THEN** the HUD update pass performs zero DOM attribute or style mutations, preventing browser layout recalculations.

#### Scenario: Reactive telemetry updates on state change
- **WHEN** player integrity decreases or disc possession changes
- **THEN** the corresponding HUD element styles and text are updated immediately to reflect the new state.
