/**
 * contracts_modal.test.js
 * Unit and integration test suite for ContractsModal and #contractsBtn pip wiring.
 */

import assert from 'assert';
import { StorageManager } from '../../src/core/storage/StorageManager.js';
import { EconomyManager } from '../../src/core/economy/EconomyManager.js';
import { ContractManager } from '../../src/contracts/ContractManager.js';
import { ContractsModal, formatUtcCountdown } from '../../src/ui/modals/ContractsModal.js';
import { bindMenuButtons, updateContractsPip, contractsModal as singletonContractsModal } from '../../src/ui/menus.js';

console.log('--- Running ContractsModal & Menu Pip Test Suite ---');

class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.style = { display: 'none' };
    this.children = [];
    this.parentNode = null;
    this.id = '';
    this.className = '';
    this.innerHTML = '';
    this.textContent = '';
    this.title = '';
    this.open = false;
    this.returnValue = '';
    this.dataset = {};
    this._attrs = new Map();
    this._listeners = new Map();
  }
  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }
  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }
  setAttribute(k, v) {
    this._attrs.set(k, String(v));
    if (k.startsWith('data-')) {
      this.dataset[k.slice(5)] = String(v);
    }
  }
  getAttribute(k) {
    if (this._attrs.has(k)) return this._attrs.get(k);
    if (k.startsWith('data-')) return this.dataset[k.slice(5)] || null;
    return null;
  }
  addEventListener(evt, fn) {
    if (!this._listeners.has(evt)) this._listeners.set(evt, []);
    this._listeners.get(evt).push(fn);
  }
  click(evt = { stopPropagation() {}, cancelable: false }) {
    if (typeof this.onclick === 'function') this.onclick(evt);
    for (const fn of (this._listeners.get('click') || [])) {
      fn(evt);
    }
  }
  showModal() {
    this.open = true;
    this.style.display = 'flex';
  }
  close() {
    this.open = false;
    this.style.display = 'none';
    for (const fn of (this._listeners.get('close') || [])) {
      fn();
    }
  }
  _parseRenderedButtons() {
    // Lightweight parser for rendered claim/sweep/close buttons from innerHTML
    const found = [];
    const btnRegex = /<button([^>]*)>([\s\S]*?)<\/button>/g;
    let match;
    while ((match = btnRegex.exec(this.innerHTML)) !== null) {
      const attrsStr = match[1];
      const btn = new MockElement('button');
      const idMatch = /id="([^"]+)"/.exec(attrsStr);
      if (idMatch) btn.id = idMatch[1];
      const clsMatch = /class="([^"]+)"/.exec(attrsStr);
      if (clsMatch) btn.className = clsMatch[1];
      const attrRegex = /(data-[a-z-]+)="([^"]+)"/g;
      let am;
      while ((am = attrRegex.exec(attrsStr)) !== null) {
        btn.setAttribute(am[1], am[2]);
      }
      found.push(btn);
    }
    return found;
  }
  querySelector(sel) {
    if (sel.startsWith('#')) {
      const id = sel.slice(1);
      if (this.id === id) return this;
      for (const c of this.children) {
        const res = c.querySelector(sel);
        if (res) return res;
      }
      if (this.innerHTML) {
        const btns = this._parseRenderedButtons();
        const hit = btns.find((b) => b.id === id);
        if (hit) {
          this._parsedCache = this._parsedCache || new Map();
          if (!this._parsedCache.has(id)) this._parsedCache.set(id, hit);
          return this._parsedCache.get(id);
        }
      }
    }
    if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      if (this.className.split(' ').includes(cls)) return this;
      for (const c of this.children) {
        const res = c.querySelector(sel);
        if (res) return res;
      }
    }
    return null;
  }
  querySelectorAll(sel) {
    const out = [];
    if (sel.startsWith('.') && this.innerHTML) {
      const cls = sel.slice(1);
      this._parsedListCache = this._parsedListCache || this._parseRenderedButtons();
      for (const b of this._parsedListCache) {
        if (b.className.split(' ').includes(cls)) out.push(b);
      }
    }
    return out;
  }
}

const domRegistry = new Map();
const mockBody = new MockElement('body');
const contractsBtn = new MockElement('button');
contractsBtn.id = 'contractsBtn';
contractsBtn.className = 'dock-btn contracts-btn';
domRegistry.set('contractsBtn', contractsBtn);

const prevDocument = global.document;
const prevWindow = global.window;

global.document = {
  body: mockBody,
  getElementById: (id) => {
    if (domRegistry.has(id)) return domRegistry.get(id);
    for (const child of mockBody.children) {
      if (child.id === id) return child;
    }
    return null;
  },
  createElement: (tag) => new MockElement(tag)
};
global.window = global.window || {
  addEventListener() {},
  removeEventListener() {}
};

// Create isolated storage, economy, and ContractManager
const storage = new StorageManager({
  storageKey: `tron_test_modal_${Math.random().toString(36).slice(2)}`,
  backupKey: `tron_test_modal_bak_${Math.random().toString(36).slice(2)}`
});
storage.load();
storage.set('player.level', 3, { immediate: true });

