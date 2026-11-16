# Design: Hardware Compatibility & High-Refresh Polish

## Context

See `proposal.md` for motivation. On dual-GPU laptops (e.g. AMD Ryzen 9 APU + NVIDIA GeForce RTX 5060), browsers and Electron default to integrated graphics unless high-performance power preference is explicitly declared. Additionally, enforcing `fpsCap: 60` on 120Hz, 144Hz, and 240Hz monitors causes uneven frame skipping (frame pacing judder). Finally, fast mouse flicks can produce deltas > 150px on high-DPI gaming mice, causing `mouse.js` to drop inputs.

## Goals / Non-Goals

**Goals:**
- Automatically route WebGL rendering to the host system's dedicated discrete GPU.
- Synchronize frame rendering smoothly with the display's native refresh rate out-of-the-box on High and Ultra presets.
- Preserve continuous aim tracking during high-velocity mouse swipes without dropping input events.
- Maintain existing user configurability in the Settings modal (players can still manually select 60, 120, 144, or Uncapped).

**Non-Goals:**
- Altering core camera geometry, FOV, or sensitivity curves.
- Changing low or medium preset targets (low/medium remain targeted at battery/budget performance).

## Decisions

### Decision 1: Default High and Ultra Presets to Uncapped (`fpsCap: 0`)
- **Rationale**: Setting `fpsCap: 0` allows the browser's `requestAnimationFrame` loop to run unthrottled and naturally synchronize with display VSync. 60Hz panels run at 60 FPS, 120Hz at 120 FPS, 144Hz at 144 FPS, and 240Hz at 240 FPS with zero irregular frame skipping.
- **Alternatives Considered**:
  - *Hardcoding 144 FPS*: If a user has a 60Hz, 165Hz, or 240Hz screen, hardcoding 144 recreates the exact same frame pacing judder. Uncapped (`0`) lets display hardware VSync govern timing cleanly.

### Decision 2: Explicit High-Performance WebGL Context Preference
- **Rationale**: Passing `powerPreference: 'high-performance'` to `THREE.WebGLRenderer` signals the OS compositor (Windows DXGI/DirectX ANGLE) to dispatch rendering to the discrete GPU.
- **Alternatives Considered**:
  - *Relying on OS global settings*: Requires end-users to manually dig into Windows Settings or NVIDIA Control Panel, which creates a frustrating first-time experience.

### Decision 3: Electron High-Performance Chromium Switch
- **Rationale**: Adding `app.commandLine.appendSwitch('force_high_performance_gpu')` ensures the standalone Electron binary activates the discrete GPU upon launch.
- **Alternatives Considered**:
  - *None*: Standard Electron best practice for 3D desktop gaming applications.

### Decision 4: Mouse Delta Clamping Instead of Discarding
- **Rationale**: Replacing `if (Math.abs(dx) > MAX_MOUSE_DELTA) return;` with:
  ```javascript
  const clampedDx = Math.sign(dx) * Math.min(Math.abs(dx), MAX_MOUSE_DELTA);
  const clampedDy = Math.sign(dy) * Math.min(Math.abs(dy), MAX_MOUSE_DELTA);
  ```
  rejects unbounded pointer lock jump glitches (e.g. 2000px warp events on lock acquisition) while ensuring fast user flicks still impart rotational velocity.
- **Alternatives Considered**:
  - *Increasing MAX_MOUSE_DELTA to 500*: Increases susceptibility to pointer lock warp glitches; clamping caps the rate cleanly while never dropping an input frame.

## Risks / Trade-offs

- **[Higher power consumption on battery]** → Mitigation: Players on battery can select `Medium` or `Low` presets (which retain 60 FPS caps and reduced render scaling), while `High` and `Ultra` prioritize maximum gaming performance.
