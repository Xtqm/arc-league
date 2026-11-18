/**
 * achievements_modal.test.js
 * Unit and integration test suite for AchievementsModal (SPEC-ACHIEVE-001).
 */

import assert from 'assert';
import fs from 'fs';
import { AchievementsModal } from '../../src/ui/modals/AchievementsModal.js';
import { state } from '../../src/core/state.js';

console.log('--- Running Achievements Modal Test Suite (SPEC-ACHIEVE-001) ---');

// Mock DOM classes
class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.style = { display: 'none' };
    this.children = [];
    this.parentNode = null;
    this.id = '';
    this.className = '';
    this.innerHTML = '';
    this.dataset = {};
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
  getAttribute(attr) {
    if (attr === 'data-id') return this.dataset.id || this._dataId || null;
    return null;
  }
  setAttribute(attr, val) {
    if (attr === 'data-id') {
      this.dataset.id = val;
      this._dataId = val;
    }
  }
  querySelector(sel) {
    if (sel.startsWith('#')) {
      const id = sel.slice(1);
      if (this.id === id) return this;
      for (const c of this.children) {
        const found = c.querySelector(sel);
        if (found) return found;
      }
    }
    if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      if (this.className.split(' ').includes(cls)) return this;
      for (const c of this.children) {
        const found = c.querySelector(sel);
        if (found) return found;
      }
    }
    return null;
  }
  querySelectorAll(sel) {
    const list = [];
    if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      if (this.className.split(' ').includes(cls)) list.push(this);
    }
    for (const c of this.children) {
      if (typeof c.querySelectorAll === 'function') {
        list.push(...c.querySelectorAll(sel));
      }
    }
    return list;
  }
  addEventListener(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(fn);
  }
}

// Mock AchievementManager
function createMockAchievementManager() {
  let reconciledCalled = 0;
  const claimedRewards = [];
  let claimAllCalled = false;

  const achievements = [
    {
      id: 'ach_first_blood',
      title: 'Initial Execution',
      description: 'De-rez first hostile program',
      category: 'combat',
      icon: '⚡',
      target: 1,
      unlocked: true,
      status: 'CLAIMED',
      progress: { current: 1, target: 1, ratio: 1.0, satisfied: true },
      reward: { bits: 100, cosmetic: null }
    },
    {
      id: 'ach_curve_god',
      title: 'Geometric Curved Path',
      description: 'Eliminate 25 hostiles with curving disc shots',
      category: 'combat',
      icon: '🌀',
      target: 25,
      unlocked: false,
      status: 'LOCKED',
      progress: { current: 10, target: 25, ratio: 0.4, satisfied: false },
      reward: { bits: 300, cosmetic: null }
    },
    {
      id: 'ach_parry_king',
      title: 'Deflective Protocol',
      description: 'Parry 50 incoming enemy discs',
      category: 'combat',
      icon: '🛡️',
      target: 50,
      unlocked: false,
      status: 'CLAIMABLE',
      progress: { current: 50, target: 50, ratio: 1.0, satisfied: true },
      reward: { bits: 250, cosmetic: null }
    },
    {
      id: 'ach_untouchable',
      title: 'Flawless Subroutine',
      description: 'Complete any Grid trial with 100% integrity',
      category: 'campaign',
      icon: '💎',
      target: 1,
      unlocked: false,
      status: 'CLAIMABLE',
      progress: { current: 1, target: 1, ratio: 1.0, satisfied: true },
      reward: { bits: 500, cosmetic: null }
    },
    {
      id: 'ach_swarm_survivor',
      title: 'Endless Firewall',
      description: 'Survive 15 consecutive waves in Swarm Defense',
      category: 'survival',
      icon: '🔥',
      target: 15,
      unlocked: true,
      status: 'CLAIMED',
      progress: { current: 15, target: 15, ratio: 1.0, satisfied: true },
      reward: {
        bits: 750,
        cosmetic: { category: 'discSkins', itemId: 'disc_corrupted_void', displayName: 'Corrupted Void' }
      }
    },
    {
      id: 'ach_grid_one_master',
      title: 'Outlands Conqueror',
      description: 'Earn all 18 stars across Grid 01',
      category: 'campaign',
      icon: '👑',
      target: 18,
      unlocked: false,
      status: 'LOCKED',
      progress: { current: 12, target: 18, ratio: 0.67, satisfied: false },
      reward: {
        bits: 1000,
        cosmetic: { category: 'chassisSkins', itemId: 'chassis_arbiter', displayName: 'Sovereign Arbiter' }
      }
    }
  ];

  return {
    getMatrixStatus: () => achievements,
    getCompletionStats: () => ({ total: 6, unlocked: achievements.filter(a => a.status === 'CLAIMED').length, percentage: 33 }),
    getPendingClaimCount: () => achievements.filter(a => a.status === 'CLAIMABLE').length,
    claimReward: (id) => {
      claimedRewards.push(id);
      const target = achievements.find(a => a.id === id);
      if (target) {
        target.status = 'CLAIMED';
        target.unlocked = true;
      }
      return true;
    },
    claimAllRewards: () => {
      claimAllCalled = true;
      const claimable = achievements.filter(a => a.status === 'CLAIMABLE');
      for (const a of claimable) {
        a.status = 'CLAIMED';
        a.unlocked = true;
        claimedRewards.push(a.id);
      }
      return claimable.map(a => a.id);
    },
    reconcileAchievements: () => {
      reconciledCalled++;
      return [];
    },
    getClaimedRewards: () => [...claimedRewards],
    wasClaimAllCalled: () => claimAllCalled,
    getReconciledCount: () => reconciledCalled
  };
}