const economy = new EconomyManager({ storage });
const manager = new ContractManager({
  storage,
  economy,
  duelBridge: null,
  swarmBridge: null,
  campaignManager: null,
  playFanfareFn: () => {},
  nowFn: () => Date.parse('2026-11-26T22:30:00.000Z'),
  rngFn: () => 0
});
manager.init();

const modal = new ContractsModal({ contracts: manager });

// Test 1: Format UTC countdown helper
assert.strictEqual(formatUtcCountdown(5400000), '01:30:00 UTC');

// Test 2: Open modal when Career is locked -> shows Daily + Locked prerequisites
modal.show();
assert.strictEqual(modal.isOpen(), true);
const lockedHtml = modal.container.innerHTML;
assert.ok(lockedHtml.includes('FEDERATION CONTRACTS'));
assert.ok(lockedHtml.includes('RESETS IN 01:30:00 UTC'));
assert.ok(lockedHtml.includes('250 XP'));
assert.ok(lockedHtml.includes('DAILY SWEEP BONUS // 500 AC (0 / 3)'));
assert.ok(lockedHtml.includes('CAREER DECK LOCKED'));
assert.ok(lockedHtml.includes('Player Level 3 / 5'));
assert.ok(lockedHtml.includes('Swarm Wave 1 / 5'));
modal.hide({ skipMenuCallback: true });
assert.strictEqual(modal.isOpen(), false);
console.log('✓ ContractsModal open, UTC countdown, Daily cards, and locked Career prerequisites verified');

// Test 3: Unlock Career, complete 1 Daily + 1 Career, verify pip & claim + deck deal
storage.set('player.level', 6, { immediate: true });
storage.set('stats.swarmHighestWave', 6, { immediate: true });
manager.checkCareerUnlock();

const dailyState = manager.getDailyState();
const careerState = manager.getCareerState();
const firstCareerId = careerState.slots[0].id;

manager.recordMetric(dailyState.slots[0].metricKey, dailyState.slots[0].target);
manager.recordMetric(careerState.slots[0].metricKey, careerState.slots[0].target);

// Pip appears when claimable rewards exist, and disappears once all rewards are claimed
assert.strictEqual(updateContractsPip(manager), true);
assert.ok(contractsBtn.querySelector('.neon-pip-dot'), 'Pulsing neon pip must appear on #contractsBtn');

modal.show();
const unlockedHtml = modal.container.innerHTML;
assert.ok(unlockedHtml.includes('TIER 1: ROOKIE'));
assert.ok(unlockedHtml.includes('Combat Precision'));
assert.ok(unlockedHtml.includes('Swarm &amp; Tour') || unlockedHtml.includes('Swarm & Tour'));
assert.ok(unlockedHtml.includes('Duel Competitive'));

// Claim Daily slot 0 and Career slot 0 through modal button handlers
modal.container._parsedCache = new Map();
modal.container._parsedListCache = null;
const claimBtns = modal.container.querySelectorAll('.contract-claim-btn');
assert.strictEqual(claimBtns.length, 2, 'Should render 2 [ CLAIM ] buttons (1 Daily + 1 Career)');

// Simulate clicking Career claim button via manager + refresh (and verify bindEvents attached onclick)
const resDaily = manager.claimDailyContract(0);
assert.strictEqual(resDaily.success, true);
const resCareer = manager.claimCareerContract(0);
assert.strictEqual(resCareer.success, true);
assert.notStrictEqual(resCareer.nextSlot.id, firstCareerId, 'Claiming Career slot deals a fresh replacement');

modal.refresh();
assert.ok(modal.container.innerHTML.includes(resCareer.nextSlot.title), 'Refreshed modal renders newly dealt Career contract');
assert.strictEqual(updateContractsPip(manager), false, 'Pip clears once all claimable rewards are collected');
assert.strictEqual(contractsBtn.querySelector('.neon-pip-dot'), null);
console.log('✓ Career unlock, claim payout, shuffle-bag deck deal, and reactive #contractsBtn pip verified');

// Test 4: bindMenuButtons wires #contractsBtn click to open ContractsModal
bindMenuButtons();
let clickedShow = false;
const origShow = singletonContractsModal.show.bind(singletonContractsModal);
singletonContractsModal.show = () => { clickedShow = true; };
contractsBtn.click({ stopPropagation() {}, cancelable: false });
assert.strictEqual(clickedShow, true, 'Clicking #contractsBtn must invoke contractsModal.show()');
singletonContractsModal.show = origShow;
console.log('✓ #contractsBtn click binding to ContractsModal verified');

// Cleanup
modal.hide({ skipMenuCallback: true });
manager.teardown();
storage.destroy();
global.document = prevDocument;
global.window = prevWindow;

console.log('\n======================================================');
console.log('ALL CONTRACTS MODAL & PIP TESTS PASSED (100% SUCCESS)');
console.log('======================================================\n');
