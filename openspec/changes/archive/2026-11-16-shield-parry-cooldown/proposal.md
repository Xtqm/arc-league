# Proposal

## Why

Shielding is currently an indefinite hold with zero resource cost, zero cooldown, and automatic 1.25x homing deflection across a wide frontal cone. In both PvE (swarms and Arbiter boss encounters) and PvP duels, players can turtle indefinitely against standard throws without timing risk or resource commitment, suppressing fast-paced movement and high-skill combat.

Introducing an active parry window with a mandatory recovery cooldown transforms the shield into a precision reflex tool that rewards reading projectile trajectories, punishes mistimed whiffs, and forces players to combine parrying with dashing, jumping, and evasion against clustered volleys.

## What Changes

- **Active Parry Window**: Replace continuous indefinite shield holding with a discrete active parry window (`0.35s`). Shield input (RMB, Gamepad L2, Touch SHIELD) triggers a parry attempt; holding the input will no longer keep the shield active past the window.
- **Hard Recovery Cooldown**: Introduce a fixed recovery cooldown (`1.0s`) that begins immediately upon expiration of the parry window or upon successful projectile deflection. During this cooldown, the shield cannot be re-engaged.
- **Whiff & Volley Vulnerability**: Missing a parry or facing a rapid clustered volley exposes the player during cooldown, requiring directional dashes, jumping, or spatial evasion to survive subsequent projectiles.
- **Audio & Visual Feedback**:
  - Reticle & touch button feedback indicating parry active, cooling, and ready states.
  - Distinct holographic shield activation snap, expiration whiff fizzle, and existing deflection resonance.
- **Preserved Counterplay**: Keep Guard Crush mechanics intact—discs charged to >= 85% bypass active parries, break guard, and inflict full damage with stagger.

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `player-character`: Modify the `Holographic Shield Deflection` requirement from an indefinite held frontal block into an active, timed parry window (`0.35s`) backed by a fixed recovery cooldown (`1.0s`) that prevents continuous holding and rapid re-activation.

## Impact

- **Core Gameplay & Entities**: `src/entities/Player.js`, `src/core/state.js`, and `src/entities/Disc.js` will manage parry window timing and cooldown counters.
- **Input Controllers**: `src/input/mouse.js`, `src/input/gamepad.js`, and `src/input/touch.js` will treat shield input as an activation impulse rather than a raw continuous hold state.
- **Kinematics & Rendering**: `src/graphics/materials.js` will smoothly snap into parry stance during the active window and return to recovery/neutral postures on window expiration.
- **UI & HUD**: `src/ui/hud.js` and touch button styles will reflect active and cooldown states.
- **Networking**: Network bitflags (`src/network/sync.js`) will continue synchronizing parry stance accurately to remote clients during the active window.
- **Tests**: `test/gameplay/physics_and_combat.test.js` and `test/gameplay/multiplayer.test.js` will be updated to account for parry timing and cooldown behavior.
