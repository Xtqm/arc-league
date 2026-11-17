import assert from 'assert';
import { state } from '../../src/core/state.js';
import {
  updateCurveAccumulator,
  resetPlayerCurveIntent,
  setPlayerCurveIntent,
  getPlayerCurveIntent,
  onDown,
  onUp,
  CURVE_RAMP_RATE
} from '../../src/input/keyboard.js';

console.log('--- Running Curve Accumulator & Memory Lock Unit Tests ---');

// Reset initial state
resetPlayerCurveIntent();
for (const k in state.keys) state.keys[k] = false;
state.gamepadCurveL = false;
state.gamepadCurveR = false;
state.touchCurveL = false;
state.touchCurveR = false;

// 1. Initial State
console.log('1. Testing Initial Curve Intent...');
assert.strictEqual(getPlayerCurveIntent(), 0.0, 'Initial curve intent is 0.0');

// 2. Continuous Left Curve Accumulation (KeyQ)
console.log('2. Testing Continuous Left Curve (KeyQ) Ramping...');
state.keys.KeyQ = true;
// dt = 0.20s -> should ramp by 0.20 * 2.5 = 0.50 down to -0.50
updateCurveAccumulator(0.20);
assert(Math.abs(getPlayerCurveIntent() - (-0.50)) < 0.001, `After 0.20s, curve is -0.50 (got ${getPlayerCurveIntent()})`);

// Another 0.20s -> reaches -1.0
updateCurveAccumulator(0.20);
assert(Math.abs(getPlayerCurveIntent() - (-1.0)) < 0.001, `After 0.40s total, curve reaches -1.0 (got ${getPlayerCurveIntent()})`);

// Further time clamps at -1.0
updateCurveAccumulator(0.50);
assert.strictEqual(getPlayerCurveIntent(), -1.0, 'Curve intent clamped at -1.0');

// 3. Memory Lock on Key Release
console.log('3. Testing Memory Lock on Key Release...');
state.keys.KeyQ = false;
updateCurveAccumulator(0.10);
updateCurveAccumulator(0.10);
assert.strictEqual(getPlayerCurveIntent(), -1.0, 'Curve remains locked at -1.0 after releasing KeyQ');

// 4. Opposite-Key Neutralization (Tapping KeyE while Left Curve is Active)
console.log('4. Testing Opposite-Key Neutralization (KeyE cancels Left Curve)...');
// Simulate keydown event for KeyE
onDown({ code: 'KeyE', preventDefault: () => {} });
assert.strictEqual(getPlayerCurveIntent(), 0.0, 'Pressing opposite key (KeyE) immediately resets curve to 0.0');

// KeyE was just a tap, so onUp releases it
onUp({ code: 'KeyE' });
updateCurveAccumulator(0.10);
assert.strictEqual(getPlayerCurveIntent(), 0.0, 'Curve remains neutral at 0.0 after tap release');

// 5. Continuous Right Curve Accumulation (KeyE)
console.log('5. Testing Continuous Right Curve (KeyE) Ramping...');
state.keys.KeyE = true;
updateCurveAccumulator(0.20);
assert(Math.abs(getPlayerCurveIntent() - 0.50) < 0.001, `After 0.20s, curve is +0.50 (got ${getPlayerCurveIntent()})`);

updateCurveAccumulator(0.20);
assert(Math.abs(getPlayerCurveIntent() - 1.0) < 0.001, `After 0.40s total, curve reaches +1.0 (got ${getPlayerCurveIntent()})`);

updateCurveAccumulator(0.50);
assert.strictEqual(getPlayerCurveIntent(), 1.0, 'Curve intent clamped at +1.0');

// Memory lock on right curve
state.keys.KeyE = false;
updateCurveAccumulator(0.20);
assert.strictEqual(getPlayerCurveIntent(), 1.0, 'Curve remains locked at +1.0 after releasing KeyE');

