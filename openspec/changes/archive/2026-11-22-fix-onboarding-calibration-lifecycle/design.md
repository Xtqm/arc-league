# Design

## Context

See `proposal.md` for motivation.

Branch `change/onboarding-calibration-lifecycle` previously linked `CalibrationMode` into `CampaignHUD.launchTrial('level_01_01')`. However, it bypassed `CampaignManager`, causing:
1. `saveStateToRow` to drop `calibration_completed` and `calibration_bypassed` during cloud synchronization.
2. `CalibrationMode.complete()` to unconditionally award 100 Arc Bits on repeat clears.
3. Hardcoded 1-star awards, making Star 2 and Star 3 on `level_01_01` mathematically impossible.
4. Sector hazard and arena theme leakage from previously inspected Grids.
5. Inability to access `TrialDebriefModal`, kicking the player directly to the 3D lobby after 1.2s and misrouting ESC to lobby bypass.

## Goals / Non-Goals

**Goals:**
- Maintain Supabase cloud sync parity by serializing `calibration_completed` and `calibration_bypassed` in `saveStateToRow`.
- Prune lingering hazard meshes and enforce `grid_01` arena theme prior to starting `level_01_01`.
- Integrate `CalibrationMode` with `CampaignManager.startTrial()` and `CampaignManager.completeTrial()` when launched as `level_01_01`.
- Track live trial telemetry (elapsed time, integrity/HP, precision hits) during the 3 calibration beats to support full 1-3 star evaluation via `StarEvaluator`.
- Enforce standard Campaign economy payouts (100 Bits on first clear, 25 Bits on repeat clear) for `level_01_01`.
- Display `TrialDebriefModal` upon `level_01_01` completion with standard navigation buttons ("NEXT TRIAL" / "RETURN TO GRID").
- Route ESC to standard Campaign Pause when playing `level_01_01`, while keeping `[ESC] BYPASS TO LOBBY` during cold-open boot.
- Preserve the cold-open boot tutorial's standalone intro flow (100 Bits + Star 1, direct lobby transition).

**Non-Goals:**
- Changing the underlying 3-beat combat tutorial mechanics (disc throw, parry deflection, curve targeting).
- Altering star criteria or difficulty thresholds for subsequent campaign levels (`level_01_02`+).
- Modifying desktop IPC profile hydration architecture.

## Decisions

### Decision 1: Serialization Parity in `saveStateToRow`
- **Approach**: In `src/core/storage/CloudSyncResolver.js`, update `saveStateToRow(saveState)` to explicitly include `calibration_completed: normalized.calibration_completed` and `calibration_bypassed: normalized.calibration_bypassed`.
- **Rationale**: `rowToSaveState` already reads these columns from Supabase rows, and `normalizeSaveState` already defines them. Adding them to `saveStateToRow` completes bidirectional round-trip cloud persistence.
- **Alternatives Considered**: Storing calibration flags inside a generic settings or stats blob. Rejected because schema and tests already expect first-class boolean columns.

### Decision 2: Sector Arena Teardown and Theme Reset
- **Approach**: In `src/ui/campaign/CampaignHUD.js`, ensure `launchTrial(levelId)` invokes `teardownSectorArena()` and `window.__tronApplySectorArena('grid_01')` before initiating `level_01_01`.
- **Rationale**: If a user inspects Grid 02 or Grid 03 (which spawn dynamic laser grids, void tiles, and custom materials), those 3D meshes persist in the scene. Tearing them down and applying `grid_01` resets the arena cleanly.

### Decision 3: Dual-Mode Execution in `CalibrationMode` (`isCampaign` Context)
- **Approach**: 
  - `CalibrationMode.start(options = {})` accepts an options object: `{ isCampaign: false }`.
  - When `CampaignHUD.launchTrial('level_01_01')` runs:
    - Calls `this.manager.startTrial('level_01_01')`.
    - Sets `state.gameMode = 'campaign'` and `state.campaignLevelId = 'level_01_01'`.
    - Passes `{ isCampaign: true }` into `calibrationMode.start({ isCampaign: true })`.
  - When Beat 3 completes:
    - Sets `calibration_completed = true` and `calibration_bypassed = true`.
    - If `isCampaign === true`:
      - Dispatches `completeCampaignTrial()` with collected telemetry (`elapsedSeconds`, `finalHp`, `precisionHits`).
      - `CampaignManager.completeTrial()` evaluates 1-3 stars, updates `StorageManager` level records and stars earned monotonically, applies 100 first-clear or 25 repeat-clear Bit payouts via `EconomyManager`, and calls `trialDebriefModal.show(outcome)`.
    - If `isCampaign === false` (cold boot):
      - Awards 100 Arc Bits and Star 1 baseline in storage.
      - Displays message and achievement fanfare.
      - Transitions to lobby after 1200ms.
- **Rationale**: Separates tutorial onboarding from structured campaign trial progression without duplicating the 3-beat tutorial logic.

### Decision 4: Telemetry Aggregation for Calibration Gauntlet
- **Approach**:
  - In `CalibrationMode`:
    - Record `startTime = Date.now()` at start of Beat 1.
    - Track player damage (HP decreases if player is struck by Beat 2 disc).
    - Track `precisionHits`: increment when Beat 2 parry deflection successfully strikes Drone 2, and increment when Beat 3 curve disc strikes Drone 3.
  - Telemetry payload passed to `CampaignManager.completeTrial()`:
    ```javascript
    {
      elapsedSeconds: (Date.now() - this.startTime) / 1000,
      finalHp: state.player.hp,
      maxHp: state.player.maxHp || 100,
      precisionHits: this.precisionHits
    }
    ```
- **Rationale**: Enables `StarEvaluator` to score `level_01_01` against its thresholds: Star 1 (cleared), Star 2 ($\ge 75\%$ HP), Star 3 ($\le 45$s OR $\ge 2$ precision hits). A proficient clear easily earns 3 stars.

### Decision 5: Contextual Escape / Pause Routing
- **Approach**:
  - In `src/input/keyboard.js`:
    ```javascript
    if (state.gameMode === 'calibration' && c === 'Escape' && !state.campaignLevelId) {
      e.preventDefault();
      if (typeof window !== 'undefined' && window.__tronBypassCalibration) {
        window.__tronBypassCalibration();
      }
      return;
    }
    ```
  - When `state.campaignLevelId === 'level_01_01'` (or `state.gameMode === 'campaign'`), pressing ESC falls through to `window.__tronPauseGame()`.
- **Rationale**: Prevents players from unintentionally dumping out to the lobby when they intended to pause or abandon a campaign trial.

## Risks / Trade-offs

- **[Risk]**: Replaying `level_01_01` after already having completed calibration could trigger unwanted tutorial HUD tooltips.
  $\rightarrow$ **Mitigation**: Calibration HUD tooltips are beat-specific instructions ("STRIKE TARGET", "DEFLECT PROJECTILE", "APPLY CURVE SPIN") which provide essential context for how to advance the beats during the trial.
- **[Risk]**: Cold boot players could bypass calibration and then earn 100 bits on first campaign clear.
  $\rightarrow$ **Mitigation**: Intended behavior. Bypassing does not award bits; completing `level_01_01` for the first time in Campaign awards the 100 bits first-clear reward once. Repeat clears strictly yield 25 bits.
