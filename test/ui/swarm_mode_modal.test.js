import assert from 'assert';
import { SwarmModeModal } from '../../src/ui/modals/SwarmModeModal.js';

console.log('--- Running SwarmModeModal Unit Test Suite ---');

class MockElement {
  constructor(tag, id = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.className = '';
    this.style = { display: 'none' };
    this.children = [];
    this._innerHTML = '';
    this._focused = false;
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(val) {
    this._innerHTML = val;
    this.children = [];
    const idMatches = val.matchAll(/id=["']([^"']+)["']/g);
    for (const match of idMatches) {
      this.children.push(new MockElement('div', match[1]));
    }
  }

  querySelector(selector) {
    if (selector.startsWith('#')) {
      const targetId = selector.slice(1);
      return this.children.find((c) => c.id === targetId) || null;
    }
    return null;
  }

  focus() {
    this._focused = true;
  }
}

const mockElements = new Map();
const docListeners = new Map();

if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: (tag) => new MockElement(tag),
    getElementById: (id) => mockElements.get(id) || null,
    addEventListener: (evt, fn) => {
      if (!docListeners.has(evt)) docListeners.set(evt, new Set());
      docListeners.get(evt).add(fn);
    },
    removeEventListener: (evt, fn) => {
      if (docListeners.has(evt)) docListeners.get(evt).delete(fn);
    },
    body: {
      style: {},
      appendChild: (el) => {
        if (el && el.id) mockElements.set(el.id, el);
      }
    }
  };
}

let mockWave = 4;
const mockStorage = {
  get: (key, fallback) => (key === 'stats.swarmHighestWave' ? mockWave : fallback)
};

let launchedWith = null;
const modal = new SwarmModeModal({
  storage: mockStorage,
  onLaunch: (opts) => { launchedWith = opts; }
});

// Test 1: Locked state when stats.swarmHighestWave < 10
console.log('\n[Test 1] Testing modal open & Hardcore lock gating (< Wave 10)...');
modal.show();
assert.strictEqual(modal.isOpen(), true, 'SwarmModeModal must be open after show()');
const container = modal.container;
assert.ok(container.innerHTML.includes('STANDARD'), 'Modal must display STANDARD option');
assert.ok(container.innerHTML.includes('ARC CREDITS + XP'), 'STANDARD must display Arc Credits + XP');
assert.ok(container.innerHTML.includes('HARDCORE'), 'Modal must display HARDCORE option');
assert.ok(container.innerHTML.includes('SPARKS + XP'), 'HARDCORE must display Sparks + XP');
assert.ok(container.innerHTML.includes('LOCKED'), 'HARDCORE must show locked state when wave < 10');

const hardcoreBtnLocked = container.querySelector('#btnLaunchSwarmHardcore');
assert.ok(hardcoreBtnLocked, 'Hardcore launch button must exist');
hardcoreBtnLocked.onclick({ stopPropagation: () => {} });
assert.strictEqual(launchedWith, null, 'Clicking locked Hardcore button must not launch');
assert.strictEqual(modal.isOpen(), true, 'Modal must remain open when clicking locked Hardcore');
console.log('✓ Hardcore lock gating verified for wave < 10');

// Test 2: Standard launch
console.log('\n[Test 2] Testing Standard mode launch...');
const standardBtn = container.querySelector('#btnLaunchSwarmStandard');
assert.ok(standardBtn, 'Standard launch button must exist');
standardBtn.onclick({ stopPropagation: () => {} });
assert.deepStrictEqual(launchedWith, { hardcore: false }, 'Standard button must launch with { hardcore: false }');
assert.strictEqual(modal.isOpen(), false, 'Modal must close on launch');
console.log('✓ Standard mode launch verified');

// Test 3: Unlocked Hardcore launch when stats.swarmHighestWave >= 10
console.log('\n[Test 3] Testing Hardcore unlocked (>= Wave 10) & launch...');
mockWave = 10;
launchedWith = null;
modal.show();
assert.ok(container.innerHTML.includes('DEPLOY HARDCORE'), 'HARDCORE must show unlocked deploy button at wave >= 10');
const hardcoreBtnUnlocked = container.querySelector('#btnLaunchSwarmHardcore');
hardcoreBtnUnlocked.onclick({ stopPropagation: () => {} });
assert.deepStrictEqual(launchedWith, { hardcore: true }, 'Unlocked Hardcore button must launch with { hardcore: true }');
assert.strictEqual(modal.isOpen(), false, 'Modal must close on Hardcore launch');
console.log('✓ Hardcore unlock & launch verified');

// Test 4: Escape & backdrop dismissal
console.log('\n[Test 4] Testing Escape and backdrop dismissal...');
modal.show();
assert.strictEqual(modal.isOpen(), true);
for (const fn of docListeners.get('keydown') || []) {
  fn({ key: 'Escape', preventDefault: () => {}, stopPropagation: () => {} });
}
assert.strictEqual(modal.isOpen(), false, 'Escape key must dismiss SwarmModeModal');

modal.show();
assert.strictEqual(modal.isOpen(), true);
container.onclick({ target: container });
assert.strictEqual(modal.isOpen(), false, 'Backdrop click must dismiss SwarmModeModal');
console.log('✓ Escape and backdrop dismissal verified');

console.log('\n======================================================');
console.log('ALL SWARM MODE MODAL TESTS PASSED (100%)');
console.log('======================================================\n');
