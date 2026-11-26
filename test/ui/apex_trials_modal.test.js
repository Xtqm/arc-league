/**
 * apex_trials_modal.test.js
 * Unit and integration tests for ApexTrialsModal, #apexTrialsBtn wiring,
 * Spark Vault tab purchases, cycle payout claiming, and Dossier Title selector.
 */

import assert from 'assert';
import { StorageManager } from '../../src/core/storage/StorageManager.js';
import { EconomyManager } from '../../src/core/economy/EconomyManager.js';
import { ArmoryManager } from '../../src/armory/ArmoryManager.js';
import { ARMORY_CATEGORIES, UNLOCK_TYPES } from '../../src/armory/ArmoryCatalog.js';
import { DAY_MS, WEEK_MS } from '../../src/events/ApexTrialRegistry.js';
import { ApexTrialManager } from '../../src/events/ApexTrialManager.js';
import { SparkVaultManager } from '../../src/events/SparkVaultManager.js';
import { ApexTrialsModal, formatEventCountdown } from '../../src/ui/modals/ApexTrialsModal.js';
import { bindMenuButtons, updateApexTrialsPip, apexTrialsModal as singletonApexTrialsModal } from '../../src/ui/menus.js';
import { populateDossierData, initAuthTerminal } from '../../src/ui/authTerminal.js';
import { storageManager as globalStorageManager } from '../../src/core/storage/StorageManager.js';

console.log('--- Running ApexTrialsModal & UI Integration Test Suite ---');

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
    this.value = '';
    this.open = false;
    this.disabled = false;
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
    if (this.parentNode) this.parentNode.removeChild(this);
  }
  setAttribute(k, v) {
    this._attrs.set(k, String(v));
    if (k.startsWith('data-')) this.dataset[k.slice(5)] = String(v);
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
  dispatchEvent(evt) {
    for (const fn of (this._listeners.get(evt.type) || [])) {
      fn(evt);
    }
  }
  click(evt = { stopPropagation() {}, cancelable: false }) {
    if (this.disabled) return;
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
    for (const fn of (this._listeners.get('close') || [])) fn();
  }
  _parseRenderedButtons() {
    if (this._lastParsedHtml === this.innerHTML && this._lastParsedButtons) {
      return this._lastParsedButtons;
    }
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
      if (/\bdisabled\b/.test(attrsStr)) btn.disabled = true;
      const attrRegex = /(data-[a-z-]+)="([^"]+)"/g;
      let am;
      while ((am = attrRegex.exec(attrsStr)) !== null) {
        btn.setAttribute(am[1], am[2]);
      }
      found.push(btn);
    }
    this._lastParsedHtml = this.innerHTML;
    this._lastParsedButtons = found;
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
        this._parsedCache = this._parsedCache || new Map();
        const btns = this._parseRenderedButtons();
        const hit = btns.find((b) => b.id === id);
        if (hit) {
          this._parsedCache.set(id, hit);
          return hit;
        }
      }
    }
    return null;
  }
  querySelectorAll(sel) {
    if (!this.innerHTML) return [];
    const btns = this._parseRenderedButtons();
    const attrMatch = /^\[([a-z-]+)="([^"]+)"\]$/.exec(sel);
    if (attrMatch) {
      const [, attr, val] = attrMatch;
      return btns.filter((b) => b.getAttribute(attr) === val);
    }
    return [];
  }
}

function setupMockDom(extraElements = {}) {
  const prevDoc = globalThis.document;
  const elements = new Map();
  const body = new MockElement('body');

  for (const [id, el] of Object.entries(extraElements)) {
    el.id = id;
    elements.set(id, el);
  }

  globalThis.document = {
    body,
    pointerLockElement: null,
    exitPointerLock() {},
    createElement(tag) {
      return new MockElement(tag);
    },
    getElementById(id) {
      if (elements.has(id)) return elements.get(id);
      if (body.id === id) return body;
      for (const c of body.children) {
        if (c.id === id) return c;
      }
      return null;
    }
  };

  return {
    elements,
    restore() {
      globalThis.document = prevDoc;
    }
  };
}

// 1. formatEventCountdown utility
{
  assert.strictEqual(formatEventCountdown(3661000), '01:01:01');
  assert.strictEqual(formatEventCountdown(2 * DAY_MS + 3600000), '2D 01:00:00');
}

