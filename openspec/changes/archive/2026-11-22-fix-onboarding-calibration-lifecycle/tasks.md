# Tasks

## 1. Cloud Sync Persistence Parity

- [x] 1.1 In `src/core/storage/CloudSyncResolver.js`, update `saveStateToRow` to serialize `calibration_completed` and `calibration_bypassed`, and verify with `node test/storage/cloud_sync_resolver.test.js`.
- [x] 1.2 In `test/storage/cloud_sync_resolver.test.js`, add assertions verifying bidirectional serialization and round-trip restoration of `calibration_completed` and `calibration_bypassed` between `saveStateToRow` and `rowToSaveState`.

## 2. Sector Arena Lifecycle & Hazard Teardown

- [x] 2.1 In `src/ui/campaign/CampaignHUD.js`, update `launchTrial('level_01_01')` to invoke `teardownSectorArena()` and `window.__tronApplySectorArena('grid_01')` prior to starting calibration, and verify that hazards from previous grids do not persist into `level_01_01`.

## 3. Campaign Trial Integration & Telemetry in CalibrationMode

- [x] 3.1 In `src/modes/CalibrationMode.js`, update `start(options)` to accept `{ isCampaign: false }`, initialize `startTime`, and track `precisionHits` during Beat 2 (deflection parry) and Beat 3 (curve throw).
- [x] 3.2 In `src/modes/CalibrationMode.js`, update `complete()` to set `calibration_completed = true` and `calibration_bypassed = true`, and when `isCampaign` is true, pass collected telemetry to `completeCampaignTrial()` (or `campaignManager.completeTrial()`), verifying `trialDebriefModal.show()` renders with 1-3 stars and standard first-clear (100) vs repeat-clear (25) Bit payouts.
- [x] 3.3 In `src/ui/campaign/CampaignHUD.js`, update `launchTrial('level_01_01')` to initialize the trial via `this.manager.startTrial('level_01_01')`, set `state.gameMode = 'campaign'` and `state.campaignLevelId = 'level_01_01'`, and call `calibrationMode.start({ isCampaign: true })`.

## 4. Contextual Escape Key Handling

- [x] 4.1 In `src/input/keyboard.js`, update the calibration bypass handler to check `!state.campaignLevelId`, ensuring ESC during Campaign `level_01_01` opens the standard Campaign Pause Menu rather than bypassing directly to the 3D lobby.
- [x] 4.2 Verify cold-open boot continues to support `[ESC] BYPASS TO LOBBY` with immediate lobby transition and persistent bypass tracking.

## 5. Integration Verification

- [x] 5.1 Run all targeted test suites (`test/campaign/campaign_trial_lifecycle.test.js`, `test/modes/boot_terminal_lifecycle.test.js`, `test/modes/calibration_mode.test.js`, `test/storage/cloud_sync_resolver.test.js`) and verify all pass.
- [x] 5.2 Execute full test runner (`node test/runner.js`) across all 72 test domains and verify 100% pass rate.
