# Tasks: Render Resolution Scaling & Graphics Quality Presets

## 1. Engine & Composer Render Scaling

- [x] 1.1 Add `renderScale` (0.50 to 1.00) and `bloomQuality` ('full' | 'half' | 'off') to `src/core/settings.js`; verify persistence with `npm run test:storage`.
- [x] 1.2 Update `onResize()` and `initGraphics()` in `src/graphics/scene.js` to decouple internal WebGL backbuffer sizing from CSS dimensions using `renderScale`; verify viewport aspect ratio with `npm run test:graphics`.
- [x] 1.3 Update `CinematicComposer` in `src/graphics/PostProcessing.js` to support half-resolution bloom capture pass; verify bloom rendering with `npm run test:graphics`.

## 2. Quality Preset Profiles

- [x] 2.1 Implement `applyPreset(presetName)` in `src/core/settings.js` configuring shadow maps, bloom quality, particle limits, and render scale; verify settings emission with unit tests.
- [x] 2.2 Wire shadow map dynamic toggling and resolution adjustment in `src/graphics/scene.js`.

## 3. UI Controls Integration

- [x] 3.1 Add Render Scale slider and Quality Preset selector to `src/ui/modals/SettingsModal.js`.
- [x] 3.2 Add Render Scale and Quality Preset controls to the Terminal `SYSTEM CONFIG` view in `src/ui/authTerminal.js`.
- [x] 3.3 Verify settings modal UI interaction and keyboard navigation.

## 4. Verification & Testing

- [x] 4.1 Run graphics test suite (`npm run test:graphics`) to verify all render paths pass without regression.
- [x] 4.2 Verify 2x–3x framerate improvement on high-DPI viewports when switching from 100% to 75% render scale.
