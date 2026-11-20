# Tasks

## 1. Storage Schema & Persistent Bypass Flag

- [x] 1.1 Add `calibration_bypassed: false` to `DEFAULT_SAVE_STATE` and `createDefaultSaveState()` in `src/core/storage/schema.js`, and verify with `node --test test/storage/storage_manager.test.js`.
- [x] 1.2 Update `src/core/storage/CloudSyncResolver.js` to normalize and merge `calibration_bypassed` monotonically (`local.calibration_bypassed || cloud.calibration_bypassed`), and verify with `node --test test/storage/cloud_sync_resolver.test.js`.
- [x] 1.3 Update `CalibrationMode.bypass()` in `src/modes/CalibrationMode.js` to set `calibration_bypassed: true` via `storageManager`, ensure `complete()` also sets `calibration_bypassed: true`, and verify with `node test/modes/calibration_mode.test.js`.

## 2. Boot Terminal Evaluation & Hydration Synchronization

- [x] 2.1 Update `initBootTerminal()` in `src/core/main.js` to evaluate `storageManager.get('calibration_completed', false) || storageManager.get('calibration_bypassed', false)`, ensuring interrupted uncompleted attempts without bypass continue to present the boot terminal.
- [x] 2.2 Sequence `initBootTerminal()` execution with `authReady` in `src/core/main.js` so asynchronous desktop profile hydration settles before boot terminal suppression is evaluated.
- [x] 2.3 Add unit tests covering boot terminal suppression when `calibration_bypassed` is true, and verify uncompleted attempts without bypass re-encounter the boot terminal.

## 3. Circuit League On-Demand Calibration Stage

- [x] 3.1 Update `src/ui/campaign/CampaignHUD.js` `launchTrial()` to route `level_01_01` ("Boot Diagnostic") directly to `calibrationMode.start()`, and verify mission brief launch transitions to CalibrationMode.
- [x] 3.2 Verify completion of the 3-beat calibration gauntlet from the campaign stage awards 100 Arc Bits, sets `calibration_completed: true`, grants Grid 01 Star 1 in campaign progression, and unlocks `level_01_02`.
- [x] 3.3 Add automated campaign test coverage in `test/campaign/campaign_trial_lifecycle.test.js` verifying `level_01_01` launches CalibrationMode and credits campaign records upon Beat 3 completion.

## 4. End-to-End Verification

- [x] 4.1 Run the full test suite (`npm test`) to verify all unit, integration, and state machine tests pass cleanly.
- [x] 4.2 Verify boot behavior across initial launch, explicit bypass, interrupted launch, and on-demand replay from Circuit League.

## Workflow follow-up

- Create git change branch `change/onboarding-calibration-lifecycle`.
- Apply and verify implementation tasks using `openspec-apply-change`.
