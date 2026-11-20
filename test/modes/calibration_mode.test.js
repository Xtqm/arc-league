import assert from 'assert';
import { CalibrationMode } from '../../src/modes/CalibrationMode.js';
import { state } from '../../src/core/state.js';
import { storageManager } from '../../src/core/storage/StorageManager.js';
import { economyManager } from '../../src/economy/EconomyManager.js';

console.log('--- Running CalibrationMode Unit & State Machine Test Suite ---');

// Mock scene and audio hooks for Node test environment
globalThis.window = globalThis.window || {};
window.__tronEnterLobby = () => { state.gameMode = 'lobby'; };

// Ensure storage initialized
storageManager.load();
storageManager.set('calibration_completed', false, { immediate: true });
storageManager.set('player.currency.bits', 50, { immediate: true });

const mode = new CalibrationMode();

// Test 1: Start Calibration
console.log('\n[Test 1] Testing Calibration initialization & state machine...');
mode.start();
assert.strictEqual(state.gameMode, 'calibration', 'Game mode must be calibration');
assert.strictEqual(mode.beat, 1, 'Initial beat must be Beat 1');
assert.strictEqual(state.player.hp, 100, 'Player HP must be reset to 100');
assert.strictEqual(state.foes.length, 1, 'Exactly 1 drone must be spawned in Beat 1');
assert.strictEqual(state.foes[0].isCalibrationTarget, true, 'Spawned foe must be calibration target');
assert.strictEqual(state.foes[0].pos.z, -1, 'Beat 1 target must be 15 units ahead at z=-1');
console.log('✓ Calibration mode initialized cleanly with Beat 1 target');

// Test 2: Beat 1 Destruction -> Beat 2 Transition
console.log('\n[Test 2] Testing Beat 1 destruction and Beat 2 transition...');
mode.destroyTarget(state.foes[0]);
mode.startBeat2();
assert.strictEqual(mode.beat, 2, 'Must advance to Beat 2');
assert.strictEqual(state.foes.length, 1, 'Beat 2 must spawn second drone');
assert.strictEqual(state.foes[0].pos.z, -12, 'Beat 2 drone must be at z=-12');
console.log('✓ Beat 1 target destruction smoothly transitions to Beat 2');

// Test 3: Beat 2 Incoming Volley & Slow-mo Parry Deflection
console.log('\n[Test 3] Testing Beat 2 incoming volley and slow-mo...');
// Simulate volley timer firing
mode.update(1.0);
assert.strictEqual(mode.volleyFired, true, 'Volley must fire');
// Simulate parry deflection
mode.onDiscDeflected();
assert.strictEqual(state.timeScale, 1.0, 'TimeScale must return to 1.0 on deflection');
assert.strictEqual(state.slowMoActive, false, 'SlowMo must be inactive on deflection');
console.log('✓ Beat 2 incoming volley and parry deflection verified');

// Test 4: Beat 3 Obstacle Curve Navigation
console.log('\n[Test 4] Testing Beat 3 curve and ricochet navigation...');
mode.startBeat3();
assert.strictEqual(mode.beat, 3, 'Must advance to Beat 3');
assert.strictEqual(state.foes.length, 1, 'Beat 3 must deploy obstacle target');
assert.strictEqual(state.foes[0].pos.x, 7, 'Beat 3 target placed behind obstacle at x=7');
console.log('✓ Beat 3 target spawned cleanly');

// Test 5: Calibration Completion Rewards
console.log('\n[Test 5] Testing Calibration completion rewards (Bits, Star, Flag)...');
const initialBits = economyManager.getCredits();
mode.complete();

assert.strictEqual(mode.beat, 'completed', 'Mode beat must be completed');
assert.strictEqual(storageManager.get('calibration_completed'), true, 'Persistent calibration_completed must be true');
assert.strictEqual(storageManager.get('calibration_bypassed'), true, 'Persistent calibration_bypassed must be true on completion');

const finalBits = economyManager.getCredits();
assert.strictEqual(finalBits, initialBits + 100, 'Must deposit exactly 100 Arc Bits');

const level1Record = storageManager.get('campaign.levelRecords.level_01_01');
assert.ok(level1Record, 'Grid 01 Level 1 record must exist');
assert.strictEqual(level1Record.completed, true, 'Grid 01 Level 1 must be marked completed');
assert.ok(level1Record.stars >= 1, 'Grid 01 Level 1 must have at least 1 star');
assert.ok(storageManager.get('campaign.starsEarned') >= 1, 'Total stars earned must be at least 1');
console.log('✓ Calibration completion successfully awarded 100 Arc Bits, Grid 01 Star 1, and calibration_completed=true');

// Test 6: Calibration Bypass
console.log('\n[Test 6] Testing Calibration Bypass escape hatch...');
storageManager.set('calibration_completed', false, { immediate: true });
storageManager.set('calibration_bypassed', false, { immediate: true });
mode.start();
assert.strictEqual(state.gameMode, 'calibration');
assert.strictEqual(state.foes.length, 1);
mode.bypass();
assert.strictEqual(state.foes.length, 0, 'Bypass must cleanly clear active calibration entities');
assert.strictEqual(state.timeScale, 1.0, 'Bypass must restore timeScale to 1.0');
assert.strictEqual(storageManager.get('calibration_bypassed'), true, 'Persistent calibration_bypassed must be true on bypass');
assert.strictEqual(storageManager.get('calibration_completed'), false, 'Bypass must not set calibration_completed');
console.log('✓ Calibration bypass terminates cleanly and clears entities');

console.log('\n======================================================');
console.log('ALL CALIBRATION MODE TESTS PASSED (100% SUCCESS)');
console.log('======================================================');