// 2. ApexTrialsModal Overview tab: Free Ticket -> 2 Sparks launch & cycle claim
{
  const dom = setupMockDom();
  try {
    const storage = new StorageManager({
      storageKey: `tron_test_modal_${Math.random().toString(36).slice(2)}`,
      backupKey: `tron_test_modal_bak_${Math.random().toString(36).slice(2)}`
    });
    storage.load();
    const economy = new EconomyManager({ storage });

    let nowMs = 101 * DAY_MS;
    const customSchedule = [
      { cycleId: 'cycle_prev', templateId: 'trial_zero_g_nexus', startsAt: 90 * DAY_MS, endsAt: 94 * DAY_MS },
      { cycleId: 'cycle_curr', templateId: 'trial_hyper_velocity', startsAt: 100 * DAY_MS, endsAt: 105 * DAY_MS }
    ];

    const trials = new ApexTrialManager({
      storage,
      economy,
      nowFn: () => nowMs,
      customSchedule
    });
    const vault = new SparkVaultManager({
      economy,
      armory: new ArmoryManager({ storage, economy }),
      nowFn: () => nowMs
    });

    // Seed an unclaimed completed cycle
    await trials.recordRunResult('cycle_prev', {
      wavesCleared: 10,
      survivalSeconds: 300,
      fractures: 25,
      parries: 5,
      victory: true
    });

    const container = new MockElement('dialog');
    let launchedPayload = null;
    const modal = new ApexTrialsModal({ trials, vault, economy, container });
    modal.setOnLaunchTrial((res) => { launchedPayload = res; });

    modal.show();
    assert.strictEqual(modal.isOpen(), true);
    assert.ok(container.innerHTML.includes('HYPER-VELOCITY PROTOCOL'));
    assert.ok(container.innerHTML.includes('FREE ENTRY TICKET'));
    assert.ok(container.innerHTML.includes('CLAIM PAYOUT'));

    // Claim previous cycle payout
    const claimBtn = container.querySelector('#claimCycleBtn_cycle_prev');
    assert.ok(claimBtn, 'Claim cycle button should render');
    claimBtn.click();
    assert.ok(economy.getSparks() >= 1, 'Claiming cycle payout must award Sparks');

    // Launch active trial using Free Ticket
    const launchBtn = container.querySelector('#apexTrialLaunchBtn');
    assert.ok(launchBtn, 'Launch button should render');
    launchBtn.click();
    assert.ok(launchedPayload && launchedPayload.usesFreeTicket === true);
    assert.strictEqual(modal.isOpen(), false);
  } finally {
    dom.restore();
  }
}

// 3. ApexTrialsModal Spark Vault tab purchase flow
{
  const dom = setupMockDom();
  try {
    const storage = new StorageManager({
      storageKey: `tron_test_modal_v_${Math.random().toString(36).slice(2)}`,
      backupKey: `tron_test_modal_vb_${Math.random().toString(36).slice(2)}`
    });
    storage.load();
    const economy = new EconomyManager({ storage });
    economy.awardSparks(200, 'test_grant');
    const armory = new ArmoryManager({ storage, economy });

    const ts = 4 * WEEK_MS + 1000;
    const trials = new ApexTrialManager({ storage, economy, nowFn: () => ts });
    const vault = new SparkVaultManager({
      economy,
      armory,
      nowFn: () => ts,
      getEligibleItemsFn: () => [
        { id: 'disc_hex_dark_matter', displayName: 'Dark Matter', category: ARMORY_CATEGORIES.DISC_SKINS, unlockType: UNLOCK_TYPES.SPARKS, cost: 75 }
      ]
    });

    const container = new MockElement('dialog');
    const modal = new ApexTrialsModal({ trials, vault, economy, container });
    modal.show({ tab: 'vault' });

    assert.ok(container.innerHTML.includes('Dark Matter'));
    assert.ok(container.innerHTML.includes('75 SPARKS'));

    const buyBtn = container.querySelector('#vaultBuyBtn_disc_hex_dark_matter');
    assert.ok(buyBtn && !buyBtn.disabled, 'Vault buy button should be enabled');
    buyBtn.click();

    assert.strictEqual(economy.getSparks(), 125);
    assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.DISC_SKINS, 'disc_hex_dark_matter'), true);
    assert.ok(container.innerHTML.includes('OWNED // EQUIP IN LOADOUT'));
  } finally {
    dom.restore();
  }
}

// 4. #apexTrialsBtn wiring and active pip in menus.js
{
  const apexBtn = new MockElement('button');
  const dom = setupMockDom({
    apexTrialsBtn: apexBtn,
    contractsBtn: new MockElement('button')
  });
  try {
    bindMenuButtons();
    const hasPip = updateApexTrialsPip({
      isTrialActive: () => true,
      getClaimableCycles: () => []
    });
    assert.strictEqual(hasPip, true);
    assert.strictEqual(apexBtn.children.length, 1);

    apexBtn.click();
    assert.strictEqual(singletonApexTrialsModal.isOpen(), true);
    singletonApexTrialsModal.hide({ skipMenuCallback: true });
  } finally {
    dom.restore();
  }
}

// 5. Title selector in authTerminal.js
{
  const titleSelect = new MockElement('select');
  const authModal = new MockElement('div');
  const dom = setupMockDom({
    authModal,
    dossierTitleSelect: titleSelect
  });
  try {
    globalStorageManager.load();
    globalStorageManager.set('player.titles', ['APEX PRIME: ZERO-G', 'APEX PRIME: ARBITER'], { immediate: true });
    globalStorageManager.set('player.equippedTitle', null, { immediate: true });

    initAuthTerminal();
    populateDossierData();

    assert.ok(titleSelect.innerHTML.includes('APEX PRIME: ZERO-G'));
    assert.ok(titleSelect.innerHTML.includes('APEX PRIME: ARBITER'));

    titleSelect.value = 'APEX PRIME: ARBITER';
    titleSelect.dispatchEvent({ type: 'change', target: titleSelect });
    assert.strictEqual(globalStorageManager.get('player.equippedTitle'), 'APEX PRIME: ARBITER');
  } finally {
    dom.restore();
  }
}

console.log('✓ All ApexTrialsModal & UI Integration tests passed!');
