import assert from 'assert';
import fs from 'fs';
import { getMainMenuHtml, bindMainMenuEvents, armoryModal, achievementsModal, settingsModal, directivesModal } from '../../src/ui/menus.js';

console.log('--- Running Tactical Rail Menu Interface Test Suite ---');

// Mock DOM
class MockElement {
  constructor(tag, id = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.className = '';
    this.style = { display: 'none' };
    this.children = [];
    this._innerHTML = '';
    this.listeners = new Map();
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

  addEventListener(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(fn);
  }

  click() {
    if (typeof this.onclick === 'function') this.onclick({ stopPropagation: () => {}, preventDefault: () => {} });
    const handlers = this.listeners.get('click') || [];
    for (const h of handlers) h({ stopPropagation: () => {}, preventDefault: () => {} });
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

  querySelectorAll() {
    return [];
  }
}

const elementsMap = new Map();
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: (tag) => new MockElement(tag),
    getElementById: (id) => elementsMap.get(id) || null,
    body: {
      style: {},
      appendChild: (el) => { if (el && el.id) elementsMap.set(el.id, el); }
    }
  };
}

// Test 1: getMainMenuHtml Structure and Element IDs
console.log('\n[Test 1] Testing getMainMenuHtml Tactical Rail markup & button IDs...');
const html = getMainMenuHtml();
assert.ok(html.includes('id="mainMenu"'), 'Must contain #mainMenu');
assert.ok(html.includes('tactical-rail'), 'Must contain .tactical-rail class');
assert.ok(html.includes('assets/branding/arc_league_title_logo.png'), 'Must contain canonical title logo');
assert.ok(html.includes('id="identityHeader"'), 'Must contain #identityHeader');
assert.ok(html.includes('id="campaignBtn"'), 'Must contain #campaignBtn');
assert.ok(html.includes('id="swarmBtn"'), 'Must contain #swarmBtn');
assert.ok(html.includes('id="practiceBtn"'), 'Must contain #practiceBtn');
assert.ok(html.includes('id="quickMatchBtn"'), 'Must contain #quickMatchBtn');
assert.ok(html.includes('id="hostMatchBtn"'), 'Must contain #hostMatchBtn');
assert.ok(html.includes('id="joinOnlineBtn"'), 'Must contain #joinOnlineBtn');
assert.ok(html.includes('id="utilityDock"'), 'Must contain #utilityDock');
assert.ok(html.includes('id="armoryBtn"'), 'Must contain #armoryBtn in utility dock');
assert.ok(html.includes('id="achievementsBtn"'), 'Must contain #achievementsBtn in utility dock');
assert.ok(html.includes('id="directivesBtn"'), 'Must contain #directivesBtn in utility dock');
assert.ok(html.includes('id="settingsBtn"'), 'Must contain #settingsBtn in utility dock');
console.log('✓ getMainMenuHtml renders all canonical IDs, logo, and utility dock');

// Test 2: Index.html CSS rules
console.log('\n[Test 2] Testing index.html CSS styles and responsive rules...');
const indexHtml = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
assert.ok(indexHtml.includes('#mainMenu.tactical-rail'), 'index.html must style #mainMenu.tactical-rail');
assert.ok(indexHtml.includes('.rail-header'), 'index.html must style .rail-header');
assert.ok(indexHtml.includes('.mode-directives'), 'index.html must style .mode-directives');
assert.ok(indexHtml.includes('.utility-dock'), 'index.html must style .utility-dock');
assert.ok(indexHtml.includes('@media (max-width: 768px)'), 'index.html must have responsive mobile media query');

// Verify chamfered geometry, neon sheen keyframes, and identity-header static positioning
assert.ok(indexHtml.includes('clip-path: polygon('), 'index.html must define chamfered polygon geometry');
assert.ok(indexHtml.includes('tacticalSheen'), 'index.html must define tacticalSheen hover keyframes');
assert.ok(indexHtml.includes('.tactical-rail .identity-header') || indexHtml.includes('.rail-identity'), 'index.html must fix identity-header inside rail');
assert.ok(indexHtml.includes('.survival-variant-toggle'), 'index.html must style survival-variant-toggle tab strip');
console.log('✓ index.html defines tactical-rail, mode-directives, utility-dock, and responsive breakpoints');

// Test 3: Utility dock click bindings open respective modals
console.log('\n[Test 3] Testing utility dock click interactions...');
const overlay = new MockElement('div', 'overlay');
elementsMap.set('overlay', overlay);
const armoryBtn = new MockElement('button', 'armoryBtn');
elementsMap.set('armoryBtn', armoryBtn);
const achievementsBtn = new MockElement('button', 'achievementsBtn');
elementsMap.set('achievementsBtn', achievementsBtn);
const directivesBtn = new MockElement('button', 'directivesBtn');
elementsMap.set('directivesBtn', directivesBtn);
const settingsBtn = new MockElement('button', 'settingsBtn');
elementsMap.set('settingsBtn', settingsBtn);

let armoryOpened = false;
let achievementsOpened = false;
let directivesOpened = false;
let settingsOpened = false;

armoryModal.show = () => { armoryOpened = true; };
achievementsModal.show = () => { achievementsOpened = true; };
directivesModal.show = () => { directivesOpened = true; };
settingsModal.show = () => { settingsOpened = true; };

bindMainMenuEvents();

armoryBtn.click();
assert.strictEqual(armoryOpened, true, 'Clicking #armoryBtn must open armoryModal');

achievementsBtn.click();
assert.strictEqual(achievementsOpened, true, 'Clicking #achievementsBtn must open achievementsModal');

directivesBtn.click();
assert.strictEqual(directivesOpened, true, 'Clicking #directivesBtn must open directivesModal');

settingsBtn.click();
assert.strictEqual(settingsOpened, true, 'Clicking #settingsBtn must open settingsModal');

console.log('✓ Clicking utility dock buttons opens armoryModal, achievementsModal, directivesModal, and settingsModal');

// Test 4: Tactical rail button interaction & audio hook listeners
console.log('\n[Test 4] Testing tactical rail button audio hook bindings...');
assert.ok(armoryBtn.listeners.has('mouseenter'), '#armoryBtn must have mouseenter listener for audio feedback');
assert.ok(armoryBtn.listeners.has('click'), '#armoryBtn must have click listener for audio feedback');
const mouseenterHandlers = armoryBtn.listeners.get('mouseenter');
assert.ok(mouseenterHandlers.length > 0, 'mouseenter listener must be registered');
mouseenterHandlers[0]();
console.log('✓ Tactical rail buttons have mouseenter and click audio hook listeners attached');

console.log('\n======================================================');
console.log('ALL TACTICAL RAIL MENU TESTS PASSED (100%)');
console.log('======================================================\n');
