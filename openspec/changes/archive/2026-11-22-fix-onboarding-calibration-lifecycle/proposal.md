# Proposal

## Why

A code review of branch `change/onboarding-calibration-lifecycle` identified 5 merge-blocking defects that cause cloud sync state drops, an infinite 100 Arc Bits currency exploit on level replay, mathematically impossible 100% Star Mastery on Grid 01, visual/hazard arena leakage, and a broken Campaign debrief flow. Remediating these issues now is necessary before merging the onboarding calibration lifecycle change into `main`.

## What Changes

- **Cloud Sync Serialization**: Update `CloudSyncResolver.saveStateToRow` to serialize `calibration_completed` and `calibration_bypassed` to the Supabase database row payload, preventing remote save-state restores and multi-device sync from dropping onboarding flags.
- **Unified Campaign Trial Execution for Level 01_01**:
  - Route `level_01_01` ("Boot Diagnostic") launches from `CampaignHUD` through `CampaignManager.startTrial()`, setting `state.gameMode = 'campaign'` and `state.campaignLevelId = 'level_01_01'`.
  - Invoke `teardownSectorArena()` and `applySectorArena('grid_01')` prior to trial start to prevent lingering hazard meshes (lasers, void traps) from previous grids.
  - Track combat trial telemetry across the 3 beats: elapsed time, final HP/integrity ratio, and precision hits (parry deflection in Beat 2 + curve hit in Beat 3).
  - Delegate `level_01_01` completion to `campaignManager.completeTrial(telemetry)`:
    - Evaluates 1 to 3 Stars via `StarEvaluator` using the defined thresholds (time $\le 45$s, integrity $\ge 75\%$, precision hits $\ge 2$).
    - Pays 100 Arc Bits on first clear and 25 Arc Bits on repeat clear, eliminating the infinite 100 Arc Bits exploit.
    - Displays `TrialDebriefModal` with standard navigation buttons ("NEXT TRIAL" / "RETURN TO GRID").
  - Contextualize the Escape key: when in Campaign mode, pressing ESC opens the standard Campaign Pause Menu rather than bypassing directly to the lobby.
- **Preserved Cold-Open Boot Flow**:
  - Cold-open boot tutorial retains its standalone completion flow: awards 100 Bits and Star 1 baseline, marks flags, plays achievement fanfare, and transitions directly to the 3D lobby after 1.2s.
  - Pressing ESC during cold boot continues to trigger `[ESC] BYPASS TO LOBBY`.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `core-storage`: Ensure `saveStateToRow` serializes `calibration_completed` and `calibration_bypassed` to maintain persistence integrity during remote upserts and multi-device sync.
- `onboarding-calibration`: Specify the dual-mode execution of the calibration gauntlet (standalone cold-open boot vs unified Campaign trial) and contextual escape/pause handling.
- `campaign-progression`: Specify that `level_01_01` ("Boot Diagnostic") executes via `CampaignManager` trial lifecycle orchestration, evaluating 1 to 3 stars against star thresholds, awarding first-clear vs repeat-clear payouts, resetting sector arena hazards, and presenting the trial debrief modal.

## Impact

- `src/core/storage/CloudSyncResolver.js`: Add `calibration_completed` and `calibration_bypassed` to `saveStateToRow`.
- `src/ui/campaign/CampaignHUD.js`: Clean up arena hazards and initialize trial via `CampaignManager` when launching `level_01_01`.
- `src/modes/CalibrationMode.js`: Accept campaign context, collect trial telemetry during the 3 beats, and delegate completion to `CampaignManager.completeTrial` when in campaign mode.
- `src/input/keyboard.js`: Condition the bypass escape hatch on non-campaign execution so ESC pauses the game during `level_01_01`.
- `test/storage/cloud_sync_resolver.test.js`: Add unit tests for `saveStateToRow` and round-trip restoration of calibration flags.
- `test/campaign/campaign_trial_lifecycle.test.js` & `test/modes/calibration_mode.test.js`: Verify multi-star evaluation, repeat clear payout limits, arena teardown, and debrief modal presentation.
