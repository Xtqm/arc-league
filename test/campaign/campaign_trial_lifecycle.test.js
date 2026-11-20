import assert from 'assert';
import { CampaignHUD } from '../../src/ui/campaign/CampaignHUD.js';
import { CampaignRegistry } from '../../src/campaign/CampaignRegistry.js';
import { CampaignManager } from '../../src/campaign/CampaignManager.js';
import { calibrationMode } from '../../src/modes/CalibrationMode.js';
import { state } from '../../src/core/state.js';
import { storageManager } from '../../src/core/storage/StorageManager.js';
import { economyManager } from '../../src/economy/EconomyManager.js';

console.log('--- Running Campaign Trial Lifecycle Test Suite (level_01_01 Calibration) ---');

// Mock browser/DOM environment for Node
globalThis.window = globalThis.window || {};
window.__tronEnterLobby = () => { state.gameMode = 'lobby'; };
window.__tronStartCalibration = () => calibrationMode.start();

storageManager.load();
storageManager.set('calibration_completed', false, { immediate: true });
storageManager.set('calibration_bypassed', false, { immediate: true });
storageManager.set('player.currency.bits', 100, { immediate: true });
storageManager.set('campaign.completedNodes', [], { immediate: true });
storageManager.set('campaign.unlockedNodes', ['level_01_01'], { immediate: true });
storageManager.set('campaign.starsEarned', 0, { immediate: true });

const registry = new CampaignRegistry();
const manager = new CampaignManager({ storage: storageManager, registry });
const hud = new CampaignHUD({ registry, manager });

let launchedLevel = null;
hud.setOnLaunchTrial((levelId) => {
  launchedLevel = levelId;
});

// Test 1: launchTrial('level_01_01') routes directly to CalibrationMode.start()
console.log('\n[Test 1] Testing level_01_01 routing to CalibrationMode.start()...');
hud.launchTrial('level_01_01');

assert.strictEqual(launchedLevel, 'level_01_01', 'Launch trial callback must receive level_01_01');
assert.strictEqual(state.gameMode, 'calibration', 'Game mode must transition to calibration');
assert.strictEqual(calibrationMode.beat, 1, 'Calibration must initialize at Beat 1');
assert.strictEqual(state.foes.length, 1, 'Beat 1 drone must be active');
assert.strictEqual(state.foes[0].isCalibrationTarget, true, 'Drone must be calibration target');
console.log('✓ level_01_01 successfully routed to CalibrationMode.start()');

// Test 2: Progress through the 3-beat calibration gauntlet from campaign
console.log('\n[Test 2] Simulating 3-beat gauntlet progression...');

// Beat 1 completion
calibrationMode.destroyTarget(state.foes[0]);
calibrationMode.startBeat2();
assert.strictEqual(calibrationMode.beat, 2, 'Must advance to Beat 2');

// Beat 2 completion
calibrationMode.update(1.0);
calibrationMode.onDiscDeflected();
calibrationMode.startBeat3();
assert.strictEqual(calibrationMode.beat, 3, 'Must advance to Beat 3');

// Beat 3 completion -> complete()
const initialBits = economyManager.getCredits();
calibrationMode.complete();

assert.strictEqual(calibrationMode.beat, 'completed', 'Calibration beat must be completed');
console.log('✓ 3-beat gauntlet executed to completion');

// Test 3: Verify campaign rewards and records
console.log('\n[Test 3] Verifying progression awards, Star 1, Arc Bits, and level_01_02 unlock...');

// 100 Arc Bits awarded
const finalBits = economyManager.getCredits();
assert.strictEqual(finalBits, initialBits + 100, 'Must award exactly 100 Arc Bits');

// calibration_completed & calibration_bypassed set to true
assert.strictEqual(storageManager.get('calibration_completed'), true, 'calibration_completed must be true');
assert.strictEqual(storageManager.get('calibration_bypassed'), true, 'calibration_bypassed must be true');

// Grid 01 Star 1 in campaign storage
const record = storageManager.get('campaign.levelRecords.level_01_01');
assert.ok(record, 'level_01_01 levelRecord must exist');
assert.strictEqual(record.completed, true, 'level_01_01 must be marked completed');
assert.ok(record.stars >= 1, 'level_01_01 must have at least 1 star');
assert.ok(storageManager.get('campaign.starsEarned') >= 1, 'Total campaign starsEarned must be >= 1');

// Unlocked nodes includes level_01_02
const completedNodes = storageManager.get('campaign.completedNodes', []);
assert.ok(completedNodes.includes('level_01_01'), 'completedNodes must include level_01_01');

const unlockedNodes = storageManager.get('campaign.unlockedNodes', []);
assert.ok(unlockedNodes.includes('level_01_02'), 'unlockedNodes must include level_01_02');

console.log('✓ 100 Arc Bits, Star 1, calibration_completed, and level_01_02 unlocked verified cleanly');

// Test 4: Verify standard trial (level_01_02) launches standard campaign mode
console.log('\n[Test 4] Verifying standard trial (level_01_02) launches standard campaign flow...');
hud.launchTrial('level_01_02');
assert.strictEqual(state.gameMode, 'campaign', 'Game mode must be campaign for level_01_02');
assert.strictEqual(state.campaignLevelId, 'level_01_02', 'Campaign level ID must be level_01_02');
assert.ok(manager.getActiveTrial(), 'CampaignManager trial session must be active');
console.log('✓ Standard trial launches standard campaign trial session');

console.log('\n======================================================');
console.log('ALL CAMPAIGN TRIAL LIFECYCLE TESTS PASSED (100% SUCCESS)');
console.log('======================================================');