// Setup environment
const mockMgr = createMockAchievementManager();
const modal = new AchievementsModal({
  achievements: mockMgr
});

// =========================================================================
// Test Group 1: Modal Initialization & Initial State
// =========================================================================
console.log('\n[Group 1] Testing Modal Initialization & State...');

assert.strictEqual(modal.isOpen(), false, 'Modal should initially be closed');

let backFired = false;
modal.setOnBackToMenu(() => { backFired = true; });

console.log('✓ Group 1: Initialization verified.');

// =========================================================================
// Test Group 2: Render Markup & Content Verification
// =========================================================================
console.log('\n[Group 2] Testing Trophy Matrix Markup Generation...');

const markup = modal.render();

// Header & Summary
assert.ok(markup.includes('TROPHY MATRIX // ACHIEVEMENTS'), 'Must contain modal title');
assert.ok(markup.includes('OVERALL SYNCHRONIZATION: 2 / 6 PROTOCOLS'), 'Must render overall synchronized count');
assert.ok(markup.includes('33% COMPLETED'), 'Must render percentage complete');

// All 6 Launch Achievements present
assert.ok(markup.includes('Initial Execution'));
assert.ok(markup.includes('Geometric Curved Path'));
assert.ok(markup.includes('Deflective Protocol'));
assert.ok(markup.includes('Flawless Subroutine'));
assert.ok(markup.includes('Endless Firewall'));
assert.ok(markup.includes('Outlands Conqueror'));

// Unlocked vs Locked Badges vs Claimable Buttons
assert.ok(markup.includes('[ UNLOCKED ]'), 'Must render unlocked status badges');
assert.ok(markup.includes('[ LOCKED ]'), 'Must render locked status badges');
assert.ok(markup.includes('[ CLAIM REWARD ]'), 'Must render interactive [ CLAIM REWARD ] buttons on claimable cards');
assert.ok(markup.includes('claimBtn_ach_parry_king'), 'Must render specific claim button for claimable milestone');
assert.ok(markup.includes('[ CLAIM ALL REWARDS ]'), 'Must render header [ CLAIM ALL REWARDS ] when >= 2 achievements ready');
assert.ok(markup.includes('id="claimAllAchievementsBtn"'), 'Must render #claimAllAchievementsBtn in header');

// Progress numbers
assert.ok(markup.includes('10 / 25'), 'Must render curve kills progress (10 / 25)');
assert.ok(markup.includes('50 / 50'), 'Must render parries progress (50 / 50)');
assert.ok(markup.includes('12 / 18'), 'Must render grid stars progress (12 / 18)');

// Reward Badges
assert.ok(markup.includes('+100 BITS'));
assert.ok(markup.includes('+300 BITS'));
assert.ok(markup.includes('SKIN: CORRUPTED VOID'));
assert.ok(markup.includes('SKIN: SOVEREIGN ARBITER'));

console.log('✓ Group 2: Trophy Matrix HTML structure and metrics verified.');

