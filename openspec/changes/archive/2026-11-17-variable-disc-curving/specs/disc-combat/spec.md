# Spec Delta: disc-combat

## MODIFIED Requirements

### Requirement: Magnus Effect Curving
The system SHALL apply continuous variable lateral horizontal acceleration perpendicular to disc velocity scaled by dialed curve intent, reduce launch velocity inversely with curve magnitude to trade speed for angle, retain dialed curve in memory upon control release until thrown or cancelled, and provide active dynamic widening curve bracket feedback.

#### Scenario: Dedicated curve throw
- **WHEN** the player engages hook left (KeyQ or gamepad L1) or hook right (KeyE or gamepad R1)
- **THEN** curve magnitude continuously ramps from 0.0 up to 1.0 over 0.40 seconds in the chosen direction without character movement keys imparting curve bias, and releasing locks the curve in memory until thrown or cancelled.

#### Scenario: Crosshair curve indicator parity
- **WHEN** curve intent is engaged on keyboard, touch, or gamepad controller
- **THEN** the crosshair displays the active curve bracket indicator widening outward and pulsing proportionally to the dialed curve magnitude.

#### Scenario: Horizontal speed conservation
- **WHEN** lateral Magnus acceleration curves a disc in flight
- **THEN** speed conservation scaling is computed strictly over horizontal velocity components, preserving vertical pitch velocity and ensuring uniform hook radius regardless of vertical motion.

#### Scenario: Gyroscopic curvature dampening under charge
- **WHEN** a disc is thrown with a charge level greater than zero
- **THEN** lateral Magnus acceleration is scaled down proportionally to the charge ratio, producing a flatter, more linear trajectory than an uncharged throw with the same curve input.

#### Scenario: Inverse curve launch velocity trade-off
- **WHEN** a disc is launched with a non-zero curve magnitude
- **THEN** the launch velocity is reduced proportionally to curve magnitude, applying up to a 25% speed penalty at maximum curve (magnitude 1.0) compared to a straight throw at the same throw charge level.
