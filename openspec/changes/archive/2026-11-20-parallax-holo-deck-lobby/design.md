# Design: Parallax Holo-Deck Lobby Architecture

## Context

The previous lobby implementation spawned the player inside a wide 3D arena where movement and aiming required Pointer Lock (`requestPointerLock()`), creating severe UX traps: the mouse cursor was trapped, clicking header elements required pressing Escape, but pressing Escape triggered the active match pause menu (`__tronPauseGame()`), and essential system settings were tucked inside identity terminal tabs or the pause menu.

This design re-architects the lobby into a stationary 1st-person Parallax Holo-Deck cockpit where the cursor is permanently free, camera orientation is driven by smooth parallax damping, core selection uses kinetic disc projectile physics, and target cores shatter into glowing neon voxels.

## Goals / Non-Goals

**Goals:**
- **Zero Pointer Lock Friction**: The player's mouse cursor remains visible and interactive across all DOM UI elements and 3D canvas space at all times in the lobby.
- **Smooth Parallax Camera Damping**: Moving the mouse across the viewport tilts the camera smoothly ($\pm 8^\circ$ yaw, $\pm 5^\circ$ pitch) using exponential decay lerp (`0.06` factor).
- **Kinetic Disc Projectile Animation**: Clicking a core spawns an Identity Disc projectile from the bottom edge of the screen that streaks into the target core with audio feedback (~0.25s).
- **Neon Pixel Shatter & Cinematic Re-Assembly**: On impact, the target core and text badge instantly hide while 100-150 neon voxel particles burst outward. Clicking Cancel or pressing Escape smoothly draws the particles back / plays a digital glitch re-materialization effect to restore the core.
- **Input Concurrency Lockout**: Single-flight state prevents spam clicks or conflicting mode transitions while a disc is traveling.
- **DOM Header Occlusion**: Clicks and hovers on `#identityHeader` or modal dialogs never bleed through to raycast 3D cores behind them.
- **Direct Dual Settings Access**: Add a persistent `[ ⚙ ]` gear icon button in `#identityHeader` and an in-world `SETTINGS` Core in the Holo-Deck arc.
- **Strict Key Isolation**: Suppress `WASD`, Arrow keys, and `P` in lobby mode; route `Escape` to drawer cancellation or native desktop exit.

**Non-Goals:**
- 3rd-person avatar locomotion in the lobby (lobby is 1st-person cockpit only).
- Heavy CPU rigid-body convex fracture mesh generation (use high-performance GPU points buffer particles).
- Browser window closing on `Escape` (only Electron desktop shell prompts exit; web browsers remain safely inert).

## Decisions

### 1. Free Mouse Cursor with Parallax vs Pointer Lock FPS Aim
- **Choice**: Keep the cursor free (`document.pointerLockElement !== canvas`) and derive camera rotation from normalized cursor screen coordinates `(ndcX, ndcY)` relative to viewport center.
- **Rationale**: Trapping the mouse in an application launcher creates high friction when players want to inspect their identity, click settings, or navigate tabs. Parallax provides a 3D sense of presence and depth without locking user input.
- **Alternatives Considered**:
  - *Pointer Lock Aim*: Rejected due to trapped cursor, browser permission prompts, and navigation friction.
  - *Static 2D Fixed Camera*: Lacks tactile immersion and physical presence.

### 2. GPU Points Buffer Particle Shatter vs Mesh Fracture
- **Choice**: Leverage the existing high-performance additive `BufferGeometry` particle pool in `src/graphics/particles.js` to emit 120-150 neon voxel points with random radial velocity and linear fade.
- **Rationale**: Real-time Voronoi mesh fracture creates massive garbage collection overhead and Three.js geometry churn. A tuned particle burst combined with hiding the core mesh achieves an instantaneous 60/120+ FPS digital voxel explosion with zero memory allocations.
- **Alternatives Considered**:
  - *Pre-broken GLTF fragment meshes*: Increases asset size and bundle weight.

### 3. Cinematic Reverse-Glitch Re-Assembly
- **Choice**: On Cancel or Escape, play a 0.22s cinematic restoration sequence: an inward particle implosion/spark convergence followed by a high-frequency chromatic/glitch flicker as the core mesh unhides, accompanied by a synthesizer pulse audio cue.
- **Rationale**: Immediate pop-in feels abrupt and broken. An inward glitch re-assembly reinforces the digital "Tron" aesthetic and gives clear sensory feedback that the action was undone.

### 4. DOM Header Occlusion via `document.elementFromPoint()`
- **Choice**: In the canvas `mousemove` and `click` listeners, check if `document.elementFromPoint(e.clientX, e.clientY)` belongs to `#identityHeader` or any active modal container before initiating Three.js raycasting.
- **Rationale**: Prevents accidental disc throws when players are simply trying to click `[ SECURE IDENTITY ]`, `[ ⚙ ]`, or `[ 2D MENU ]`.

### 5. Dual Settings Placement
- **Choice**: Provide both an in-world holographic `SETTINGS` Energy Core positioned at the center-bottom of the 120-degree arc, and a persistent `[ ⚙ ]` gear button inside `#identityHeader`.
- **Rationale**: Satisfies both spatial immersion (flinging a disc at the settings node) and rapid utility (1-click access from the header bar without looking around).

### 6. Desktop Electron Shell vs Browser Escape Handling
- **Choice**: Detect `window.__electronBridge` or `process.versions.electron`. If present and no modals/drawers are open, `Escape` displays a confirmation dialog: `TERMINATE PROCESS // EXIT TO DESKTOP?`. In standard web browsers, `Escape` at root lobby is a no-op.
- **Rationale**: Prevents accidental web page navigation or closing, while providing standard PC gaming exit ergonomics for desktop players.

## Risks / Trade-offs

- **[Risk] Mouse leaving window or rapid cursor flicks causes camera snapping.**
  → *Mitigation*: Clamp target yaw to $[-8^\circ, +8^\circ]$ and pitch to $[-5^\circ, +5^\circ]$; apply exponential decay damping (`lerp` with factor `0.06` per tick) so sudden movements smoothly decelerate.
- **[Risk] Narrow mobile/tablet viewports clipping outer cores.**
  → *Mitigation*: Dynamically adjust camera Z-distance and radial spread based on aspect ratio; maintain the `[ 2D MENU ]` button for instant fallback on small mobile devices.
- **[Risk] Double-clicking or spamming clicks during disc flight.**
  → *Mitigation*: Enforce an atomic `state.lobbyLaunching` flag set to `true` on initial launch; all subsequent canvas clicks are ignored until either the drawer mounts or the action is canceled.
- **[Risk] Motion sensitivity for sensitive players.**
  → *Mitigation*: Provide a `Menu Parallax: ON / OFF` toggle in System Settings (default: ON) that freezes camera rotation at center when disabled.
