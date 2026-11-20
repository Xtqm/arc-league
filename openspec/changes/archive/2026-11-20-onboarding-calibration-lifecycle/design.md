# Design

## Context

See `proposal.md` for the motivation behind this change.

Currently, `initBootTerminal()` checks strictly whether `storageManager.get('calibration_completed', false)` is true. If false, the cold-open `#bootTerminal` is rendered with `display: flex`, and any click fires `calibrationMode.start()`.

When a player clicks `[ESC / START] BYPASS TO LOBBY`, `calibrationMode.bypass()` terminates the combat entities and enters the lobby, but writes nothing to storage. On desktop (Electron), `authManager.init()` loads the profile asynchronously from disk (`loadProfile`), while `initBootTerminal()` executes synchronously before storage hydration completes. Furthermore, there is currently no menu entry point to trigger `calibrationMode.start()` other than the initial boot terminal.

## Goals / Non-Goals

**Goals:**
- Permanently remember player bypass choices via a dedicated persistent flag `calibration_bypassed`.
- Gate the cold-open `#bootTerminal` so it is bypassed if and only if the player has `calibration_completed: true` or `calibration_bypassed: true`.
- Support on-demand launching and replaying of the 3-beat calibration gauntlet from Grid 01 Stage 1 (`level_01_01`, "Boot Diagnostic") within the Circuit League.
- Ensure desktop Electron storage hydration completes prior to evaluating the boot terminal gating condition.
- Maintain test suite integrity across unit and state machine tests.

**Non-Goals:**
- Modifying the core 3-beat combat tutorial mechanics (disc throw, parry deflection, curve hook).
- Removing the cold-open boot terminal for genuine first-time players.
- Awarding completion rewards (100 Arc Bits, Grid 01 Star 1) upon bypass.

## Decisions

### Decision 1: Dedicated `calibration_bypassed` Persistent Flag
- **Approach**: Add `calibration_bypassed: false` to `DEFAULT_SAVE_STATE` and `createDefaultSaveState()` in `src/core/storage/schema.js`.
- **Behavior**:
  - In `CalibrationMode.bypass()`: `storageManager.set('calibration_bypassed', true, { immediate: true })`.
  - In `CalibrationMode.complete()`: `storageManager.set('calibration_completed', true, { immediate: true })` and `storageManager.set('calibration_bypassed', true, { immediate: true })`.
  - In `CloudSyncResolver.js`: Merge `calibration_bypassed` monotonically (`local.calibration_bypassed || cloud.calibration_bypassed`).
- **Rationale**: Keeps progression awards (100 Arc Bits + Star 1) strictly tied to `calibration_completed`, while `calibration_bypassed` manages user interface onboarding dismissal.
- **Alternatives Considered**: Using only `calibration_completed` for both bypass and completion. Rejected because granting completion rewards on bypass cheapens campaign progression, while withholding rewards but setting `calibration_completed` prevents players from ever earning the star/bits.

### Decision 2: Boot Terminal Evaluation and Hydration Settlement
- **Approach**:
  - In `src/core/main.js`, update `initBootTerminal()`:
    ```javascript
    const isCalibrated = storageManager.get('calibration_completed', false);
    const isBypassed = storageManager.get('calibration_bypassed', false);
    ```
    If `isCalibrated || isBypassed`, immediately hide `#bootTerminal` and transition to the 3D lobby.
  - Coordinate `initBootTerminal()` with `authManager.init()`: on desktop environments, await or sequence `initBootTerminal()` after `authReady` resolves so desktop IPC profile loads are applied before gating checks.
- **Rationale**: Eliminates the startup race condition on Electron and guarantees that players who closed the game mid-calibration without choosing bypass are re-presented with the tutorial as desired.

### Decision 3: Integrating Calibration as Circuit League Stage 1 (`level_01_01`)
- **Approach**:
  - In `src/ui/campaign/CampaignHUD.js`: When `launchTrial(levelId)` is invoked for `level_01_01` ("Boot Diagnostic"), route directly to `calibrationMode.start()`.
  - When the gauntlet completes via `calibrationMode.complete()`, it naturally records `level_01_01` completion, awards Grid 01 Star 1, credits 100 Arc Bits, and marks `calibration_completed: true`.
- **Rationale**: `level_01_01` in `CampaignRegistry.js` is already named "Boot Diagnostic" in "Outlands Boot-Sector" (Grid 01). Integrating calibration here makes logical thematic sense, provides a persistent home for tutorial replay, and ensures bypassed players can always return to earn their rewards.

## Risks / Trade-offs

- **[Risk]**: Desktop startup delay if waiting for `authReady` slows down first frame presentation.
  $\rightarrow$ **Mitigation**: Desktop profile loading is local IPC (`electronDesktop.loadProfile`), resolving in under 5ms. Awaiting it prevents visual flickering between boot terminal and lobby.
- **[Risk]**: Existing players who bypassed prior to this update might still see the boot terminal once.
  $\rightarrow$ **Mitigation**: In `storageManager.load()` or migration, check if `stats.matchesPlayed > 0` or `stats.totalPlaytimeSec > 0` and auto-populate `calibration_bypassed: true`.
