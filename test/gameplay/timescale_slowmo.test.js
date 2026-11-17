import assert from 'assert';
import { state } from '../../src/core/state.js';
import { onDown, EAT } from '../../src/input/keyboard.js';

console.log('--- Running Cinematic Slow-Motion Debug Key Unit Tests ---');

// Setup mock window and message hook
let lastMessage = null;
globalThis.window = {
  __arcMessage: (msg) => { lastMessage = msg; }
};

// 1. Initial defaults
assert.strictEqual(state.timeScale, 1.0, 'Default timeScale is 1.0 (normal speed)');
assert.strictEqual(state.slowMoActive, false, 'Default slowMoActive is false');
assert.strictEqual(EAT.includes('KeyT'), true, 'KeyT is in EAT array to prevent default browser behavior');
console.log('✓ Default timescale and slow-mo states verified');

// 2. Press 'KeyT' to toggle slow-motion ON
let prevented = false;
const mockEvent1 = {
  code: 'KeyT',
  preventDefault: () => { prevented = true; }
};
onDown(mockEvent1);

assert.strictEqual(prevented, true, 'KeyT default is prevented');
assert.strictEqual(state.slowMoActive, true, 'slowMoActive is true after first KeyT press');
assert.strictEqual(state.timeScale, 0.2, 'timeScale is 0.2 (20% speed) during slow-motion');
assert.strictEqual(lastMessage, 'CINEMATIC SLOW-MO: 0.2x', 'HUD announcement was dispatched for slow-mo ON');
console.log('✓ T key toggles cinematic slow-mo ON (0.2x speed) and displays HUD announcement');

// 3. Press 'KeyT' again to toggle slow-motion OFF
let prevented2 = false;
const mockEvent2 = {
  code: 'KeyT',
  preventDefault: () => { prevented2 = true; }
};
onDown(mockEvent2);

assert.strictEqual(prevented2, true, 'KeyT default is prevented on second press');
assert.strictEqual(state.slowMoActive, false, 'slowMoActive is false after second KeyT press');
assert.strictEqual(state.timeScale, 1.0, 'timeScale returns to 1.0 (normal speed)');
assert.strictEqual(lastMessage, 'NORMAL SPEED: 1.0x', 'HUD announcement was dispatched for normal speed');
console.log('✓ T key toggles back to normal speed (1.0x) smoothly');

console.log('--- Cinematic Slow-Motion Debug Key Unit Tests PASSED ---');
