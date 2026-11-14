# Proposal: Render Resolution Scaling & Graphics Quality Presets

## Why

Arc League's cinematic look relies heavily on full-resolution HDR selective bloom and ACES filmic tone-mapping. On high-DPI displays (MacBook Retina, 1440p, 4K monitors), rendering the 3D scene at native display resolution pushes up to 8 million pixels through 5 post-processing blur passes, severely degrading frame rates on integrated GPUs and mid-range graphics cards.

By introducing internal 3D render resolution scaling (50%–100%) and tiered graphics presets (Competitive / Low / Medium / High / Ultra), players can achieve massive GPU performance gains ($2\times–4\times$ fill-rate improvement) while keeping the 2D combat HUD and text razor-sharp at native display resolution and maintaining the signature cyberpunk neon aesthetic.

## What Changes

- **Render Resolution Scaling**: Add internal 3D buffer resolution scaling (`renderScale`, 0.5x to 1.0x) decoupled from DOM/HUD resolution. The 3D canvas renders at scaled resolution with hardware bicubic filtering, while the HUD renders at native device pixel ratio.
- **Bloom Quality Scaling**: Provide bloom post-processing quality modes (Full Resolution, Half-Resolution Downsampled, and Off) in `CinematicComposer`. Half-resolution bloom preserves the neon glow while reducing post-processing pixel operations by 75%.
- **Tiered Quality Presets**: Introduce one-click quality presets (`Competitive`, `Low`, `Medium`, `High`, `Ultra`) that configure shadow map resolution, bloom quality, particle budgets, and render scale simultaneously.
- **Settings UI Controls**: Expose Render Scale slider and Quality Preset dropdown in the System Settings modal and Terminal configuration tab.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `system-settings`: Add requirements for render resolution scaling and tiered graphics quality preset configuration.
- `cinematic-rendering`: Add requirement for decoupled viewport render scaling and downsampled bloom compositing.

## Impact

- **Affected Files**: `src/core/settings.js`, `src/graphics/scene.js`, `src/graphics/PostProcessing.js`, `src/ui/modals/SettingsModal.js`, `src/ui/authTerminal.js`.
- **Visual Aesthetic**: Default remains Ultra (100% render scale, full HDR bloom); lower tiers preserve neon color saturation and edge highlights.
- **Performance**: Dramatically improves framerates on 4K/Retina displays and low/mid-tier GPUs.
