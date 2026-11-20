# Proposal

## Why

Currently, whenever the game is launched or reloaded, the system forcibly triggers the cold-open `#bootTerminal` and drops players into the combat calibration tutorial gauntlet. This occurs because the boot sequence only checks `calibration_completed` (which is set exclusively upon completing all three beats), completely forgetting when a player explicitly chose `[ESC / START] BYPASS TO LOBBY` or previously launched the game. Furthermore, players who bypassed the boot tutorial have no in-game mechanism to replay or complete it on-demand to earn the initial 100 Arc Bits and Star 1 progression award. In addition, an asynchronous storage hydration race condition on desktop (Electron) causes returning players' saved profiles to be evaluated after the boot terminal is already rendered.

## What Changes

- **Persistent Calibration Bypass**: When a player presses Escape, Gamepad Start, or clicks the bypass button during calibration, the system marks `calibration_bypassed: true` in persistent storage so future sessions cleanly skip the boot terminal.
- **Strict Boot Suppression Gate**: The fullscreen cold-open `#bootTerminal` will only be bypassed on load if the player has either completed calibration (`calibration_completed: true`) or explicitly bypassed it (`calibration_bypassed: true`). Incomplete or interrupted calibration attempts that were not explicitly bypassed or completed will continue to present the tutorial on boot.
- **Circuit League On-Demand Calibration Stage**: Calibration is integrated into Circuit League (Campaign Mode) as the first stage of Grid 01 (`level_01_01`, "Boot Diagnostic"). Players who bypassed or completed the initial boot can replay the 3-beat calibration gauntlet at any time from the Campaign level selection menu, claiming the 100 Arc Bits and Star 1 progression award upon completion.
- **Asynchronous Storage Hydration Synchronization**: Coordinate desktop and web profile initialization prior to evaluating boot gating flags so saved completion and bypass records are reliably honored on startup.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `onboarding-calibration`: Add persistent bypass tracking to the boot sequence requirements, update boot terminal bypass conditions to honor both completed and bypassed states, and specify on-demand invocation of the calibration gauntlet.
- `campaign-progression`: Update Grid 01 Level 1 (`level_01_01`, "Boot Diagnostic") lifecycle orchestration to execute the 3-beat combat calibration gauntlet on-demand with progression rewards.

## Impact

- `src/core/storage/schema.js`: Add `calibration_bypassed: false` to baseline schema and validation rules.
- `src/core/storage/CloudSyncResolver.js`: Sync `calibration_bypassed` monotonically across local and cloud/multi-tab saves.
- `src/modes/CalibrationMode.js`: Update `bypass()` to record `calibration_bypassed: true` in persistent storage.
- `src/core/main.js`: Update `initBootTerminal()` to check for both `calibration_completed` and `calibration_bypassed`, and ensure storage hydration has settled before evaluating boot state.
- `src/campaign/CampaignRegistry.js` & `src/ui/campaign/CampaignHUD.js`: Route `level_01_01` ("Boot Diagnostic") trial launches to the 3-beat calibration sequence.
- Test suites: Update calibration mode and campaign unit tests to verify persistent bypass and campaign stage execution.
