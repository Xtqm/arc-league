# Proposal: Hardware Compatibility & High-Refresh Polish

## Why

While Arc League is capable of running at 144+ FPS on modern gaming hardware, players on laptops with dual GPUs (e.g. AMD Ryzen 9 + NVIDIA GeForce RTX 5060, or Intel + NVIDIA Optimus) and high-refresh displays (120Hz, 144Hz, 165Hz, 240Hz) experience severe lag and frame judder out of the box.

Investigation shows that:
1. The `high` and `ultra` presets hardcoded `fpsCap: 60`. On a 144Hz or 165Hz screen, a software 60 FPS limiter skips frames irregularly, creating severe frame pacing judder.
2. `THREE.WebGLRenderer` did not specify `powerPreference: 'high-performance'`, causing Windows and Chrome/Electron to default the game to the low-power integrated CPU graphics (AMD Radeon / Intel UHD) instead of the discrete GPU.
3. Fast gaming mouse swipes exceeding 150px delta were discarded completely rather than clamped, causing sticky or dropped mouse inputs during quick flicks.

Implementing automated dedicated GPU selection, uncapped native refresh rate defaults for High/Ultra presets, and mouse movement clamping ensures all players get a silky smooth 144+ FPS experience out of the box with zero manual troubleshooting.

## What Changes

- **Automatic Discrete GPU Request**: Configure `THREE.WebGLRenderer` with `powerPreference: 'high-performance'` in `src/graphics/scene.js`.
- **Electron GPU Switch**: Add `app.commandLine.appendSwitch('force_high_performance_gpu')` in `desktop/main.cjs` to ensure the desktop shell runs on dedicated graphics on dual-GPU laptops.
- **High-Refresh Native FPS Defaults**: Update `high` and `ultra` graphics presets in `src/core/settings.js` to default to `fpsCap: 0` (Uncapped / Native VSync), allowing 120Hz, 144Hz, 165Hz, and 240Hz monitors to render at their native refresh rate without software frame pacing judder.
- **Responsive Mouse Delta Clamping**: Refactor `look(dx, dy)` in `src/input/mouse.js` to clamp mouse movement to `MAX_MOUSE_DELTA` rather than returning early and dropping fast mouse swipes.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `system-settings`: High and Ultra graphics presets default to uncapped frame rate (`fpsCap: 0`) for native high-refresh synchronization.
- `cinematic-rendering`: WebGL renderer initialization explicitly requests high-performance discrete GPU hardware.
- `desktop-shell`: Electron desktop launcher enforces dedicated high-performance GPU hardware execution.
- `player-character`: Combat mouse aiming clamps excessive pointer deltas while preserving continuous camera orientation during high-velocity flicks.

## Impact

- **Affected Files**: `src/graphics/scene.js`, `src/core/settings.js`, `desktop/main.cjs`, `src/input/mouse.js`.
- **User Experience**: First-time players on gaming laptops and high-refresh monitors automatically experience smooth 120–240 FPS gameplay without needing to manually configure Windows graphics settings or change in-game FPS caps.
