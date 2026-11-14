# Design: Render Resolution Scaling & Graphics Quality Presets

## Context

See `proposal.md` for motivation. Currently, `renderer.setPixelRatio(...)` in `src/graphics/scene.js` caps pixel ratio at 2.0 on desktop and 1.5 on mobile, but directly binds the WebGL canvas drawing buffer resolution to the window dimensions. In `CinematicComposer`, render targets are allocated at `width * pixelRatio`, causing heavy GPU fill-rate load on 4K/Retina displays.

## Goals / Non-Goals

**Goals:**
- Provide internal 3D render scaling (`renderScale`: 0.50 to 1.00) so low/mid-tier GPUs can render smoothly without blurring DOM UI.
- Provide a half-resolution downsample bloom path in `CinematicComposer` that reduces blur pyramid fragment operations by 75%.
- Implement predefined presets (`competitive`, `low`, `medium`, `high`, `ultra`) that automatically adjust combinations of settings.
- Maintain full Tron neon aesthetic on all presets, using half-resolution bloom as the default for Medium rather than turning glow off.

**Non-Goals:**
- Implementing temporal upscaling algorithms (DLSS/FSR) which require motion vectors and external libraries.
- Changing game resolution or aspect ratio.

## Decisions

### Decision 1: Canvas CSS Decoupling for Render Scale
- **Rationale**: Setting `renderer.setSize(w * scale, h * scale, false)` shrinks the internal WebGL backbuffer while leaving the canvas CSS width/height at `100vw` / `100vh`. The browser automatically performs bicubic upscaling on the GPU with virtually zero overhead.
- **Alternatives Considered**:
  - *Custom fullscreen blit pass*: Adds an extra render pass and texture copy; native canvas CSS scaling is hardware-accelerated and free.

### Decision 2: Half-Resolution Bloom Capture
- **Rationale**: The bloom filter extracts glowing highlights and blurs them across large radii. Downsampling the scene texture to half-resolution before the downsample/upsample blur pyramid maintains wide, soft neon glow halos with no perceptible loss of quality.
- **Alternatives Considered**:
  - *Fewer blur mips*: Reducing mips from 5 to 3 makes bloom look blocky and narrow. Downsampling preserves the 5-mip radius while operating on a fraction of the pixels.

### Decision 3: Preset Profile Definitions
- **Rationale**: A preset matrix in `settings.js` maps each preset to discrete values:
  - `ultra`: 1.0 scale, Full bloom, 2048 shadows, 100% particles.
  - `high`: 1.0 scale, Full bloom, 1024 shadows, 100% particles (Default).
  - `medium`: 0.85 scale, Half bloom, 512 shadows, 75% particles.
  - `low`: 0.70 scale, Half bloom, Shadows off, 50% particles.
  - `competitive`: 0.75 scale, Bloom off, Shadows off, 25% particles, Uncapped FPS.

## Risks / Trade-offs

- **[Text aliasing inside WebGL]** → Mitigation: All game text and UI (health bars, timers, reticles, dialogs) are DOM/HTML elements in `#hud`, so they always render at native screen resolution regardless of 3D render scale.
- **[Canvas aspect ratio distortion on resize]** → Mitigation: The `onResize()` handler in `scene.js` consistently recalculates `camera.aspect = w / h` and scales canvas buffer dimensions uniformly.
