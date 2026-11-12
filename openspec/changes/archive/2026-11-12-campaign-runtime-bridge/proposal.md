# Proposal

## Why

While the campaign registry, progression manager, and UI modals were architected and unit-tested in isolation, the active combat simulation loop was left disconnected from the campaign progression lifecycle. Specifically, launching a trial fails to spawn configured campaign enemy waves, clearing a wave never invokes trial completion or the debrief modal, combat trickshots and damage never update live telemetry, and player defeat falls back to the generic Swarm game over screen. Connecting these runtime bridges is required for Campaign Mode (League Circuit) to be fully playable from trial launch to debrief.

## What Changes

- **Campaign Wave Spawner Bridge (`window.__tronSpawnCampaignWave`)**: Implement authoritative enemy wave spawning matching `levelConfig.waves` enemy archetypes, counts, and HP pools (or routing to Arbiter boss spawning for Arbiter encounters) upon countdown completion.
- **Trial Completion Bridge (`window.__tronCompleteCampaignTrial`)**: Bind the trial victory hook so when all foes in a trial are de-rezzed, `CampaignManager.completeTrial()` is invoked, evaluating 1-3 Stars, awarding Bit/XP payouts, saving progress, and presenting `TrialDebriefModal`.
- **Combat Telemetry Bridge (`CampaignManager.recordMetric`)**: Wire live combat events from `Disc.js` and `Player.js` (damage sustained, curve throws, ricochets, enemy de-rezzes) to `CampaignManager.recordMetric()`, dynamically updating the in-combat HUD header (`#campaignObjectiveHeader`).
- **Campaign Defeat Flow**: Route player de-rez or void plunge during `state.gameMode === 'campaign'` to `CampaignManager.failTrial()`, cleanly halting the trial and rendering the defeat debrief screen with Retry and Return to Grid options.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `campaign-progression`: Connect runtime simulation loop hooks (`__tronSpawnCampaignWave`, `__tronCompleteCampaignTrial`, live metric capture, and campaign trial failure) to complete the Active Trial Lifecycle Orchestration in live gameplay.

## Impact

- Affected systems: `src/campaign/CampaignManager.js`, `src/entities/Bot.js`, `src/entities/Player.js`, `src/entities/Disc.js`, `src/ui/campaign/CampaignHUD.js`, `src/ui/campaign/TrialDebriefModal.js`.
- APIs / Global Hooks: registers `window.__tronSpawnCampaignWave` and `window.__tronCompleteCampaignTrial`, connects `window.__tronShowTrialDebrief`.
- Dependencies & Storage: leverages existing `StorageManager` keys (`campaign.levelRecords`, `campaign.unlockedNodes`, `campaign.starsEarned`, `inventory.unlockedMaps`) and `EconomyManager` payout methods without breaking schemas.
