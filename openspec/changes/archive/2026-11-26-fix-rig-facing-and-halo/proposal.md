# Proposal: Fix Player Rig Facing and Halo Orientation

## Why

Two visual orientation bugs currently break player Construct presentation in live matches:
1. `Player.js` sets `state.player.obj.rotation.y = state.player.yaw` even though Construct rigs face `+Z` locally while camera/movement forward uses `-Z`, making the player's Athlete Rig face backward toward the over-the-shoulder camera instead of away into the arena.
2. In `assets/models/constructs/athlete_base.glb`, the `halo_crown` mesh vertices were exported already flat in the XZ plane while the node also carries a ~70-degree X-rotation (`r = [0.566, 0.120, 0.049, 0.814]`) and low `y = 0.09` offset, double-rotating the halo into an upright ring around the head and neck instead of floating horizontally/tilted above the head.

## What Changes

- Align player Construct rig yaw in `src/entities/Player.js` (`updatePlayer` and `resetRound`) by offsetting `state.player.obj.rotation.y = state.player.yaw + Math.PI` so the rig's `+Z` front faces along `fwd = (-sin(yaw), 0, -cos(yaw))` away from the third-person camera, and verify airborne pitch (`rotation.x`), throw stance, and parry stance alignment.
- Fix `halo_crown` orientation and height in Blender (`assets/models/constructs/athlete_base.glb`) so the torus floats cleanly above the faceted head (`y ~ 0.34–0.38`) with a subtle ~18-degree heroic tilt instead of wrapping vertically around the head/neck.
- Harden `animateProgramKinematics()` in `src/graphics/materials.js` so `headHalo` idle wobble oscillates gently around its authored rest rotation rather than assuming an unrotated XY torus.
- Add unit tests verifying player rig forward alignment (`yaw = 0` -> rig facing `-Z` away from camera) and horizontal/above-head `halo_crown` bounds/orientation on `athlete_base.glb`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `player-character`: Ensure the third-person player Construct avatar aligns its forward orientation with the player aim vector away from the trailing camera.
- `program-humanoid-rigs`: Ensure the Player Athlete Rig `headHalo` (`halo_crown`) floats cleanly above the head with a subtle horizontal tilt rather than rotating upright around the neck/face on both GLB and procedural rigs.

## Impact

- **Affected code**: `src/entities/Player.js`, `src/graphics/materials.js`.
- **Affected assets (Blender)**: `assets/models/constructs/athlete_base.glb` (via Blender MCP re-export of `halo_crown` transform/position).
- **Tests**: `test/graphics/humanoid_rig.test.js`, `test/combat/` or `test/gameplay/` player orientation verification.
