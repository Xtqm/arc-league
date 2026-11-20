import assert from 'assert';
import { storageManager } from '../../src/core/storage/StorageManager.js';
import { initBootTerminal } from '../../src/core/main.js';
import { state } from '../../src/core/state.js';

console.log('--- Running Boot Terminal Lifecycle & Suppression Test Suite ---');

// Mock DOM environment for Node
class MockElement {
  constructor(id) {
    this.id = id;
    this.style = { display: '' };
    this.listeners = {};
    this.classList = {
      add: () => {},
      remove: () => {},
      contains: () => false
    };
  }
  querySelector() {
    return new MockElement('mock_child');
  }
  querySelectorAll() {
    return [];
  }
  addEventListener(event, handler) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(handler);
  }
  dispatch(event) {
    if (this.listeners[event]) {
      for (const fn of this.listeners[event]) {
        fn({ preventDefault: () => {} });
      }
    }
  }
}

const elements = {
  bootTerminal: new MockElement('bootTerminal'),
  overlay: new MockElement('overlay')
};

globalThis.document = {
  getElementById: (id) => elements[id] || null
};

globalThis.window = globalThis.window || {};
globalThis.window.__tronEnforceBootTerminal = true; // Prevents headless auto-skip
globalThis.window.__tronSkipBootTerminal = false;
globalThis.window.__TRON_HEADLESS__ = false;

storageManager.load();

// Test 1: Fresh uncalibrated player encounters boot terminal
console.log('\n[Test 1] Testing uncalibrated, unbypassed initial launch...');
storageManager.set('calibration_completed', false, { immediate: true });
storageManager.set('calibration_bypassed', false, { immediate: true });
elements.bootTerminal.style.display = '';

initBootTerminal();
assert.strictEqual(elements.bootTerminal.style.display, 'flex', 'Boot terminal must display flex for fresh player');
console.log('✓ Fresh uncalibrated player receives boot terminal');

// Test 2: Interrupted uncompleted attempt without explicit bypass still re-encounters boot terminal
console.log('\n[Test 2] Testing interrupted launch without bypass...');
// Simulate player closing/refreshing during calibration without bypass
elements.bootTerminal.style.display = '';
initBootTerminal();
assert.strictEqual(elements.bootTerminal.style.display, 'flex', 'Interrupted attempt must re-encounter boot terminal');
console.log('✓ Interrupted uncompleted launch re-encounters boot terminal');

// Test 3: Calibration bypassed suppresses boot terminal
console.log('\n[Test 3] Testing suppression when calibration_bypassed is true...');
storageManager.set('calibration_bypassed', true, { immediate: true });
storageManager.set('calibration_completed', false, { immediate: true });
elements.bootTerminal.style.display = '';

initBootTerminal();
assert.strictEqual(elements.bootTerminal.style.display, 'none', 'Boot terminal must be hidden when calibration_bypassed is true');
console.log('✓ Boot terminal suppressed when calibration_bypassed is true');

// Test 4: Calibration completed suppresses boot terminal
console.log('\n[Test 4] Testing suppression when calibration_completed is true...');
storageManager.set('calibration_bypassed', false, { immediate: true });
storageManager.set('calibration_completed', true, { immediate: true });
elements.bootTerminal.style.display = '';

initBootTerminal();
assert.strictEqual(elements.bootTerminal.style.display, 'none', 'Boot terminal must be hidden when calibration_completed is true');
console.log('✓ Boot terminal suppressed when calibration_completed is true');

// Test 5: Interaction with boot terminal launches calibration
console.log('\n[Test 5] Testing boot terminal interaction launches calibration...');
storageManager.set('calibration_completed', false, { immediate: true });
storageManager.set('calibration_bypassed', false, { immediate: true });
let calibrationStarted = false;
globalThis.window.__tronStartCalibration = () => { calibrationStarted = true; };

elements.bootTerminal.style.display = '';
initBootTerminal();
assert.strictEqual(elements.bootTerminal.style.display, 'flex');

elements.bootTerminal.dispatch('click');
assert.strictEqual(calibrationStarted, true, 'Clicking boot terminal must invoke startCalibration');
assert.strictEqual(elements.bootTerminal.style.display, 'none', 'Boot terminal must be hidden after click');
console.log('✓ Boot terminal click launches calibration and hides terminal');

// Test 6: Desktop asynchronous profile hydration sequencing
console.log('\n[Test 6] Testing asynchronous desktop profile hydration sequencing...');
// Reset storage to unhydrated state
storageManager.set('calibration_bypassed', false, { immediate: true });
storageManager.set('calibration_completed', false, { immediate: true });
elements.bootTerminal.style.display = '';

// Simulate async hydration promise
const fakeAuthReady = new Promise((resolve) => {
  setTimeout(() => {
    // Desktop profile hydrates from disk
    storageManager.set('calibration_bypassed', true, { immediate: true });
    resolve();
  }, 10);
});

// Sequenced evaluation
await fakeAuthReady.then(() => {
  initBootTerminal();
});

assert.strictEqual(elements.bootTerminal.style.display, 'none', 'Boot terminal must be suppressed after hydration resolves');
console.log('✓ Boot terminal cleanly suppressed after asynchronous hydration settling');

console.log('\n======================================================');
console.log('ALL BOOT TERMINAL LIFECYCLE TESTS PASSED (100% SUCCESS)');
console.log('======================================================');
