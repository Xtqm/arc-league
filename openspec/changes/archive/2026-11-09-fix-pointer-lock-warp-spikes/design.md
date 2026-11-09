# Design

## Context

In `src/input/mouse.js`, mouse input is processed through `look(dx, dy)`, which currently clamps incoming deltas to `MAX_MOUSE_DELTA = 180`. Additionally, `tryLock()` invokes `canvas.requestPointerLock()` without options, causing Chromium-based browsers on Windows to use OS-accelerated virtual coordinates that periodically wrap and emit synthetic deltas of 500px–1920px. See `proposal.md` for full problem motivation.

## Goals / Non-Goals

**Goals:**
- Completely eliminate horizontal and vertical camera angle snapping caused by Chromium Pointer Lock boundary re-centering events.
- Negotiate raw hardware mouse input via `unadjustedMovement: true` on supporting platforms to prevent cursor boundary wrapping at the source.
- Provide a robust fallback to standard pointer lock if `unadjustedMovement` is unsupported.
- Preserve 1:1 responsive aiming without adding angular lag or input latency.
- Update the test suite in `test/gameplay/mouse_camera_input.test.js` to enforce spike rejection.

**Non-Goals:**
- Altering the camera boom geometry, shoulder offsets, or wall compression in `src/graphics/scene.js`.
- Modifying touch or gamepad aiming logic.

## Decisions

### Decision 1: Discard Outlier Delta Spikes Instead of Clamping

- **Choice**: Replace delta clamping in `look(dx, dy)` with an outright rejection threshold. If `Math.abs(dx) > MAX_MOUSE_DELTA` or `Math.abs(dy) > MAX_MOUSE_DELTA` (threshold set to `150px`), the event is discarded immediately (`return;`) without modifying `player.yaw` or `player.pitch`.
- **Rationale**: In modern mouse input handling, a delta exceeding 150px in a single event tick represents an impossible hand velocity (> 9,000 px/sec at 60Hz, > 150,000 px/sec at 1000Hz). Synthetic Chromium pointer-lock warps consistently measure 500px to 1920px. Discarding the single synthetic tick produces zero angular jerk, while real high-speed flicks (which distribute displacement across multiple ticks of 5px–40px) remain completely uninterrupted.
- **Alternatives Considered**:
  - *Clamping to a lower threshold (e.g. 50px)*: Rejected because clamping still applies an unwanted 6.3° snap.
  - *Moving average filter*: Rejected because moving averages introduce angular lag and destroy crisp competitive flick aiming.

### Decision 2: Raw Input via `unadjustedMovement: true` with Fallback

- **Choice**: Update `tryLock()` in `src/input/mouse.js` to request raw mouse input:
  ```javascript
  const promise = canvas.requestPointerLock({ unadjustedMovement: true });
  if (promise && promise.catch) {
    promise.catch(err => {
      // Fallback to standard pointer lock if unadjusted movement is unsupported
      if (err.name === 'NotSupportedError') {
        const fallback = canvas.requestPointerLock();
        if (fallback && fallback.catch) fallback.catch(() => { lockFailed = true; });
      } else {
        lockFailed = true;
      }
    });
  }
  ```
- **Rationale**: Chromium 88+ on Windows supports `unadjustedMovement`, which uses `WM_INPUT` to read raw hardware counts directly. This prevents OS-level cursor boundary wrapping and completely stops Chromium from generating warp spikes in the first place. The fallback ensures compatibility across all operating systems, compositors, and older browsers.
- **Alternatives Considered**:
  - *Standard pointer lock only*: Rejected because relying solely on software spike filtering without raw input leaves cursor acceleration active and allows unnecessary boundary warps to occur.

## Risks / Trade-offs

- **[Risk] High-speed flick false-positive drop** → **Mitigation**: A threshold of 150px per event tick permits rotation speeds of up to ~1300°/sec at 60Hz and > 18,000°/sec at 1000Hz. Real human hand movements never exceed 40px per tick even during aggressive esport flicks.
- **[Risk] Browser throws `NotSupportedError` synchronously or triggers `pointerlockerror`** → **Mitigation**: The fallback handles both synchronous exception throwing and Promise rejection, gracefully dropping back to standard pointer lock without breaking the user interaction flow.
