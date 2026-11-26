# Design: Fix Player Rig Facing and Halo Orientation

## Context

See [proposal.md](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/openspec/changes/fix-rig-facing-and-halo/proposal.md) for motivation. Inspection of the codebase and `assets/models/constructs/athlete_base.glb` revealed two concrete causes:
1. **Facing Direction Mismatch (`Player.js` vs. `Bot.js` / `scene.js`):** Every Construct rig (`makeProgram` procedural and `athlete_base.glb`) is modeled with its local forward visor facing `+Z`, which `Bot.js` (`fwdX = sin(rotY)`, `fwdZ = cos(rotY)`) and `test/combat/bot_parry_guard_crush.test.js` (`rotation.y = 0 -> (0,0,1)`, `rotation.y = Math.PI -> (0,0,-1)`) depend on. Meanwhile, `Player.js` and `scene.js` compute camera/aim forward as `(-sin(yaw), 0, -cos(yaw))` (`-Z` when `yaw = 0`), yet `Player.js` assigns `state.player.obj.rotation.y = state.player.yaw` without `+ Math.PI`.
2. **Double-Rotated Halo in `athlete_base.glb`:** Inside `athlete_base.glb`, the `halo_crown` mesh vertices are already authored flat in the horizontal XZ plane (`min.y = -0.022`, `max.y = +0.022`), but the `halo_crown` node also carries a ~70-degree X-rotation quaternion (`[0.566, 0.120, 0.049, 0.814]`) and low `t.y = 0.09` offset. That rotates an already-horizontal ring nearly upright around the head/neck. Furthermore, `animateProgramKinematics` in `src/graphics/materials.js` directly overwrites `rig.userData.headHalo.rotation.z = 0.22 + ...` instead of preserving the node's authored rest rotation.

## Goals / Non-Goals

**Goals:**
- Rotate `state.player.obj.rotation.y` by `state.player.yaw + Math.PI` in `Player.js` (`updatePlayer` and `resetRound`) so the player's Construct rig faces away from the third-person camera into the arena, while preserving `Bot.js`, `ArmoryPreviewScene.js`, and `ambientLobby.js` rig orientations untouched.
- Fix `halo_crown` in `assets/models/constructs/athlete_base.glb` via Blender (re-exporting cleanly so `halo_crown` floats above the head crown at `y ~ 0.34` with a subtle ~18-degree tilt rather than upright at `y = 0.09`).
- Update `animateProgramKinematics()` in `src/graphics/materials.js` to oscillate `headHalo` smoothly relative to a cached rest rotation (`userData._baseHaloRotZ` / `_baseHaloRotX`) so both procedural (`TorusGeometry` in XY rotated ~70°) and GLB (XZ torus rotated ~18°) halos animate cleanly.

**Non-Goals:**
- Reversing the local `+Z` forward axis of `athlete_base.glb`, `chevron_drone.glb`, or `sentinel_boss.glb` (would break `Bot.js`, `ambientLobby.js`, and existing combat tests).
- Changing `chassis_arbiter` (`wireframeToggle: true`) styling (confirmed intentional).

## Decisions

### 1. Offset `Player.js` Rig Yaw by `+ Math.PI` Rather Than Flipping Models
- **Decision:** Keep all Construct `.glb` and procedural models facing `+Z` locally and apply `state.player.obj.rotation.y = state.player.yaw + Math.PI` in `src/entities/Player.js`.
- **Rationale:** `Bot.js` (`Math.atan2(dx, dz)`) and `bot_parry_guard_crush.test.js` explicitly assert `+Z` as local forward. Adding `+ Math.PI` in `Player.js` is a single-site fix that aligns `Player` with `scene.js` camera forward without touching bots, lobby diorama, or Blender rigs' root axes.
- **Airborne Pitch Check:** Because `THREE.Object3D.rotation` uses `'XYZ'` Euler order by default, `rotation.x` applies in local space before `rotation.y`. We will verify whether `rotation.x` (`-state.player.vy * 0.018`) tilts backward/forward naturally with `rotation.y = yaw + Math.PI` and verify throw/parry posture visually.

### 2. Fix `halo_crown` Transform at the Source in Blender (`athlete_base.glb`)
- **Decision:** Use Blender MCP to adjust `halo_crown` in `athlete_base.glb` so it sits above the head crown (`y ~ 0.34–0.38` relative to `head`) with a subtle ~18-degree tilt relative to horizontal XZ, and re-export `assets/models/constructs/athlete_base.glb`.
- **Rationale:** Fixes the asset itself for any consumer (`ArmoryPreviewScene`, `ambientLobby`, `Player`, external viewers) rather than patching around a broken node quaternion in runtime JS.
- **Safety Net in `materials.js`:** Cache `headHalo.userData._baseHaloRotZ` on first frame in `animateProgramKinematics()` so procedural rigs keep `0.22` and GLB rigs oscillate around their authored tilt without snapping.

## Risks / Trade-offs

- **Blender GLB re-export losing animation clips or custom naming** -> Inspect `athlete_base.glb` node/animation channels before and after export (`ConstructLoader` required clips `idle_hover`..`aerial_tuck`, `halo_crown`, `palm_socket_r`, `dorsal_socket`) and run `test/graphics/construct_loader.test.js` + `test/graphics/humanoid_rig.test.js`.
- **First-person arm/disc visibility after `+ Math.PI` rotation** -> `setRigFirstPersonVisibility` hides head/torso/halo and keeps `rightShoulder`/`rightElbow`/`rightHand`/`backDisc` visible; flipping the rig `+ Math.PI` actually makes the first-person right throwing arm project *forward* in the camera's view direction instead of backward behind the camera! Still verify in live WebGL 1P & 3P views.
