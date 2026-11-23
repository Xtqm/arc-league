import assert from 'assert';
import { DirectivesModal } from '../../src/ui/modals/DirectivesModal.js';
import { state } from '../../src/core/state.js';

console.log('--- Running Directives & Controls Modal Unit Test Suite ---');

// Mock DOM if running in headless node environment without JSDOM
class MockElement {
  constructor(tag, id = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.className = '';
    this.style = { display: 'none' };
    this.children = [];
    this._innerHTML = '';
    this.classList = {
      _classes: new Set(),
      add: (...cls) => cls.forEach(c => this.classList._classes.add(c)),
      remove: (...cls) => cls.forEach(c => this.classList._classes.delete(c)),
      contains: (c) => this.classList._classes.has(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this.classList.contains(c)) this.classList.remove(c);
          else this.classList.add(c);
        } else if (force) {
          this.classList.add(c);
        } else {
          this.classList.remove(c);
        }
      }
    };
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(val) {
    this._innerHTML = val;
    this.children = [];
    // Basic mock parser to locate ids in innerHTML for querySelector
    const idMatches = val.matchAll(/id=["']([^"']+)["']/g);
    for (const match of idMatches) {
      const child = new MockElement('div', match[1]);
      this.children.push(child);
    }
  }

  querySelector(selector) {
    if (selector.startsWith('#')) {
      const targetId = selector.slice(1);
      const findChild = (el) => {
        if (el.id === targetId) return el;
        for (const c of el.children) {
          const res = findChild(c);
          if (res) return res;
        }
        return null;
      };
      return findChild(this);
    }
    return new MockElement('div');
  }

  focus() {
    this._focused = true;
  }
}

const mockElements = new Map();
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: (tag) => new MockElement(tag),
    getElementById: (id) => mockElements.get(id) || null,
    body: {
      style: {},
      appendChild: (el) => {
        if (el && el.id) mockElements.set(el.id, el);
      }
    }
  };
}

const modal = new DirectivesModal();

// Test 1: Instantiation and lazy container setup
console.log('\n[Test 1] Testing container lazy initialization...');
const container = modal.container;
assert.ok(container, 'Container must be created');
assert.strictEqual(container.id, 'directivesModal', 'Container id must be directivesModal');
assert.strictEqual(modal.isOpen(), false, 'Modal must initially be closed');
console.log('✓ Container lazily created with id #directivesModal');

// Test 2: Show desktop controls
console.log('\n[Test 2] Testing show() with desktop directives...');
modal.show('desktop');
assert.strictEqual(modal.isOpen(), true, 'Modal must be open after show()');
assert.ok(container.innerHTML.includes('W A S D'), 'Desktop directives must include WASD');
assert.ok(container.innerHTML.includes('MOUSE'), 'Desktop directives must include MOUSE');
assert.ok(container.innerHTML.includes('LEFT CLICK'), 'Desktop directives must include LEFT CLICK');
assert.ok(container.innerHTML.includes('RIGHT CLICK'), 'Desktop directives must include RIGHT CLICK');
assert.ok(container.innerHTML.includes('SPACE'), 'Desktop directives must include SPACE');
assert.ok(container.innerHTML.includes('tabDesktopDirectives'), 'Must have desktop tab button');
console.log('✓ Desktop directives render movement, mouse, disc throw, shield, and jump');

// Test 3: Tab switching to mobile touch diagrams
console.log('\n[Test 3] Testing tab switching to mobile touch diagrams...');
const tabMobile = container.querySelector('#tabMobileDirectives');
assert.ok(tabMobile, 'Mobile tab switcher must exist');
tabMobile.onclick();
assert.ok(container.innerHTML.includes('VIRTUAL JOYSTICK') || container.innerHTML.includes('Virtual Joystick'), 'Must display mobile joystick instructions');
assert.ok(container.innerHTML.includes('TOUCH LOOK') || container.innerHTML.includes('Touch Look'), 'Must display touch look instructions');
assert.ok(container.innerHTML.includes('SHIELD') || container.innerHTML.includes('Shield'), 'Must display shield touch button instructions');
console.log('✓ Tab switching displays mobile touch controls cleanly');

// Test 4: Dismissal via close button
console.log('\n[Test 4] Testing close button dismissal...');
let closedCalled = false;
modal.setOnClose(() => { closedCalled = true; });
const closeBtn = container.querySelector('#closeDirectivesBtn');
assert.ok(closeBtn, 'Close button #closeDirectivesBtn must exist');
closeBtn.onclick();
assert.strictEqual(modal.isOpen(), false, 'Modal must be hidden after clicking close button');
assert.strictEqual(closedCalled, true, 'onClose callback must be called');
console.log('✓ Close button dismisses modal cleanly');

// Test 5: Dismissal via click-outside
console.log('\n[Test 5] Testing click-outside overlay dismissal...');
modal.show();
assert.strictEqual(modal.isOpen(), true, 'Modal must be open');
container.onclick({ target: container });
assert.strictEqual(modal.isOpen(), false, 'Clicking overlay outside card must dismiss modal');
console.log('✓ Click-outside dismisses modal');

// Test 6: Global hooks and toggle
console.log('\n[Test 6] Testing global window hooks and toggle...');
assert.strictEqual(typeof window.__tronOpenDirectives, 'function', 'Must export __tronOpenDirectives');
assert.strictEqual(typeof window.__tronCloseDirectives, 'function', 'Must export __tronCloseDirectives');
assert.strictEqual(typeof window.__tronToggleDirectives, 'function', 'Must export __tronToggleDirectives');
window.__tronToggleDirectives();
assert.strictEqual(modal.isOpen(), true, 'Toggle must open modal when closed');
window.__tronToggleDirectives();
assert.strictEqual(modal.isOpen(), false, 'Toggle must close modal when open');
console.log('✓ Global window hooks toggle and close directivesModal cleanly');

console.log('\n======================================================');
console.log('ALL DIRECTIVES MODAL TESTS PASSED (100%)');
console.log('======================================================\n');
