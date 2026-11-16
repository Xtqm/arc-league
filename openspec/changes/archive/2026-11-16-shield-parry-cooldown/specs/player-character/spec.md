# Spec Delta

## MODIFIED Requirements

### Requirement: Holographic Shield Deflection
The system SHALL trigger an active parry window (0.35s) upon shield input, deflecting incoming hostile projectiles striking frontally during the window, accelerating their velocity, transferring ownership to the defender, and enforcing a mandatory recovery cooldown (1.0s) upon window expiration or successful deflection during which the shield cannot be raised.

#### Scenario: Frontal parry deflection
- **WHEN** an incoming hostile disc strikes the player frontally while the active parry window is active
- **THEN** the disc is deflected back toward the attacker at accelerated velocity (1.25x), projectile ownership transfers to the player, its color turns white, and the shield enters recovery cooldown immediately.

#### Scenario: Shield input during recovery cooldown is ignored
- **WHEN** the player activates the shield input while the recovery cooldown is active
- **THEN** no parry window is triggered, the shield is not raised, and the player remains vulnerable.

#### Scenario: Expired parry window without contact incurs full recovery cooldown
- **WHEN** the player activates the shield input and no hostile projectile strikes within the 0.35s parry window
- **THEN** the parry window closes and the shield enters the 1.0s recovery cooldown.

#### Scenario: Sustained shield input does not prolong active parry window
- **WHEN** the player holds the shield input continuously beyond 0.35s
- **THEN** the shield does not remain raised, the active window closes at 0.35s, and the recovery cooldown is initiated.
