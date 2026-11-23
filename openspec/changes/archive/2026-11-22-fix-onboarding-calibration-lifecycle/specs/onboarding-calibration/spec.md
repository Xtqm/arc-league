# Spec Delta

## MODIFIED Requirements

### Requirement: Calibration Bypass Escape Hatch
The system SHALL display an unobtrusive bypass action (`[ESC / START] BYPASS TO LOBBY`) throughout the calibration sequence, allowing players to skip directly to the Playable 3D Lobby at any point while permanently persisting the bypass decision to prevent future boot interruptions.

#### Scenario: Bypassing calibration via escape key or gamepad start
- **WHEN** the player presses ESC, Gamepad Start, or taps the mobile bypass button during calibration
- **THEN** the calibration session terminates cleanly, the system sets `calibration_bypassed: true` in persistent storage, and the player immediately transitions to the Playable 3D Arena Lobby.

#### Scenario: Escape action contextualization during campaign trial execution
- **WHEN** the player presses ESC during calibration while executing Grid 01 Stage 1 (`level_01_01`) from Campaign Mode
- **THEN** the system invokes the campaign pause handler instead of triggering an immediate bypass to the lobby.

### Requirement: On-Demand Combat Calibration Stage
The system SHALL support launching the 3-beat combat calibration gauntlet on-demand from the Circuit League campaign interface regardless of whether the player previously bypassed or completed the boot tutorial.

#### Scenario: Initiating calibration from Circuit League menu
- **WHEN** a player selects Grid 01 Stage 1 (`level_01_01`, "Boot Diagnostic") in the Circuit League and launches the trial
- **THEN** the system resets active sector arena hazards, initializes the three-beat calibration arena starting at Beat 1, presents tactical objectives, and coordinates with CampaignManager.

#### Scenario: Earning progression rewards from on-demand calibration
- **WHEN** a player completes Beat 3 via the Circuit League stage
- **THEN** the system sets `calibration_completed: true`, sets `calibration_bypassed: true`, delegates completion to `CampaignManager.completeTrial()`, evaluates 1 to 3 stars against defined thresholds, distributes differentiated payouts (100 Bits for first clear, 25 Bits for repeat clear), and renders the trial debrief modal.
