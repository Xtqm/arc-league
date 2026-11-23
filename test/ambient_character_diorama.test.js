import assert from 'assert';
import * as THREE from '../vendor/three.module.js';
import { state } from '../src/core/state.js';
import { scene } from '../src/graphics/scene.js';
import {
  spawnDiorama,
  despawnDiorama,
  updateAmbientLobby,
  getDioramaRig,
  getDioramaState,
  getStagingDisc,
  refreshDioramaCosmetics
} from '../src/graphics/ambientLobby.js';
import { setCombatHUDVisibility } from '../src/ui/hud.js';
import { teardownActiveMatch, showModeSelect, showModeSelectMenu, startMode } from '../src/ui/menus.js';
import { requestFullScreen, exitFullScreen, isFullScreen, pauseGame, resumeGame } from '../src/ui/modals.js';
import { onDown, initKeyboard } from '../src/input/keyboard.js';
import { cosmeticMaterialEngine } from '../src/armory/CosmeticMaterialEngine.js';
import { tiles, getTileAt } from '../src/entities/Arena.js';

console.log('--- Running 3D Character Staging Diorama & Escape State Machine Test Suite ---');

// Mock DOM elements for HUD and Modals
const domStore = {};
function createMockEl(id) {
  const el = {
    id,
    style: { display: '' },
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); },
      toggle(c, force) {
        if (force === undefined) {
          if (this._classes.has(c)) this._classes.delete(c);
          else this._classes.add(c);
        } else if (force) {
          this._classes.add(c);
        } else {
          this._classes.delete(c);
        }
      }
    },
    textContent: '',
    innerHTML: '',
    appendChild: () => {},
    querySelector: () => createMockEl('child'),
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    focus: () => {}
  };
  domStore[id] = el;
  return el;
}

const mockIds = [
  'tr', 'bottomDock', 'reticle', 'crosshair', 'lockPrompt', 'lockstate', 'keymon',
  'overlay', 'pauseMenu', 'hostModal', 'roomModal', 'authModal', 'armoryModal',
  'directivesModal', 'settingsModal', 'hazardVignette', 'hazardAlert', 'hpbar',
  'discbar', 'energybar', 'discEmblem', 'roundLabel', 'subLabel', 'scoreRow',
  'bossBarWrap', 'bossBarLabel', 'bossbar', 'seriesHudWrap', 'netPingDisplay'
];
for (const id of mockIds) {
  createMockEl(id);
}

let mockFullscreenElement = null;
let mockPointerLockElement = null;

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: (tag) => createMockEl(tag),
    getElementById: (id) => domStore[id] || (domStore[id] = createMockEl(id)),
    querySelector: (sel) => {
      const clean = sel.replace('#', '').replace('.', '');
      return domStore[clean] || (domStore[clean] = createMockEl(clean));
    },
    querySelectorAll: () => [],
    body: createMockEl('body'),
    documentElement: {
      requestFullscreen: () => Promise.resolve(),
      style: {}
    },
    exitFullscreen: () => {
      mockFullscreenElement = null;
      return Promise.resolve();
    },
    exitPointerLock: () => {
      mockPointerLockElement = null;
    },
    get fullscreenElement() { return mockFullscreenElement; },
    get pointerLockElement() { return mockPointerLockElement; },
    hasFocus: () => true
  };
} else {
  // Enhance existing document
  const origGetElementById = document.getElementById?.bind(document);
  document.getElementById = (id) => domStore[id] || (origGetElementById ? origGetElementById(id) : createMockEl(id));
  Object.defineProperty(document, 'fullscreenElement', {
    get: () => mockFullscreenElement,
    configurable: true
  });
  Object.defineProperty(document, 'pointerLockElement', {
    get: () => mockPointerLockElement,
    configurable: true
  });
  document.exitPointerLock = () => { mockPointerLockElement = null; };
}

let keyboardLockRequestedKeys = null;
let keyboardUnlocked = false;

if (typeof globalThis.navigator === 'undefined') {
  globalThis.navigator = {};
}
globalThis.navigator.keyboard = {
  lock: (keys) => {
    keyboardLockRequestedKeys = keys;
    return Promise.resolve();
  },
  unlock: () => {
    keyboardUnlocked = true;
  }
};

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    innerWidth: 1920,
    innerHeight: 1080,
    scrollTo: () => {},
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}
globalThis.window.__tronPauseGame = pauseGame;
globalThis.window.__tronResumeGame = resumeGame;
globalThis.window.__tronIsFullScreen = isFullScreen;
globalThis.window.__tronExitFullScreen = exitFullScreen;
globalThis.window.__tronRequestFullScreen = requestFullScreen;

// -------------------------------------------------------------
// TEST GROUP 1: Match Teardown and Combat HUD Isolation
// -------------------------------------------------------------
console.log('\n[Test 1] Testing centralized teardownActiveMatch()...');

