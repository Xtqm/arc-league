# Design: Smooth Mobile Touch Camera & Throw Aim-Drag

## Context

See [proposal.md](./proposal.md) for motivation. Currently `src/input/touch.js` writes raw single-event deltas directly to `touchState.lookMomentumX` / `touchState.lookMomentumY` during `onTouchMove`, and `updateTouchMomentum(dt)` applies them per frame *without multiplying by `dt`* (`player.yaw -= touchState.lookMomentumX * touchSens`). Additionally, `#btnThrow` stops event propagation on `touchstart`/`touchend` without tracking its own touch identifier or feeding `touchmove` deltas into camera aiming, and active touch IDs are not cleared across pause/teardown transitions. Existing camera projection stability in `src/graphics/scene.js` (`updateCamera`) is already verified by `test/gameplay/camera_combat_stability.test.js`.

## Goals / Non-Goals

**Goals:**
- Make mobile right-zone camera rotation feel smooth, weighted, and identical across 60Hz, 90Hz, and 120Hz displays using `dt`-scaled velocity inertia and vertical-axis softening (`0.75x`).
- Prevent unwanted post-release spin spikes or delayed drift when the player pauses their thumb briefly before lifting.
- Allow players to steer their aim (`yaw` and `pitch`) seamlessly while holding down `#btnThrow` to charge a disc throw, without ruining quick taps or causing post-throw reticle drift.
- Expose persistent `touchSensitivity`, `touchInertia`, and `invertY` controls in `settingsManager` and `SettingsModal` (Pause & Terminal `SYSTEM CONFIG`).
- Guarantee stuck touches cannot survive pause, modal opening, round reset, or multiplayer teardown.

**Non-Goals:**
- Modifying desktop pointer-lock look (`src/input/mouse.js`), gamepad right-stick look (`src/input/gamepad.js`), or third-person boom collision physics (`src/graphics/scene.js`).
- Changing the Best-of-N multiplayer round structure (deferred to Change C).

## Decisions

### 1. Time-Normalized Velocity Integrator (`px/s`) with EMA Smoothing and Staleness Cutoff
- **Decision**: Replace raw per-frame `lookMomentumX` / `lookMomentumY` deltas with tracked velocity (`px/s`) integrated as `vel * touchSens * dt` after finger release and damped via exponential decay `Math.exp(-damping * dt)`.
  - During `onTouchMove` for `lookTouchId`, clamp jump spikes exceeding `MAX_TOUCH_DELTA` (`240px` per event) while resetting `lastLookX`/`lastLookY`.
  - Compute elapsed sample interval `sampleDt = THREE.MathUtils.clamp((now - lastLookTime) / 1000, 0.008, 0.05)` (`performance.now()`). Seed velocity directly on the first move sample after `touchstart` (so single-flick synthetic events capture clean velocity), then blend subsequent samples via EMA (`alpha = 0.45`), clamped to `MAX_FLICK_VEL = 2200 px/s`. Record `lastLookMoveTime = now`.
  - Store velocity in `touchState.lookMomentumX` / `touchState.lookMomentumY` (`px/s`) so existing debug inspection properties remain coherent and meaningful.
  - In `onTouchEnd` for `lookTouchId`, if `(now - lastLookMoveTime) > 80ms`, zero velocity immediately so stopping your thumb intentionally stops the camera dead instead of drifting.
  - Damping constants by `touchInertia` setting:
    - `'smooth'` (default): `damping = 10.5` (~0.28s smooth settle, bounded gentle follow-through regardless of refresh rate).
    - `'light'`: `damping = 18.0` (quick micro-glide ~0.15s).
    - `'off'`: velocity zeroed on lift (pure 1:1 direct touch aiming).
- **Rationale**: Eliminates both the `~7.3x` overshoot explosion at 60 FPS and the `2x` refresh-rate disparity between 60Hz and 120Hz phones while keeping brisk flick inertia natural when dodging.
- **Alternative Considered**: Eliminating inertia entirely (1:1 only). Rejected by user feedback because dual-thumb Tron movement makes brief thumb repositions feel clipped without a gentle flick tail; shipping `'smooth'` default + `'light'`/`'off'` options satisfies both preferences.

