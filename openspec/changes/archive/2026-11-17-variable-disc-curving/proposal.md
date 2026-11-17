# Proposal

## Why

Identity Disc curving in Arc League is currently binary (`-1.0`, `0.0`, `+1.0`), producing predictable, one-size-fits-all hook trajectories that limit tactical expression and reward pattern memory over spatial mastery. Furthermore, mobile controls require two dedicated curve toggle buttons (`#btnCurveL` and `#btnCurveR`) that crowd the combat HUD. Allowing players to continuously charge curve depth on PC/gamepad and swipe-curve directly from the Throw button on mobile creates an intuitive, high-skill curving system where sweeping flank shots demand a deliberate speed trade-off while micro-hooks preserve velocity.

## What Changes

- **Continuous Curve Charge on PC/Gamepad**: Holding `KeyQ` (hook left) or `KeyE` (hook right)—or gamepad `L1`/`R1`—smoothly ramps curve intensity from 0% to 100% over ~0.40s.
- **Curve Memory & Lock**: Releasing `KeyQ`/`KeyE`/`L1`/`R1` locks the dialed curve intensity for the next throw (with a grace window), allowing players to retain full WASD strafing mobility while aiming and firing. Pressing the opposite curve key immediately cancels/resets curve intent back toward neutral.
- **Velocity Trade-Off (More Curve = Slower Disc)**: Discs launched with high curve magnitude suffer an intentional launch speed penalty (up to 25% slower at 100% curve), trading direct projectile speed for tactical flank angles and 2x rear-strike critical setups.
- **HUD Reticle & Trajectory Parity**: Dynamic crosshair brackets widen outward proportionally to the charged curve intensity while the 3D in-world trajectory line dynamically renders the curved path in real time.
- **Mobile Hold-Throw + Swipe-Curve Gesture**: Removes `#btnCurveL` and `#btnCurveR` DOM buttons. Holding `#btnThrow` charges throw power while dragging outward left/right past a 15px threshold smoothly sets curve direction and magnitude, while maintaining vertical deadzones for camera aiming. Returning thumb to center resets curve to neutral.

## Capabilities

### New Capabilities
*(None. All changes update existing disc flight, input mechanics, and mobile touch systems.)*

### Modified Capabilities
- `disc-combat`: Update `Magnus Effect Curving` requirement to govern continuous variable curve charging, curve memory locking, and inverse velocity scaling ("more curve, slower disc").
- `touch-input`: Update `Touch Action Button Dispatch and Lifecycle Reset` and `Throw Button Hold Aim-Drag Steering` requirements to retire `#btnCurveL`/`#btnCurveR` and specify the Hold-Throw + Swipe-Curve gesture handling.

## Impact

- **Core Physics & Entities**: `src/entities/Disc.js` and `src/entities/Player.js` (speed calculation based on curve, throw data synchronization).
- **Input Controllers**: `src/input/keyboard.js`, `src/input/gamepad.js`, and `src/input/touch.js` (continuous charge accumulator, lock/decay state, touch swipe math).
- **Physics Trajectory Simulation**: `src/physics/trajectory.js` (simulatePath speed reduction based on variable curve).
- **HUD & DOM**: `src/ui/hud.js`, `index.html`, and style sheets (removal of `#btnCurveL`/`#btnCurveR`, variable bracket width/animations).
- **Multiplayer Sync**: `src/entities/Player.js` and `src/network/sync.js` (`curve` float value in `DISC_THROW` payload is already a continuous float, fully backward/forward compatible).