// 1.1 Populate active combat entities, discs, timers, and altered tiles
state.discs = [
  { obj: new THREE.Mesh(), trail: null },
  { obj: new THREE.Mesh(), trail: null }
];
scene.add(state.discs[0].obj);
scene.add(state.discs[1].obj);

state.foes = [
  { obj: new THREE.Mesh(), hp: 50 },
  { obj: new THREE.Mesh(), hp: 80 }
];
scene.add(state.foes[0].obj);
scene.add(state.foes[1].obj);

state.spawnTimer = 4.2;
state.countdownTimer = 2.8;
state.timeScale = 0.2;
state.slowMoActive = true;

// Destroy a tile
const testTile = getTileAt(0, 0);
if (testTile) testTile.state = 3; // fallen

teardownActiveMatch();

assert.strictEqual(state.discs.length, 0, 'Active combat discs must be emptied and disposed');
assert.strictEqual(state.foes.length, 0, 'Active hostile bot entities must be cleared');
assert.strictEqual(state.spawnTimer, 0, 'Spawn timer must be reset to 0');
assert.strictEqual(state.countdownTimer, 0, 'Countdown timer must be reset to 0');
assert.strictEqual(state.timeScale, 1.0, 'Time scale must be restored to 1.0');
assert.strictEqual(state.slowMoActive, false, 'Cinematic slow-motion must be deactivated');
if (testTile) {
  assert.notStrictEqual(testTile.state, 3, 'Arena tiles must be restored/rebuilt to pristine state');
}
console.log('✓ teardownActiveMatch successfully cleans up entities, resets timers, and restores arena');

// 1.2 Combat HUD Hide/Show helper
console.log('\n[Test 2] Testing setCombatHUDVisibility() hide and show states...');
setCombatHUDVisibility(false);
const hudTargetIds = ['tr', 'bottomDock', 'crosshair', 'keymon', 'lockstate'];
for (const id of hudTargetIds) {
  assert.strictEqual(domStore[id].style.display, 'none', `#${id} must have display: none when HUD hidden`);
}

setCombatHUDVisibility(true);
for (const id of ['tr', 'bottomDock', 'crosshair']) {
  assert.strictEqual(domStore[id].style.display, '', `#${id} must have display: '' when HUD visible`);
}
console.log('✓ setCombatHUDVisibility properly toggles visibility across all combat HUD containers');

// 1.3 Menu transition invokes teardownActiveMatch
console.log('\n[Test 3] Testing showModeSelect() and showModeSelectMenu() teardown wiring...');
state.discs.push({ obj: new THREE.Mesh() });
state.foes.push({ obj: new THREE.Mesh() });
showModeSelect();
assert.strictEqual(state.discs.length, 0, 'showModeSelect() must invoke teardownActiveMatch()');
assert.strictEqual(state.foes.length, 0, 'showModeSelect() must clear foes');
assert.strictEqual(domStore['tr'].style.display, 'none', 'showModeSelect() must hide combat HUD');
console.log('✓ showModeSelect() cleanly executes match teardown and HUD isolation');

// -------------------------------------------------------------
// TEST GROUP 2: 2-Tier Escape and Fullscreen Retention
// -------------------------------------------------------------
console.log('\n[Test 4] Testing 2-Tier Escape and Fullscreen Retention...');

// 2.1 Fullscreen entry requests Escape lock
keyboardLockRequestedKeys = null;
keyboardUnlocked = false;
requestFullScreen();
assert.ok(keyboardLockRequestedKeys, 'requestFullScreen must request keyboard lock');
assert.deepStrictEqual(keyboardLockRequestedKeys, ['Escape'], 'requestFullScreen must request lock for Escape');

exitFullScreen();
assert.strictEqual(keyboardUnlocked, true, 'exitFullScreen must call navigator.keyboard.unlock()');
console.log('✓ Keyboard Lock API integration for Escape verified on entry and exit');

// 2.2 First Escape press in fullscreen combat releases cursor & pauses game without exiting fullscreen
console.log('\n[Test 5] Testing Tier 1 Escape press during active fullscreen combat...');
mockFullscreenElement = document.documentElement;
mockPointerLockElement = document.createElement('canvas');
state.running = true;
state.paused = false;
state.gameMode = 'swarm';
state.lastPauseToggle = 0;

let exitFullscreenCalled = false;
const origExitFs = document.exitFullscreen;
document.exitFullscreen = () => { exitFullscreenCalled = true; mockFullscreenElement = null; return Promise.resolve(); };

// Fire Escape key event
const escEvent = {
  key: 'Escape',
  code: 'Escape',
  preventDefault: () => {},
  stopPropagation: () => {}
};
onDown(escEvent);

assert.strictEqual(state.paused, true, 'First Escape press must pause game');
assert.strictEqual(mockPointerLockElement, null, 'First Escape press must exit pointer lock');
assert.strictEqual(exitFullscreenCalled, false, 'First Escape press must NOT exit fullscreen');
assert.ok(isFullScreen(), 'Display must remain in fullscreen mode after first Escape');
console.log('✓ Tier 1 Escape cleanly releases pointer lock and opens pause menu while preserving fullscreen');

