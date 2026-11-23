import assert from 'assert';
import * as THREE from '../vendor/three.module.js';
import { state } from '../src/core/state.js';
import { onDown } from '../src/input/keyboard.js';
import { tryLock, isLocked, setCursor, initMouse } from '../src/input/mouse.js';
import { showGameOver } from '../src/ui/modals.js';
import { damagePlayer, updatePlayer } from '../src/entities/Player.js';

console.log('--- Running Game Over & Escape Flow Remediation Test Suite ---');

// Mock DOM elements and document environment
class MockElement {
  constructor(tagName = 'DIV', id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.style = {};
    this.classList = new Set();
    this.children = [];
    this.tabIndex = 0;
    this.eventListeners = {};
  }
  addEventListener(event, fn) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(fn);
  }
  removeEventListener(event, fn) {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event] = this.eventListeners[event].filter(h => h !== fn);
  }
  dispatchEvent(event) {
    const list = this.eventListeners[event.type] || [];
    for (const fn of list) fn(event);
  }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  closest(selector) {
    if (!selector) return null;
    const parts = selector.split(',').map(s => s.trim().replace(/^#/, '').replace(/^\./, ''));
    if (parts.includes(this.id) || Array.from(this.classList).some(c => parts.includes(c))) {
      return this;
    }
    return null;
  }
  requestPointerLock() {
    mockDocument.pointerLockElement = this;
    return Promise.resolve();
  }
}

const mockBody = new MockElement('BODY', 'body');
const mockCanvas = new MockElement('CANVAS', 'gameCanvas');
const mockOverlay = new MockElement('DIV', 'overlay');
mockOverlay.style.display = 'none';

const mockElements = {
  overlay: mockOverlay,
  authModal: new MockElement('DIV', 'authModal'),
  armoryModal: new MockElement('DIV', 'armoryModal'),
  achievementsModal: new MockElement('DIV', 'achievementsModal'),
  trialDebriefModal: new MockElement('DIV', 'trialDebriefModal'),
  directivesModal: new MockElement('DIV', 'directivesModal'),
  settingsModal: new MockElement('DIV', 'settingsModal'),
  hostModal: new MockElement('DIV', 'hostModal'),
  roomModal: new MockElement('DIV', 'roomModal'),
  cosmeticStudioModal: new MockElement('DIV', 'cosmeticStudioModal')
};

for (const id in mockElements) {
  mockElements[id].style.display = 'none';
}

let exitPointerLockCalls = 0;
let exitFullScreenCalls = 0;
let isFullScreenMock = false;

const mockDocument = {
  body: mockBody,
  activeElement: mockBody,
  pointerLockElement: null,
  fullscreenElement: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {},
  getElementById: (id) => mockElements[id] || null,
  elementFromPoint: () => mockCanvas,
  exitPointerLock: () => {
    exitPointerLockCalls++;
    mockDocument.pointerLockElement = null;
  },
  exitFullscreen: () => {
    exitFullScreenCalls++;
    isFullScreenMock = false;
    mockDocument.fullscreenElement = null;
  }
};

globalThis.document = mockDocument;
globalThis.window = globalThis.window || {};
window.addEventListener = window.addEventListener || (() => {});
window.removeEventListener = window.removeEventListener || (() => {});
window.focus = window.focus || (() => {});
window.__tronExitFullScreen = () => {
  exitFullScreenCalls++;
  isFullScreenMock = false;
  mockDocument.fullscreenElement = null;
};
window.__tronIsFullScreen = () => isFullScreenMock;

// Initialize mouse with mock canvas
initMouse(mockCanvas);

function resetState() {
  if (!state.player) {
    state.player = {
      pos: new THREE.Vector3(0, 0, 0),
      vel: new THREE.Vector3(0, 0, 0)
    };
  }
  Object.assign(state.player, {
    hp: 100,
    maxHp: 100,
    alive: true,
    invuln: 0,
    y: 0,
    vy: 0,
    grounded: true,
    jumps: 0,
    energy: 100,
    dashCd: 0,
    parryTimer: 0,
    hasDisc: true,
    yaw: 0,
    pitch: 0,
    obj: {
      position: new THREE.Vector3(),
      rotation: { x: 0, y: 0, z: 0 },
      userData: { torso: { children: [] } },
      visible: true
    }
  });
  state.player.pos.set(0, 0, 0);
  state.player.vel.set(0, 0, 0);
  state.keys = {};
  state.running = true;
  state.paused = false;
  state.gameMode = 'swarm';
  state.countdownTimer = 0;
  state.gameOverReason = '';
  state.multiplayerMatchFinished = false;
  state.seriesRoundFinished = false;
  state.authModalOpen = false;
  state.armoryModalOpen = false;
  state.achievementsModalOpen = false;
  state.lastPauseToggle = -1000;

  for (const id in mockElements) {
    mockElements[id].style.display = 'none';
  }
  mockDocument.pointerLockElement = null;
  mockDocument.fullscreenElement = null;
  mockDocument.body.style.cursor = 'default';
  isFullScreenMock = false;
  exitPointerLockCalls = 0;
  exitFullScreenCalls = 0;
}

// =========================================================================
// TEST 1: Pointer Lock Release on Elimination
// =========================================================================
console.log('\n[Test 1] Testing automatic Pointer Lock release on elimination across game modes...');

// 1a: Swarm Mode Lethal Damage
resetState();
state.gameMode = 'swarm';
mockDocument.pointerLockElement = mockCanvas;
exitPointerLockCalls = 0;

damagePlayer(150);
assert.strictEqual(state.player.hp, 0, 'Player HP must be reduced to 0');
assert.strictEqual(state.player.alive, false, 'Player alive must be false');
assert.strictEqual(state.running, false, 'state.running must be false');
assert.strictEqual(exitPointerLockCalls > 0, true, 'document.exitPointerLock() must be called in Swarm mode');
assert.strictEqual(mockDocument.pointerLockElement, null, 'pointerLockElement must be cleared');
assert.strictEqual(mockDocument.body.style.cursor, 'default', 'System cursor must be restored to default');
console.log('✓ Swarm mode lethal elimination releases pointer lock and restores system cursor');

// 1b: Solo AI Duel Mode Lethal Damage
resetState();
state.gameMode = 'duel_ai';
mockDocument.pointerLockElement = mockCanvas;
exitPointerLockCalls = 0;

damagePlayer(120);
assert.strictEqual(state.player.alive, false, 'Player alive must be false');
assert.strictEqual(exitPointerLockCalls > 0, true, 'document.exitPointerLock() must be called in Duel AI mode');
assert.strictEqual(mockDocument.pointerLockElement, null, 'pointerLockElement must be cleared');
assert.strictEqual(mockDocument.body.style.cursor, 'default', 'System cursor must be restored to default');
console.log('✓ Solo AI Duel mode lethal elimination releases pointer lock and restores system cursor');

// 1c: Campaign Mode Lethal Damage
resetState();
state.gameMode = 'campaign';
state.campaignLevelId = 'level_01_02';
mockDocument.pointerLockElement = mockCanvas;
exitPointerLockCalls = 0;

damagePlayer(100);
assert.strictEqual(state.player.alive, false, 'Player alive must be false');
assert.strictEqual(exitPointerLockCalls > 0, true, 'document.exitPointerLock() must be called in Campaign mode');
assert.strictEqual(mockDocument.pointerLockElement, null, 'pointerLockElement must be cleared');
assert.strictEqual(mockDocument.body.style.cursor, 'default', 'System cursor must be restored to default');
console.log('✓ Campaign mode lethal elimination releases pointer lock and restores system cursor');

// 1d: Multiplayer Duel Mode Lethal Damage
resetState();
state.gameMode = 'duel_multi';
state.playerRole = 'p1';
mockDocument.pointerLockElement = mockCanvas;
exitPointerLockCalls = 0;

damagePlayer(200);
assert.strictEqual(state.player.alive, false, 'Player alive must be false');
assert.strictEqual(exitPointerLockCalls > 0, true, 'document.exitPointerLock() must be called in Multiplayer mode');
assert.strictEqual(mockDocument.pointerLockElement, null, 'pointerLockElement must be cleared');
assert.strictEqual(mockDocument.body.style.cursor, 'default', 'System cursor must be restored to default');
console.log('✓ Multiplayer mode lethal elimination releases pointer lock and restores system cursor');

// 1e: Void Death Elimination (y < -18)
resetState();
state.gameMode = 'swarm';
state.player.y = -19;
mockDocument.pointerLockElement = mockCanvas;
exitPointerLockCalls = 0;

updatePlayer(0.016);
assert.strictEqual(state.player.alive, false, 'Player must be eliminated on falling into void');
assert.strictEqual(exitPointerLockCalls > 0, true, 'Void death threshold must trigger exitPointerLock()');
assert.strictEqual(mockDocument.pointerLockElement, null, 'pointerLockElement must be cleared on void death');
assert.strictEqual(mockDocument.body.style.cursor, 'default', 'System cursor must be restored to default');
console.log('✓ Void fall elimination cleanly releases pointer lock and restores system cursor');

// =========================================================================
// TEST 2: Defensive Pointer Lock Release in showGameOver()
// =========================================================================
console.log('\n[Test 2] Testing defensive pointer lock exit and cursor visibility in showGameOver()...');
resetState();
mockDocument.pointerLockElement = mockCanvas;
mockDocument.body.style.cursor = 'none';
exitPointerLockCalls = 0;

showGameOver();
assert.strictEqual(exitPointerLockCalls > 0, true, 'showGameOver() must defensively call document.exitPointerLock()');
assert.strictEqual(mockDocument.pointerLockElement, null, 'pointerLockElement must be null');
assert.strictEqual(mockDocument.body.style.cursor, 'default', 'Cursor must be set to default when Game Over card opens');
console.log('✓ showGameOver() defensively unlocks pointer and ensures default cursor visibility');

// =========================================================================
// TEST 3: Pointer Lock Click Re-Acquire Guard
// =========================================================================
console.log('\n[Test 3] Testing canvas click tryLock() guard while eliminated or Game Over overlay active...');

// 3a: While player is eliminated (!state.player.alive)
resetState();
state.player.alive = false;
state.running = false;
mockDocument.pointerLockElement = null;

tryLock();
assert.strictEqual(mockDocument.pointerLockElement, null, 'tryLock() must not acquire pointer lock when player is dead');

mockCanvas.dispatchEvent({ type: 'click', clientX: 100, clientY: 100 });
assert.strictEqual(mockDocument.pointerLockElement, null, 'Canvas click must not acquire pointer lock when player is dead');
console.log('✓ Canvas click and tryLock() correctly blocked while player is eliminated');

// 3b: While Game Over overlay is displayed
resetState();
state.player.alive = true;
state.running = false;
mockOverlay.style.display = 'flex';
mockDocument.pointerLockElement = null;

tryLock();
assert.strictEqual(mockDocument.pointerLockElement, null, 'tryLock() must not acquire pointer lock when #overlay is visible');

mockCanvas.dispatchEvent({ type: 'click', clientX: 100, clientY: 100 });
assert.strictEqual(mockDocument.pointerLockElement, null, 'Canvas click must not acquire pointer lock when #overlay is visible');
console.log('✓ Canvas click and tryLock() correctly blocked while Game Over overlay is displayed');

// =========================================================================
// TEST 4: Decoupled Escape Routing and 2-Tier Fullscreen Architecture
// =========================================================================
console.log('\n[Test 4] Testing decoupled Escape routing across 2 tiers and Game Over...');

// 4a: First Escape press during active combat with pointer locked -> releases cursor & pauses, keeps fullscreen
resetState();
state.running = true;
state.paused = false;
isFullScreenMock = true;
mockDocument.fullscreenElement = mockCanvas;
mockDocument.pointerLockElement = mockCanvas;
exitPointerLockCalls = 0;
exitFullScreenCalls = 0;
let pauseGameCalls = 0;
window.__tronPauseGame = () => { pauseGameCalls++; state.paused = true; };

onDown({ code: 'Escape', preventDefault: () => {} });
assert.strictEqual(exitPointerLockCalls, 1, 'First Escape press must exit pointer lock');
assert.strictEqual(pauseGameCalls, 1, 'First Escape press must pause game match');
assert.strictEqual(exitFullScreenCalls, 0, 'First Escape press must NOT exit fullscreen');
assert.strictEqual(isFullScreenMock, true, 'Window must remain in fullscreen mode after 1st press');
console.log('✓ Tier 1 Escape press releases pointer lock and pauses game without interrupting fullscreen');

// 4b: Second Escape press while paused and unlocked in fullscreen -> exits fullscreen immediately
mockDocument.pointerLockElement = null;
exitPointerLockCalls = 0;
exitFullScreenCalls = 0;

onDown({ code: 'Escape', preventDefault: () => {} });
assert.strictEqual(exitFullScreenCalls, 1, 'Second Escape press while unlocked must exit fullscreen cleanly');
assert.strictEqual(isFullScreenMock, false, 'Window is now out of fullscreen');
console.log('✓ Tier 2 Escape press while paused and unlocked exits fullscreen cleanly on single tap');

// 4c: Single Escape press on Game Over screen -> exits fullscreen immediately
resetState();
state.player.alive = false;
state.running = false;
mockOverlay.style.display = 'flex';
mockDocument.pointerLockElement = null; // Pointer already unlocked on defeat
isFullScreenMock = true;
mockDocument.fullscreenElement = mockCanvas;
exitFullScreenCalls = 0;

onDown({ code: 'Escape', preventDefault: () => {} });
assert.strictEqual(exitFullScreenCalls, 1, 'Single Escape tap on Game Over screen must call exitFullScreen()');
assert.strictEqual(isFullScreenMock, false, 'Window is now out of fullscreen');
console.log('✓ Defeat / Game Over screen cleanly exits fullscreen on single Escape tap (trap eliminated!)');

// =========================================================================
// TEST 5: Universal Modal Dismissal on Escape
// =========================================================================
console.log('\n[Test 5] Testing universal sub-modal dismissal on Escape key...');

// 5a: Achievements Modal
resetState();
isFullScreenMock = true;
mockDocument.fullscreenElement = mockCanvas;
mockElements.achievementsModal.style.display = 'flex';
state.achievementsModalOpen = true;
exitFullScreenCalls = 0;
let closeAchievementsCalled = false;
window.__tronCloseAchievements = () => {
  closeAchievementsCalled = true;
  mockElements.achievementsModal.style.display = 'none';
  state.achievementsModalOpen = false;
};

onDown({ code: 'Escape', preventDefault: () => {} });
assert.strictEqual(closeAchievementsCalled, true, 'Escape must close achievementsModal');
assert.strictEqual(mockElements.achievementsModal.style.display, 'none', 'Modal element display must be none');
assert.strictEqual(exitFullScreenCalls, 0, 'First Escape on open modal must NOT exit fullscreen');

// Next Escape after modal dismissal exits fullscreen
onDown({ code: 'Escape', preventDefault: () => {} });
assert.strictEqual(exitFullScreenCalls, 1, 'Next Escape after modal closed exits fullscreen');
console.log('✓ achievementsModal cleanly intercepts Escape before root fullscreen exit');

// 5b: Trial Debrief Modal
resetState();
isFullScreenMock = true;
mockDocument.fullscreenElement = mockCanvas;
mockElements.trialDebriefModal.style.display = 'flex';
exitFullScreenCalls = 0;
let closeDebriefCalled = false;
window.__tronCloseTrialDebrief = () => {
  closeDebriefCalled = true;
  mockElements.trialDebriefModal.style.display = 'none';
};

onDown({ code: 'Escape', preventDefault: () => {} });
assert.strictEqual(closeDebriefCalled, true, 'Escape must close trialDebriefModal');
assert.strictEqual(mockElements.trialDebriefModal.style.display, 'none', 'Debrief modal display must be none');
assert.strictEqual(exitFullScreenCalls, 0, 'Escape dismissing debrief modal must NOT exit fullscreen');
console.log('✓ trialDebriefModal cleanly intercepts Escape before root fullscreen exit');

// 5c: Directives Modal
resetState();
isFullScreenMock = true;
mockDocument.fullscreenElement = mockCanvas;
mockElements.directivesModal.style.display = 'flex';
exitFullScreenCalls = 0;
let closeDirectivesCalled = false;
window.__tronCloseDirectives = () => {
  closeDirectivesCalled = true;
  mockElements.directivesModal.style.display = 'none';
};

onDown({ code: 'Escape', preventDefault: () => {} });
assert.strictEqual(closeDirectivesCalled, true, 'Escape must close directivesModal');
assert.strictEqual(mockElements.directivesModal.style.display, 'none', 'Directives modal display must be none');
assert.strictEqual(exitFullScreenCalls, 0, 'Escape dismissing directives modal must NOT exit fullscreen');
console.log('✓ directivesModal cleanly intercepts Escape before root fullscreen exit');

// 5d: Settings Modal
resetState();
isFullScreenMock = true;
mockDocument.fullscreenElement = mockCanvas;
mockElements.settingsModal.style.display = 'flex';
exitFullScreenCalls = 0;
let closeSettingsCalled = false;
window.__tronCloseSettings = () => {
  closeSettingsCalled = true;
  mockElements.settingsModal.style.display = 'none';
};

onDown({ code: 'Escape', preventDefault: () => {} });
assert.strictEqual(closeSettingsCalled, true, 'Escape must close settingsModal');
assert.strictEqual(mockElements.settingsModal.style.display, 'none', 'Settings modal display must be none');
assert.strictEqual(exitFullScreenCalls, 0, 'Escape dismissing settings modal must NOT exit fullscreen');
console.log('✓ settingsModal cleanly intercepts Escape before root fullscreen exit');

// 5e: Armory Modal
resetState();
isFullScreenMock = true;
mockDocument.fullscreenElement = mockCanvas;
mockElements.armoryModal.style.display = 'flex';
state.armoryModalOpen = true;
exitFullScreenCalls = 0;
let closeArmoryCalled = false;
window.__tronCloseArmory = () => {
  closeArmoryCalled = true;
  mockElements.armoryModal.style.display = 'none';
  state.armoryModalOpen = false;
};

onDown({ code: 'Escape', preventDefault: () => {} });
assert.strictEqual(closeArmoryCalled, true, 'Escape must close armoryModal');
assert.strictEqual(mockElements.armoryModal.style.display, 'none', 'Armory modal display must be none');
assert.strictEqual(exitFullScreenCalls, 0, 'Escape dismissing armory modal must NOT exit fullscreen');
console.log('✓ armoryModal cleanly intercepts Escape before root fullscreen exit');

// 5f: Auth Modal Isolation (Must NOT dismiss on Escape)
resetState();
isFullScreenMock = true;
mockDocument.fullscreenElement = mockCanvas;
mockElements.authModal.style.display = 'flex';
state.authModalOpen = true;
exitFullScreenCalls = 0;

onDown({ code: 'Escape', preventDefault: () => {} });
assert.strictEqual(state.authModalOpen, true, 'authModalOpen must remain true (isolation preserved)');
assert.strictEqual(mockElements.authModal.style.display, 'flex', 'authModal element must remain flex');
assert.strictEqual(exitFullScreenCalls, 0, 'Escape inside authModal must NOT exit fullscreen');
console.log('✓ authModal strict isolation preserved against accidental Escape dismissal');

console.log('\n======================================================');
console.log('ALL GAME OVER & ESCAPE FLOW REMEDIATION TESTS PASSED! 🎉');
console.log('======================================================');
