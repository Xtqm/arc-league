## MODIFIED Requirements

### Requirement: Combat Viewport Stability and Aim Alignment
The system SHALL maintain a glitch-free, 1:1 responsive third-person combat camera that eliminates gimbal lock flips, boundary collision inversion, and pointer lock delta spikes while clamping rapid mouse swipes to preserve continuous aim orientation, aligning the player avatar forward orientation with the aim direction away from the trailing camera.

#### Scenario: Rapid rotational flick
- **WHEN** the player rapidly rotates their view by 90 or 180 degrees
- **THEN** the camera rotational orientation matches player aim instantly without swinging through a distorted arc or flipping 180 degrees.

#### Scenario: Third-person athlete avatar faces aim direction away from camera
- **WHEN** the player spawns, turns, or moves in third-person perspective
- **THEN** the athlete avatar's forward visor and throwing stance face away from the over-the-shoulder camera along the aim vector rather than facing backward toward the camera.

#### Scenario: Backwards dash and close-range combat maneuvering
- **WHEN** the player dashes backwards or maneuvers rapidly towards the trailing camera
- **THEN** the camera maintains a positive separation distance from the focal aim plane and does not pass through or invert view direction.

#### Scenario: Arena boundary pushback
- **WHEN** the player maneuvers near arena perimeter boundaries with the camera facing toward or away from the boundary wall
- **THEN** the camera smoothly pulls inward without clipping outside bounds, getting stuck between player and aim point, or flipping view direction.

#### Scenario: Pointer lock delta spike rejection
- **WHEN** the browser reports an anomalous synthetic mouse movement delta exceeding safe input thresholds
- **THEN** the system clamps anomalous delta frames to the maximum threshold rather than dropping user input, preventing unnatural camera snapping while preserving fluid aiming.

#### Scenario: Unadjusted raw input negotiation
- **WHEN** desktop pointer lock is initiated on a supporting browser platform
- **THEN** the system requests unadjusted raw mouse movement data, falling back to standard pointer lock if unadjusted movement is unsupported.
