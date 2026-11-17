import assert from 'assert';
import { state } from '../../src/core/state.js';
import { onDown, EAT } from '../../src/input/keyboard.js';
import { settingsManager } from '../../src/core/settings.js';
import { SettingsModal } from '../../src/ui/modals/SettingsModal.js';

console.log('--- Running Cinematic Slow-Motion Circuit, Survival & Settings Test Suite ---');

// Setup mock window and message hook
let lastMessage = null;
globalThis.window = {
  __arcMessage: (msg) => { lastMessage = msg; }
};

// Helper to simulate KeyT press
function pressKeyT() {
  let prevented = false;
  onDown({
    code: 'KeyT',
    preventDefault: () => { prevented = true; }
  });
  return prevented;
}

// 1. Initial defaults: available to all players
settingsManager.load();
assert.strictEqual(state.timeScale, 1.0, 'Default timeScale is 1.0 (normal speed)');
assert.strictEqual(state.slowMoActive, false, 'Default slowMoActive is false');
assert.strictEqual(state.slowMoEnabled, true, 'Slow-mo is enabled by default for all players');
assert.strictEqual(settingsManager.get('slowMoEnabled'), true, 'settingsManager default is true');
assert.strictEqual(EAT.includes('KeyT'), true, 'KeyT is in EAT array');
console.log('✓ Group 1: Default slow-mo availability for all players verified');

// 2. Blocked when not running (e.g. in main menu)
state.running = false;
state.gameMode = 'swarm';
pressKeyT();
assert.strictEqual(state.slowMoActive, false, 'Slow-mo cannot be triggered when state.running is false');
assert.strictEqual(state.timeScale, 1.0, 'timeScale remains 1.0');
console.log('✓ Group 2: KeyT safely ignored when match is not running');

// 3. Allowed in Survival Mode ('swarm')
state.running = true;
state.gameMode = 'swarm';
lastMessage = null;

pressKeyT();
assert.strictEqual(state.slowMoActive, true, 'KeyT activated slow-mo in Survival (swarm) mode');
assert.strictEqual(state.timeScale, 0.2, 'timeScale is 0.2 (20% speed) in Survival mode');
assert.strictEqual(lastMessage, 'CINEMATIC SLOW-MO: 0.2x', 'HUD announcement was dispatched');

pressKeyT();
assert.strictEqual(state.slowMoActive, false, 'KeyT toggled slow-mo OFF in Survival mode');
assert.strictEqual(state.timeScale, 1.0, 'timeScale is back to 1.0');
assert.strictEqual(lastMessage, 'NORMAL SPEED: 1.0x', 'HUD announcement was dispatched for normal speed');
console.log('✓ Group 3: KeyT functions perfectly in Survival mode');

// 4. Allowed in League Circuit Mode ('campaign')
state.running = true;
state.gameMode = 'campaign';
lastMessage = null;

pressKeyT();
assert.strictEqual(state.slowMoActive, true, 'KeyT activated slow-mo in League Circuit (campaign) mode');
assert.strictEqual(state.timeScale, 0.2, 'timeScale is 0.2 in League Circuit');
assert.strictEqual(lastMessage, 'CINEMATIC SLOW-MO: 0.2x', 'HUD announcement for circuit slow-mo');

pressKeyT();
assert.strictEqual(state.slowMoActive, false, 'KeyT toggled slow-mo OFF in League Circuit');
assert.strictEqual(state.timeScale, 1.0, 'timeScale returned to 1.0');
console.log('✓ Group 4: KeyT functions perfectly in League Circuit mode');

