# Tasks

## 1. Player Rig Facing Alignment

- [x] 1.1 Update `updatePlayer()` and `resetRound()` in `src/entities/Player.js` to set `state.player.obj.rotation.y = state.player.yaw + Math.PI`, verify airborne local `rotation.x` pitch and first-person arm visibility behave naturally, and add a unit test asserting `yaw = 0` orients the player rig forward vector along `-Z` away from the camera (`npm run test:gameplay`).

## 2. Blender Halo Orientation & Runtime Kinematics Guard

- [x] 2.1 Import `assets/models/constructs/athlete_base.glb` into Blender via Blender MCP, reposition `halo_crown` cleanly above the head (`y ~ 0.34–0.38` relative to `head`) with a subtle ~18-degree horizontal tilt (removing the double ~70-degree rotation), re-export `assets/models/constructs/athlete_base.glb` preserving all bones, sockets, and animation clips (`idle_hover`–`aerial_tuck`), and verify via GLTF node inspection and Blender viewport `look`.
- [x] 2.2 Update `animateProgramKinematics()` in `src/graphics/materials.js` to oscillate `headHalo` relative to its authored rest rotation (`userData._baseHaloRotZ`) instead of hardcoding `0.22`, and add an assertion in `test/graphics/humanoid_rig.test.js` verifying `halo_crown` rests horizontally tilted above the head (`npm run test:graphics`).

## 3. Regression & Live Verification

- [x] 3.1 Run the full test suite (`npm test`) and verify in live WebGL/Armory preview that the player athlete faces away from the trailing camera and the glowing halo floats horizontally tilted above the head.
