# Spec Delta

## MODIFIED Requirements

### Requirement: Health and Energy Regeneration
The system SHALL maintain player health and energy pools, regenerating energy automatically while health loss past zero causes de-rez elimination, and SHALL immediately release pointer lock and restore the visible system cursor upon elimination across all game modes.

#### Scenario: Energy auto-regeneration
- **WHEN** player energy is depleted below 100%
- **THEN** energy steadily regenerates toward full capacity over time.

#### Scenario: Lethal damage elimination
- **WHEN** incoming damage reduces player health to zero or below, or the player falls into the void
- **THEN** the player is de-rezzed, pointer lock is immediately released, the system cursor is restored, and the elimination game-over flow is presented.
