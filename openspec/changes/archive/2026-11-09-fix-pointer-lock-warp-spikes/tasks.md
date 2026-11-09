# Tasks

## 1. Pointer Lock Input Spike Rejection & Raw Input

- [x] 1.1 Update `src/input/mouse.js:look(dx, dy)` to reject delta spikes exceeding `MAX_MOUSE_DELTA = 150` by discarding the event (`return;`) instead of clamping, verifying normal deltas still adjust `player.yaw` and `player.pitch`.
- [x] 1.2 Update `src/input/mouse.js:tryLock()` to request pointer lock with `{ unadjustedMovement: true }` and implement fallback to standard `canvas.requestPointerLock()` on `NotSupportedError` or failure.

## 2. Test Suite & Viewport Stability Verification

- [x] 2.1 Update `test/gameplay/mouse_camera_input.test.js` to assert that synthetic warp spikes (+1500px, -1200px, 1920px) are discarded with zero angular delta applied to `yaw` and `pitch`, verifying unit test suite passes via `node test/gameplay/mouse_camera_input.test.js`.
- [x] 2.2 Run full test runner (`node test/runner.js`) to verify camera combat stability, disc trajectory, and input parity remain passing without regressions.