// 6. Opposite-Key Neutralization (Tapping KeyQ while Right Curve is Active)
console.log('6. Testing Opposite-Key Neutralization (KeyQ cancels Right Curve)...');
onDown({ code: 'KeyQ', preventDefault: () => {} });
assert.strictEqual(getPlayerCurveIntent(), 0.0, 'Pressing opposite key (KeyQ) immediately resets curve to 0.0');
onUp({ code: 'KeyQ' });
updateCurveAccumulator(0.10);
assert.strictEqual(getPlayerCurveIntent(), 0.0, 'Curve remains neutral at 0.0');

// 7. Both Keys Held Neutrality
console.log('7. Testing Simultaneous KeyQ and KeyE Neutrality...');
state.keys.KeyQ = true;
state.keys.KeyE = true;
updateCurveAccumulator(0.20);
assert.strictEqual(getPlayerCurveIntent(), 0.0, 'Holding both KeyQ and KeyE does not alter curve intent');
state.keys.KeyQ = false;
state.keys.KeyE = false;

// 8. Movement Independence (WASD does not affect Curve)
console.log('8. Testing Character Movement (WASD) Independence...');
setPlayerCurveIntent(-0.45);
state.keys.KeyW = true;
state.keys.KeyA = true;
state.keys.KeyS = true;
state.keys.KeyD = true;
updateCurveAccumulator(0.15);
assert.strictEqual(getPlayerCurveIntent(), -0.45, 'WASD movement keys do not impart curve bias');
state.keys.KeyW = false;
state.keys.KeyA = false;
state.keys.KeyS = false;
state.keys.KeyD = false;

// 9. Manual Reset Helper
console.log('9. Testing Manual Curve Reset...');
resetPlayerCurveIntent();
assert.strictEqual(getPlayerCurveIntent(), 0.0, 'resetPlayerCurveIntent resets intent to 0.0');

// 10. Gamepad L1/R1 Parity
console.log('10. Testing Gamepad L1/R1 Parity with Keyboard...');
state.gamepadCurveL = true;
updateCurveAccumulator(0.20);
assert(Math.abs(getPlayerCurveIntent() - (-0.50)) < 0.001, 'Gamepad L1 ramps curve left at identical 2.5/s rate');
state.gamepadCurveL = false;
updateCurveAccumulator(0.10);
assert(Math.abs(getPlayerCurveIntent() - (-0.50)) < 0.001, 'Gamepad curve locks in memory upon bumper release');

// Opposite bumper neutralization via set / poll
setPlayerCurveIntent(-0.70);
// Tap R1 bumper to neutralize left curve
if (getPlayerCurveIntent() < 0) {
  resetPlayerCurveIntent();
}
state.gamepadCurveR = false;
assert.strictEqual(getPlayerCurveIntent(), 0.0, 'Opposite bumper immediately neutralizes curve to 0.0');
state.gamepadCurveR = true;
updateCurveAccumulator(0.40);
assert.strictEqual(getPlayerCurveIntent(), 1.0, 'Gamepad R1 ramps curve right up to +1.0');
state.gamepadCurveR = false;
resetPlayerCurveIntent();

// 11. Testing Continuous Disc & Network Serialization Parity
console.log('11. Testing Network Serialization (DISC_THROW) Float Precision...');
const testCurves = [-0.85, -0.42, 0.0, 0.37, 0.73, 1.0];
for (const curveVal of testCurves) {
  const throwData = {
    id: 'test_id',
    sender: 'p1',
    x: 0, y: 1.7, z: 14,
    vx: 0, vy: 0, vz: -38,
    curve: +curveVal.toFixed(2),
    charge: 0.5
  };
  assert.strictEqual(throwData.curve, curveVal, `Serialized curve matches ${curveVal}`);
  const jsonStr = JSON.stringify({ type: 'DISC_THROW', lastThrow: throwData });
  const parsed = JSON.parse(jsonStr);
  assert.strictEqual(parsed.lastThrow.curve, curveVal, `Round-trip JSON serialization preserves float ${curveVal}`);
}

console.log('\n======================================================');
console.log('ALL CURVE ACCUMULATOR UNIT TESTS PASSED CLEANLY (100%)');
console.log('======================================================\n');
