import assert from 'assert';
import { CampaignHUD } from '../../src/ui/campaign/CampaignHUD.js';
import { CampaignRegistry } from '../../src/campaign/CampaignRegistry.js';
import { CampaignManager } from '../../src/campaign/CampaignManager.js';
import { calibrationMode } from '../../src/modes/CalibrationMode.js';
import { state } from '../../src/core/state.js';
import { storageManager } from '../../src/core/storage/StorageManager.js';
import { economyManager } from '../../src/economy/EconomyManager.js';
import { onDown } from '../../src/input/keyboard.js';

console.log('--- Running Campaign Trial Lifecycle Test Suite (level_01_01 Calibration) ---');

// Mock browser/DOM environment for Node
globalThis.window = globalThis.window || {};
window.__tronEnterLobby = () => { state.gameMode = 'lobby'; };
window.__tronStartCalibration = (opts) => calibrationMode.start(opts);

let teardownCalled = false;
let appliedArenaGrid = null;
window.__tronTeardownSectorArena = () => { teardownCalled = true; };
window.__tronApplySectorArena = (gridId) => { appliedArenaGrid = gridId; };

let debriefOutcome = null;
window.__tronShowTrialDebrief = (result) => { debriefOutcome = result; };

let pauseCalled = false;
window.__tronPauseGame = () => { pauseCalled = true; };

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

// Test 1: launchTrial('level_01_01') resets arena hazards, applies grid_01, initializes trial, and starts calibration in campaign mode
console.log('\n[Test 1] Testing level_01_01 arena reset, trial initialization, and routing to CalibrationMode.start({ isCampaign: true })...');
teardownCalled = false;
appliedArenaGrid = null;
hud.launchTrial('level_01_01');

assert.strictEqual(teardownCalled, true, 'teardownSectorArena must be invoked before starting level_01_01');
assert.strictEqual(appliedArenaGrid, 'grid_01', 'window.__tronApplySectorArena must be called with grid_01');
assert.strictEqual(launchedLevel, 'level_01_01', 'Launch trial callback must receive level_01_01');
assert.strictEqual(state.gameMode, 'campaign', 'Game mode must remain campaign');
assert.strictEqual(state.campaignLevelId, 'level_01_01', 'Campaign level ID must be level_01_01');
assert.ok(manager.getActiveTrial(), 'CampaignManager trial session must be active for level_01_01');
assert.strictEqual(calibrationMode.beat, 1, 'Calibration must initialize at Beat 1');
assert.strictEqual(calibrationMode.isCampaign, true, 'CalibrationMode must receive isCampaign: true');
assert.strictEqual(state.foes.length, 1, 'Beat 1 drone must be active');
assert.strictEqual(state.foes[0].isCalibrationTarget, true, 'Drone must be calibration target');
console.log('✓ level_01_01 successfully cleaned up arena and initialized active trial session in CalibrationMode');

// Test 2: Progress through the 3-beat calibration gauntlet and verify precision hits tracking
console.log('\n[Test 2] Simulating 3-beat gauntlet progression and precision telemetry...');

// Beat 1 completion
calibrationMode.destroyTarget(state.foes[0]);
calibrationMode.startBeat2();
assert.strictEqual(calibrationMode.beat, 2, 'Must advance to Beat 2');

// Beat 2 completion via parry deflection
calibrationMode.update(1.0);
calibrationMode.onDiscDeflected();
assert.strictEqual(calibrationMode.precisionHits, 1, 'Beat 2 deflection parry must record precisionHit');
calibrationMode.startBeat3();
assert.strictEqual(calibrationMode.beat, 3, 'Must advance to Beat 3');

// Beat 3 completion via curve throw target destruction
const initialBits = economyManager.getCredits();
debriefOutcome = null;
calibrationMode.destroyTarget(state.foes[0]);

assert.strictEqual(calibrationMode.beat, 'completed', 'Calibration beat must be completed');
assert.strictEqual(calibrationMode.precisionHits, 2, 'Beat 3 curve throw must record second precisionHit (total 2)');
console.log('✓ 3-beat gauntlet executed to completion with 2/2 precision hits tracked');

// Test 3: Verify first-clear rewards, 3 Stars, TrialDebriefModal, and level_01_02 unlock
console.log('\n[Test 3] Verifying 3-Star evaluation, first-clear payout (100 Bits), and debrief modal render...');

assert.ok(debriefOutcome, 'TrialDebriefModal must be invoked with outcome payload');
assert.strictEqual(debriefOutcome.success, true, 'Debrief outcome must report success');
assert.strictEqual(debriefOutcome.stars, 3, 'Proficient clear must earn 3 Stars');
assert.strictEqual(debriefOutcome.firstTimeClear, true, 'Must be identified as first-time clear');
assert.strictEqual(debriefOutcome.rewards.bits, 100, 'First-clear payout must be 100 Arc Bits');

