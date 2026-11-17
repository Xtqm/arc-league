import assert from 'assert';
import * as THREE from '../../vendor/three.module.js';
import { state, player, touchState } from '../../src/core/state.js';
import {
  onTouchMove,
  onTouchEnd,
  resetTouchInputs,
  THROW_DRAG_SLOP,
  TOUCH_CURVE_THRESHOLD,
  TOUCH_CURVE_MAX_DIST
} from '../../src/input/touch.js';
import { getPlayerCurveIntent, resetPlayerCurveIntent } from '../../src/input/keyboard.js';

console.log('--- Running Mobile Hold-Throw + Swipe-Curve Unit Tests ---');

// Setup initial state
state.isTouchDevice = true;
state.running = true;
state.paused = false;
player.alive = true;
player.yaw = 0.0;
player.pitch = 0.0;
resetTouchInputs();

function mockTouchEvent(type, touches) {
  return {
    type,
    changedTouches: touches,
    touches,
    preventDefault: () => {}
  };
}

// 1. Initial Deadzone & Slop (< 10px)
console.log('1. Testing Quick Tap & Central Deadzone (< 10px)...');
state.throwTouchId = 101;
touchState.throwStartX = 500;
touchState.throwStartY = 500;
touchState.lastThrowX = 500;
touchState.lastThrowY = 500;
touchState.throwDragActive = false;

// Move within slop: dx = 3, dy = 4 -> dist = 5 (< 10px)
onTouchMove(mockTouchEvent('touchmove', [{ identifier: 101, clientX: 503, clientY: 504 }]));
assert.strictEqual(getPlayerCurveIntent(), 0.0, 'Curve intent remains 0.0 inside central deadzone');
assert.strictEqual(touchState.throwDragActive, false, 'Throw drag not activated within slop');
assert.strictEqual(player.yaw, 0.0, 'Zero yaw rotation within slop');
assert.strictEqual(player.pitch, 0.0, 'Zero pitch rotation within slop');

// 2. Horizontal Swipe-Curve Left and Right (> 15px & |dX| > |dY| * 0.8)
console.log('2. Testing Horizontal Swipe-Curve Scaling...');
// Swipe right by 45px (horizontal dominant)
onTouchMove(mockTouchEvent('touchmove', [{ identifier: 101, clientX: 545, clientY: 502 }]));
assert.strictEqual(touchState.throwDragActive, true, 'Throw drag activated');
const expectedCurve = 45 / 75.0; // 0.60
assert(Math.abs(getPlayerCurveIntent() - expectedCurve) < 0.001, `Right swipe curves positive (${getPlayerCurveIntent()} vs ${expectedCurve})`);

// Swipe right to 75px -> exactly 1.0
onTouchMove(mockTouchEvent('touchmove', [{ identifier: 101, clientX: 575, clientY: 500 }]));
assert.strictEqual(getPlayerCurveIntent(), 1.0, '75px swipe reaches full 1.0 curve');

// Swipe right beyond 75px (100px) -> clamped at 1.0
onTouchMove(mockTouchEvent('touchmove', [{ identifier: 101, clientX: 600, clientY: 500 }]));
assert.strictEqual(getPlayerCurveIntent(), 1.0, 'Excess horizontal swipe clamps at 1.0');

// Swipe left to -60px
onTouchMove(mockTouchEvent('touchmove', [{ identifier: 101, clientX: 440, clientY: 500 }]));
const expectedLeftCurve = -60 / 75.0; // -0.80
assert(Math.abs(getPlayerCurveIntent() - expectedLeftCurve) < 0.001, `Left swipe curves negative (${getPlayerCurveIntent()} vs ${expectedLeftCurve})`);

// 3. Return to Center Deadzone Resets Curve to 0.0
console.log('3. Testing Return-to-Center Deadzone Neutralization...');
// Move back to (504, 502) -> dist < 10px from (500, 500)
onTouchMove(mockTouchEvent('touchmove', [{ identifier: 101, clientX: 504, clientY: 502 }]));
assert.strictEqual(getPlayerCurveIntent(), 0.0, 'Returning thumb to center deadzone (< 10px) resets curve to neutral');

// 4. Vertical Aim Drag Steering without Curve
console.log('4. Testing Vertical Aim Drag Steering without Curve Bias...');
const pitchBefore = player.pitch;
// Drag upward by 50px (vertical dominant: dX = 2, dY = -50)
onTouchMove(mockTouchEvent('touchmove', [{ identifier: 101, clientX: 502, clientY: 450 }]));
assert.strictEqual(getPlayerCurveIntent(), 0.0, 'Vertical aim drag does not induce curve');
assert(player.pitch !== pitchBefore, 'Vertical aim drag alters camera pitch');

// 5. Touchend & Lifecycle Reset
console.log('5. Testing Touchend & Lifecycle Reset...');
onTouchEnd(mockTouchEvent('touchend', [{ identifier: 101, clientX: 502, clientY: 450 }]));
assert.strictEqual(state.throwTouchId, null, 'Throw touch ID cleared on touchend');
assert.strictEqual(touchState.throwDragActive, false, 'Throw drag active cleared on touchend');

resetTouchInputs();
assert.strictEqual(getPlayerCurveIntent(), 0.0, 'Curve reset to 0.0 after resetTouchInputs');

console.log('\n======================================================');
console.log('ALL TOUCH CURVE GESTURE TESTS PASSED CLEANLY (100%)');
console.log('======================================================\n');
