# Proposal

## Why

During normal gameplay, mouse movement periodically triggers abrupt horizontal camera snaps (~23° to 45°), turning the player's aim away from their target and causing combat disorientation. This occurs because Chromium-based browsers dispatch synthetic cursor warp spikes (500px–1920px) when the hidden OS cursor hits screen boundaries under Pointer Lock, and the current input handler clamps these spikes to 180px rather than discarding them—applying a full 180px jump (~22.7°) to player yaw instead of dropping the artifact.

## What Changes

- **Synthetic Pointer Lock Warp Spike Rejection**: Update `src/input/mouse.js:look(dx, dy)` to detect anomalous delta spikes exceeding realistic single-tick thresholds (e.g. `> 150px`) and discard them entirely (`return;`), rather than clamping and applying them as large angular snaps.
- **Unadjusted Raw Mouse Movement Support**: Enhance `tryLock()` in `src/input/mouse.js` to request `{ unadjustedMovement: true }` via `canvas.requestPointerLock()`, bypassing OS-level cursor acceleration and boundary re-centering in Chromium/Windows with automatic fallback to standard pointer lock if unsupported.
- **Unit Test and Parity Verification**: Update `test/gameplay/mouse_camera_input.test.js` to verify that synthetic delta spikes are rejected (zero delta applied to yaw and pitch) rather than clamped to 180px, while legitimate smooth movements remain fully responsive.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `player-character`: Updates the Pointer Lock delta spike scenario under Combat Viewport Stability to specify discarding anomalous spikes instead of clamping them, and requiring raw input negotiation where supported.

## Impact

- `src/input/mouse.js`: Modifies `tryLock()` to negotiate unadjusted movement and updates `look(dx, dy)` delta spike rejection.
- `test/gameplay/mouse_camera_input.test.js`: Updates test assertions for synthetic spike rejection.
- `openspec/specs/player-character/spec.md`: Delta spec updating the spike rejection requirement scenario.