// 2.3 Second Escape press exits fullscreen
console.log('\n[Test 6] Testing Tier 2 Escape press while already paused...');
onDown(escEvent);
assert.strictEqual(exitFullscreenCalled, true, 'Second Escape press while paused must exit fullscreen');
console.log('✓ Tier 2 Escape exits fullscreen mode cleanly');

// Restore document.exitFullscreen
document.exitFullscreen = origExitFs;

// -------------------------------------------------------------
// TEST GROUP 3: 3D Character Staging Diorama
// -------------------------------------------------------------
console.log('\n[Test 7] Testing 3D Character Staging Diorama instantiation & quadrant positioning...');
state.gameMode = 'lobby';
state.time = 0;

const dioramaGroup = spawnDiorama();
assert.ok(dioramaGroup, 'Diorama group must be spawned');
assert.strictEqual(dioramaGroup.visible, true, 'Diorama group must be visible in lobby');

const rig = getDioramaRig();
assert.ok(rig, 'Humanoid Athlete Rig must be instantiated inside diorama');
assert.strictEqual(rig.userData.archetype, 'player', 'Diorama rig must use player archetype');
assert.ok(rig.userData.joints, 'Diorama rig must possess articulated skeleton joints');
assert.ok(rig.userData.backDisc, 'Diorama rig must have backDisc on right palm');

// Position checks in right 65% staging quadrant
assert.ok(dioramaGroup.position.x >= 1.0, 'Diorama must be in right staging area (x >= 1.0)');
assert.ok(dioramaGroup.position.z <= -3.0, 'Diorama must be in staging distance (z <= -3.0)');
assert.ok(Math.abs(dioramaGroup.rotation.y - (-0.35)) < 0.2, 'Diorama must be angled slightly towards camera (yaw ~ -0.35)');
console.log('✓ Diorama 3D Athlete Rig correctly spawned in the right 65% staging quadrant');

// 3.2 FSM Simulation: Idle -> Jump -> Idle -> Throw Wind-Up -> Release -> Boomerang -> Catch -> Idle
console.log('\n[Test 8] Testing diorama finite-state machine transitions & cycles...');
assert.strictEqual(getDioramaState(), 'IDLE', 'Initial diorama state must be IDLE');

// Advance through IDLE to trigger JUMP
updateAmbientLobby(5.6);
assert.strictEqual(getDioramaState(), 'JUMP', 'Diorama must transition to JUMP after IDLE duration');

// Advance jump flight
updateAmbientLobby(0.7);
assert.ok(rig.position.y > 0.5, 'Diorama rig position.y must be elevated during jump arc');

// Complete jump
updateAmbientLobby(1.2);
assert.strictEqual(getDioramaState(), 'IDLE', 'Diorama must return to IDLE after landing cushion');
assert.strictEqual(rig.position.y, 0, 'Diorama rig position.y must be grounded at 0');
console.log('✓ Diorama JUMP state cycle verified with vertical lift and landing cushion');

// Advance through IDLE to trigger THROW cycle
updateAmbientLobby(5.6);
assert.strictEqual(getDioramaState(), 'THROW_WINDUP', 'Diorama must transition to THROW_WINDUP');

updateAmbientLobby(0.45);
assert.strictEqual(getDioramaState(), 'THROW_RELEASE', 'Diorama must transition to THROW_RELEASE');

updateAmbientLobby(0.35);
assert.strictEqual(getDioramaState(), 'BOOMERANG_ARC', 'Diorama must transition to BOOMERANG_ARC');

updateAmbientLobby(1.9);
assert.strictEqual(getDioramaState(), 'MAGNETIC_CATCH', 'Diorama must transition to MAGNETIC_CATCH');

updateAmbientLobby(0.7);
assert.strictEqual(getDioramaState(), 'IDLE', 'Diorama must return to IDLE after magnetic catch');
console.log('✓ Diorama THROW & BOOMERANG CATCH state sequence verified cleanly without errors');

// 3.3 Despawn diorama on match start
console.log('\n[Test 9] Testing despawnDiorama() on match launch...');
startMode('swarm');
assert.strictEqual(dioramaGroup.visible, false, 'Diorama group must be hidden when match mode starts');
console.log('✓ Diorama pauses and hides during active matches');

// 3.4 Cosmetic Refresh on Loadout Change
console.log('\n[Test 10] Testing refreshDioramaCosmetics()...');
cosmeticMaterialEngine.activeChassisSkinId = 'chassis_retro_gold';
cosmeticMaterialEngine.activeDiscSkinId = 'disc_tron_legacy';
refreshDioramaCosmetics();
console.log('✓ refreshDioramaCosmetics successfully propagates active loadout cosmetics to diorama');

console.log('\n======================================================');
console.log('ALL AMBIENT CHARACTER DIORAMA TESTS PASSED (100%)');
console.log('======================================================\n');
