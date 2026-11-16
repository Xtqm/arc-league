# Tasks: Hardware Compatibility & High-Refresh Polish

## 1. High-Performance GPU Hardware Selection

- [x] 1.1 Add `powerPreference: 'high-performance'` to `THREE.WebGLRenderer` initialization options in `src/graphics/scene.js`; verify renderer instantiation with `npm run test:graphics`.
- [x] 1.2 Add `app.commandLine.appendSwitch('force_high_performance_gpu')` in `desktop/main.cjs` to enforce dedicated discrete GPU usage in desktop builds; verify Electron startup with `npm run test:desktop`.

## 2. High-Refresh Preset Defaults

- [x] 2.1 Update `high` and `ultra` presets in `src/core/settings.js` to default to `fpsCap: 0` (uncapped / native display VSync); verify preset definition in `test/graphics/cinematic_pipeline.test.js`.
- [x] 2.2 Verify preset application, custom overrides, and storage persistence with `npm run test:storage`.

## 3. Mouse Aim Responsiveness

- [x] 3.1 Refactor `look(dx, dy)` in `src/input/mouse.js` to clamp rotational deltas to `MAX_MOUSE_DELTA` rather than dropping the input event; verify with `npm run test:gameplay`.
- [x] 3.2 Verify pointer lock warp rejection continues to guard against single-frame lock glitches while allowing continuous fast mouse flicks.

## 4. Verification & Testing

- [x] 4.1 Run domain test suites (`npm run test:graphics`, `npm run test:gameplay`, `npm run test:desktop`) to verify zero regressions.
- [x] 4.2 Verify smooth 144+ FPS frame pacing on High and Ultra presets with native display refresh synchronization.
