# Spec Delta: Disc Combat

## ADDED Requirements

### Requirement: Allocation-Free Trajectory and Threat Path Simulation
The system SHALL compute disc aim trajectory predictions and enemy threat trajectories using pre-allocated typed arrays and reusable scratch vectors, avoiding per-frame vector allocations and garbage collection pauses during aiming and combat simulation.

#### Scenario: Continuous aiming without vector heap allocation
- **WHEN** the player holds aiming controls or updates trajectory predictions over successive animation frames
- **THEN** trajectory prediction updates the fixed position attribute buffer in-place without instantiating new Vector3 point objects on the heap.

#### Scenario: Hostile disc threat path calculation
- **WHEN** enemy discs are in flight and active threat lines are rendered in the arena
- **THEN** each threat line writes to its pre-allocated vertex buffer without cloning vector positions or allocating temporary path arrays.