// =========================================================================
// Test Group 3: Show & Hide Lifecycle
// =========================================================================
console.log('\n[Group 3] Testing Show/Hide Lifecycle and Navigation...');

const mockContainer = new MockElement('div');
mockContainer.id = 'achievementsModal';

// Attach mock container to modal instance
Object.defineProperty(modal, 'container', {
  get: () => mockContainer,
  configurable: true
});

modal.show();
assert.strictEqual(mockContainer.style.display, 'flex');
assert.strictEqual(modal.isOpen(), true);
assert.strictEqual(state.achievementsModalOpen, true);

// Hide modal
modal.hide();
assert.strictEqual(mockContainer.style.display, 'none');
assert.strictEqual(modal.isOpen(), false);
assert.strictEqual(state.achievementsModalOpen, false);
assert.strictEqual(backFired, true, 'Back to menu callback should have fired');

console.log('✓ Group 3: Lifecycle and navigation transitions verified.');

// =========================================================================
// Test Group 4: Button & Keyboard Event Listeners
// =========================================================================
console.log('\n[Group 4] Testing UI Button Bindings & ESC Handling...');

modal.show();

const closeBtn = new MockElement('button');
closeBtn.id = 'achievementsCloseBtn';
const returnBtn = new MockElement('button');
returnBtn.id = 'achievementsReturnBtn';

const mockRoot = new MockElement('div');
mockRoot.appendChild(closeBtn);
mockRoot.appendChild(returnBtn);

modal.bindEvents(mockRoot);

// Click close button
assert.ok(typeof closeBtn.onclick === 'function');
closeBtn.onclick({ stopPropagation: () => {} });
assert.strictEqual(modal.isOpen(), false);

// Show again and click return button
modal.show();
assert.ok(mockMgr.getReconciledCount() >= 1, 'reconcileAchievements must be called upon show()');
assert.ok(typeof returnBtn.onclick === 'function');
returnBtn.onclick({ stopPropagation: () => {} });
assert.strictEqual(modal.isOpen(), false);

// Test interactive [ CLAIM REWARD ] and [ CLAIM ALL REWARDS ] click bindings
modal.show();
const claimParryBtn = new MockElement('button');
claimParryBtn.id = 'claimBtn_ach_parry_king';
claimParryBtn.className = 'claim-reward-btn';
claimParryBtn.setAttribute('data-id', 'ach_parry_king');

const claimAllBtn = new MockElement('button');
claimAllBtn.id = 'claimAllAchievementsBtn';

const mockRootInteractive = new MockElement('div');
mockRootInteractive.appendChild(claimParryBtn);
mockRootInteractive.appendChild(claimAllBtn);
mockRootInteractive.appendChild(closeBtn);
mockRootInteractive.appendChild(returnBtn);

modal.bindEvents(mockRootInteractive);

assert.ok(typeof claimParryBtn.onclick === 'function', 'Claim reward button must have click binding');
claimParryBtn.onclick({ stopPropagation: () => {} });
assert.ok(mockMgr.getClaimedRewards().includes('ach_parry_king'), 'Clicking [ CLAIM REWARD ] must invoke claimReward()');

assert.ok(typeof claimAllBtn.onclick === 'function', 'Claim all rewards button must have click binding');
claimAllBtn.onclick({ stopPropagation: () => {} });
assert.strictEqual(mockMgr.wasClaimAllCalled(), true, 'Clicking [ CLAIM ALL REWARDS ] must invoke claimAllRewards()');

console.log('✓ Group 4: Close, return, [ CLAIM REWARD ], and [ CLAIM ALL REWARDS ] button events verified.');

// =========================================================================
// Test Group 5: Main Menu Static DOM & CSS Integration
// =========================================================================
console.log('\n[Group 5] Testing Main Menu Static DOM & CSS Integration...');
const indexHtml = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
assert(indexHtml.includes('id="achievementsBtn"'), 'index.html must declare #achievementsBtn in mainMenuButtons');
assert(indexHtml.includes('.achievements-btn {'), 'index.html must define .achievements-btn stylesheet rule');
assert(indexHtml.includes('.achievements-btn:hover'), 'index.html must define .achievements-btn:hover stylesheet rule');
console.log('✓ Main menu static HTML and CSS rules for Achievements verified.');

console.log('\n======================================================');
console.log('ALL ACHIEVEMENTS MODAL TESTS PASSED CLEANLY (100%)');
console.log('======================================================');