const finalBits = economyManager.getCredits();
assert.strictEqual(finalBits, initialBits + 100, 'EconomyManager must deposit exactly 100 Arc Bits on first clear');

// calibration_completed & calibration_bypassed set to true
assert.strictEqual(storageManager.get('calibration_completed'), true, 'calibration_completed must be true');
assert.strictEqual(storageManager.get('calibration_bypassed'), true, 'calibration_bypassed must be true');

// Grid 01 Level 1 record in campaign storage
const record = storageManager.get('campaign.levelRecords.level_01_01');
assert.ok(record, 'level_01_01 levelRecord must exist');
assert.strictEqual(record.completed, true, 'level_01_01 must be marked completed');
assert.strictEqual(record.stars, 3, 'level_01_01 must record 3 stars in storage');
assert.strictEqual(storageManager.get('campaign.starsEarned'), 3, 'Total campaign starsEarned must be 3');

// Unlocked nodes includes level_01_02
const completedNodes = storageManager.get('campaign.completedNodes', []);
assert.ok(completedNodes.includes('level_01_01'), 'completedNodes must include level_01_01');

const unlockedNodes = storageManager.get('campaign.unlockedNodes', []);
assert.ok(unlockedNodes.includes('level_01_02'), 'unlockedNodes must include level_01_02');

console.log('✓ 3 Stars evaluated, 100 Arc Bits first-clear awarded, debrief modal shown, level_01_02 unlocked');

// Test 4: Replay level_01_01 and verify repeat-clear payout (25 Bits, no 100 Bits exploit)
console.log('\n[Test 4] Verifying level replay awards repeat-clear payout (25 Bits) instead of 100 Bits...');
hud.launchTrial('level_01_01');
calibrationMode.destroyTarget(state.foes[0]);
calibrationMode.startBeat2();
calibrationMode.onDiscDeflected();
calibrationMode.startBeat3();

const preRepeatBits = economyManager.getCredits();
debriefOutcome = null;
calibrationMode.destroyTarget(state.foes[0]);

assert.ok(debriefOutcome, 'Debrief modal must be invoked on repeat clear');
assert.strictEqual(debriefOutcome.firstTimeClear, false, 'Must identify as repeat clear');
assert.strictEqual(debriefOutcome.rewards.bits, 20, 'Repeat clear payout must be exactly 20 AC');
const postRepeatBits = economyManager.getCredits();
assert.strictEqual(postRepeatBits, preRepeatBits + 20, 'EconomyManager must award 20 AC on repeat clear (exploit eliminated)');
console.log('✓ Repeat clear correctly awarded 20 AC (infinite 100 AC exploit eliminated)');

// Test 5: Contextual Escape Key handling
console.log('\n[Test 5] Testing contextual Escape key handling...');
// 5a: During Campaign level_01_01, ESC triggers pause, NOT lobby bypass
hud.launchTrial('level_01_01');
pauseCalled = false;
state.lastPauseToggle = performance.now() - 1000;
let bypassTriggered = false;
window.__tronBypassCalibration = () => { bypassTriggered = true; };

onDown({ code: 'Escape', preventDefault: () => {} });
assert.strictEqual(bypassTriggered, false, 'ESC in Campaign level_01_01 must NOT trigger calibration bypass');
assert.strictEqual(pauseCalled, true, 'ESC in Campaign level_01_01 must trigger standard game pause');

// 5b: During cold-open boot calibration (no campaignLevelId), ESC triggers bypass to lobby
state.gameMode = 'calibration';
state.campaignLevelId = null;
state.running = true;
state.paused = false;
storageManager.set('calibration_bypassed', false, { immediate: true });
storageManager.set('calibration_completed', false, { immediate: true });
bypassTriggered = false;

onDown({ code: 'Escape', preventDefault: () => {} });
assert.strictEqual(bypassTriggered, true, 'ESC during cold-open boot calibration must trigger bypass to lobby');
console.log('✓ Escape key contextualization verified: pauses in Campaign, bypasses to lobby on cold open');

// Test 6: Verify standard trial (level_01_02) launches standard campaign flow
console.log('\n[Test 6] Verifying standard trial (level_01_02) launches standard campaign flow...');
hud.launchTrial('level_01_02');
assert.strictEqual(state.gameMode, 'campaign', 'Game mode must be campaign for level_01_02');
assert.strictEqual(state.campaignLevelId, 'level_01_02', 'Campaign level ID must be level_01_02');
assert.ok(manager.getActiveTrial(), 'CampaignManager trial session must be active');
console.log('✓ Standard trial launches standard campaign trial session');

console.log('\n======================================================');
console.log('ALL CAMPAIGN TRIAL LIFECYCLE TESTS PASSED (100% SUCCESS)');
console.log('======================================================');