// 5. Blocked in Online Multiplayer & Other Modes
const restrictedModes = ['duel_multi', 'duos_multi', 'duel_ai'];
for (const mode of restrictedModes) {
  state.running = true;
  state.gameMode = mode;
  state.slowMoActive = false;
  state.timeScale = 1.0;
  lastMessage = null;

  pressKeyT();
  assert.strictEqual(state.slowMoActive, false, `Slow-mo is strictly blocked in mode "${mode}"`);
  assert.strictEqual(state.timeScale, 1.0, `timeScale remains 1.0 in mode "${mode}"`);
  assert.strictEqual(lastMessage, 'SLOW-MO UNAVAILABLE IN THIS MODE', `HUD warning displayed for mode "${mode}"`);
}
console.log('✓ Group 5: Slow-mo strictly restricted from online multiplayer and non-circuit/survival modes');

// 6. Settings Toggle Behavior
state.running = true;
state.gameMode = 'swarm';

// Toggle off in settings
settingsManager.set('slowMoEnabled', false);
assert.strictEqual(state.slowMoEnabled, false, 'state.slowMoEnabled synchronized from settingsManager');

lastMessage = null;
pressKeyT();
assert.strictEqual(state.slowMoActive, false, 'KeyT is blocked when slowMoEnabled is false in settings');
assert.strictEqual(state.timeScale, 1.0, 'timeScale remains 1.0 when disabled in settings');
assert.strictEqual(lastMessage, 'SLOW-MO DISABLED IN SETTINGS', 'HUD informs player slow-mo is disabled in settings');

// Re-enable in settings while in circuit mode
state.gameMode = 'campaign';
settingsManager.set('slowMoEnabled', true);
assert.strictEqual(state.slowMoEnabled, true, 'state.slowMoEnabled re-enabled');

pressKeyT();
assert.strictEqual(state.slowMoActive, true, 'KeyT works after re-enabling in settings');
assert.strictEqual(state.timeScale, 0.2);

// If toggled OFF in settings while slow-mo is active, immediately restore 1.0 timescale
settingsManager.set('slowMoEnabled', false);
assert.strictEqual(state.slowMoActive, false, 'slowMoActive immediately resets to false when disabled in settings');
assert.strictEqual(state.timeScale, 1.0, 'timeScale immediately normalizes to 1.0 when disabled in settings');
console.log('✓ Group 6: SettingsManager toggle on/off persistence and live state normalization verified');

// 7. SettingsModal UI Toggle Interaction
settingsManager.set('slowMoEnabled', true);

if (typeof document === 'undefined') {
  global.document = {
    createElement: () => ({ style: {}, classList: new Set(), appendChild() {} }),
    getElementById: () => null,
    body: { appendChild() {} }
  };
}

// Create mock DOM container for SettingsModal
let buttonCallback = null;
const mockContainer = {
  style: {},
  innerHTML: '',
  querySelector(sel) {
    if (sel === '#toggleSlowMoBtn') {
      return {
        textContent: settingsManager.get('slowMoEnabled', true) ? 'ENABLED' : 'DISABLED',
        set onclick(fn) { buttonCallback = fn; },
        get onclick() { return buttonCallback; }
      };
    }
    return null;
  },
  querySelectorAll() { return []; }
};

const modal = new SettingsModal({ settings: settingsManager });
modal._customContainer = mockContainer;
modal.render();

assert.ok(mockContainer.innerHTML.includes('CINEMATIC SLOW-MO (T KEY)'), 'SettingsModal contains Cinematic Slow-Mo header');
assert.ok(mockContainer.innerHTML.includes('CIRCUIT &amp; SURVIVAL'), 'SettingsModal specifies allowed modes');
assert.ok(buttonCallback !== null, 'SettingsModal bound click listener to #toggleSlowMoBtn');

// Simulate user clicking toggle button in Settings UI
buttonCallback();
assert.strictEqual(settingsManager.get('slowMoEnabled'), false, 'Clicking button toggled slowMoEnabled to false in settings');

buttonCallback();
assert.strictEqual(settingsManager.get('slowMoEnabled'), true, 'Clicking button again toggled slowMoEnabled back to true');
console.log('✓ Group 7: SettingsModal UI control renders and toggles slowMoEnabled cleanly');

console.log('--- Cinematic Slow-Motion Circuit, Survival & Settings Test Suite PASSED ---');