### 2. Throw-Hold Aim-Drag Steering via Dedicated `state.throwTouchId`
- **Decision**: Track `state.throwTouchId` (`null` when idle) along with `throwStartX/Y`, `lastThrowX/Y`, and `throwDragActive` in `touch.js` / `state.js`.
  - `#btnThrow` `touchstart` binds `e.changedTouches[0]?.identifier` (falling back safely for synthetic empty-touch `TouchEvent`s in unit tests), zeroes any lingering look velocity so charging steadies immediately, and triggers `__tronStartChargingThrow()`.
  - `onTouchMove` checks `t.identifier === state.throwTouchId`: once travel from `(throwStartX, throwStartY)` exceeds a `4px` tap-slop radius (and no separate `lookTouchId` owns camera steering), it sets `throwDragActive = true` cleanly on that threshold crossing without a jump, and subsequent moves rotate `player.yaw` and clamped `player.pitch` (`[-0.6, 0.55]`) at active touch sensitivity (`touchPitchSens = touchYawSens * 0.75`).
  - Releasing (`touchend` / `touchcancel` matching `throwTouchId` or synthetic empty list) triggers `__tronReleaseChargingThrow()`, resets `throwTouchId`, and does NOT inject throw-release inertia drift so aimed shots fire strictly on target.
- **Rationale**: Players commonly press `#btnThrow` and track a strafing opponent with the same right thumb while holding charge. Using a `4px` slop threshold prevents accidental camera jitter during fast single taps, while keeping `lookMomentum = 0` on release avoids post-throw drift.

### 3. Touch Sensitivity Scaling & Vertical Pitch Softening
- **Decision**: Compute active `touchYawSens = state.sens * 2.5 * touchSensMult` (where `touchSensMult = settingsManager.get('touchSensitivity', 1.0)`) and `touchPitchSens = touchYawSens * 0.75` for active drag and momentum decay.
- **Rationale**: Keeps horizontal sensitivity baseline parity (`state.sens * 2.5`) when `touchSensitivity === 1.0`, scales proportionally with slider tuning (`0.5x`–`2.0x`), and prevents unintended downward floor or upward sky sweeps during wide horizontal turns.

### 4. Lifecycle Touch Reset (`resetTouchInputs()`)
- **Decision**: Export `resetTouchInputs(options)` from `src/input/touch.js` resetting `moveTouchId`, `lookTouchId`, `throwTouchId`, `lastLookX/Y`, `lastThrowX/Y`, `throwDragActive`, `lookMomentumX/Y`, `touchJumpHeld`, `touchBlocking`, `touchMove`, `hideJoystick()`, and `.pressed` classes on touch buttons. Invoke on pause, focus blur, round reset (`Player.resetRound`), game over, mode menu transition, and multiplayer teardown.
- **Rationale**: Prevents latched movement or camera locks if an overlay intercepts a finger lift or the user pauses mid-swipe.

### 5. System Settings Controls (`SettingsModal` & `settingsManager`)
- **Decision**: Extend `DEFAULT_SETTINGS` in `src/core/settings.js` with `touchSensitivity: 1.0`, `touchInertia: 'smooth'`, and `invertY: false` (syncing `invertY` to `state.invertY`), and render a compact **Controls & Touch** section in `SettingsModal.js` (slider `50%`–`200%`, `SMOOTH`/`LIGHT`/`OFF` preset buttons, and `invertY` toggle). Also ensure `AuthManager` initialization order or `apply()` preserves explicit `settingsManager` overrides cleanly.
- **Rationale**: Integrates automatically with both the Pause Menu modal and the Terminal `[ SYSTEM CONFIG ]` tab delivered in Change A.

## Risks / Trade-offs

- **Existing Test Inertia Contract Change**: `test/gameplay/mobile_controls.test.js` `TEST 8` previously asserted exact raw single-frame `lookMomentumX === -100` and old per-frame drift distance. → *Mitigation*: Update `TEST 8` alongside implementation to assert normalized velocity inertia, 60Hz vs 120Hz frame-rate independence, staleness cutoff, tap-to-stop, throw-hold aim-drag, and inertia preset modes.
- **Rapid Touch-Event Timestamps in Synthetic Unit Tests**: Synchronous `window.dispatchEvent(new TouchEvent(...))` calls execute microseconds apart. → *Mitigation*: Clamp minimum `sampleDt` to `0.008s` (and use `0.016s` fallback when `now - lastLookTime < 2ms`) so both real mobile digitizers (~8ms/120Hz or ~16ms/60Hz) and synchronous automated tests compute well-behaved finite velocities.
- **Settings Surface Length Inside Terminal**: Adding 3 rows to `SettingsModal` makes `.hub-view-config` slightly taller on mobile viewports. → *Mitigation*: Rely on scrollable `.card` container (`mobile_modal_scrolling.test.js` already verifies scrolling inside `.card`) and compact row spacing.
