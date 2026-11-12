# Tasks

## 1. Wave Spawner & Round Reset Integration

- [x] 1.1 Implement `spawnCampaignWave(levelConfig, waveIndex)` in `src/entities/Bot.js` handling configured enemy counts, AI difficulty tiers (`RECON`, `INTRUDER`, `GUARDIAN`, `ELITE`), HP pools, and Arbiter boss delegation, and verify via unit test.
- [x] 1.2 Bind `window.__tronSpawnCampaignWave = spawnCampaignWave` and harmonize `resetCampaignRound` in `src/entities/Player.js` so countdown completion reliably invokes wave spawning.
- [x] 1.3 Add scaffolded test suite in `test/campaign/campaign_runtime_bridge.test.js` validating wave spawning, archetype mapping, and initial bot properties.

## 2. Trial Victory & Multi-Wave Lifecycle

- [x] 2.1 Update `killFoe(f)` in `src/entities/Bot.js` to emit `campaignManager.recordMetric('enemyKilled', 1)` on each hostile de-rez when `state.gameMode === 'campaign'`.
- [x] 2.2 Implement multi-wave advancing and `completeCampaignTrial()` in `src/entities/Bot.js`, evaluating 1-3 Stars, crediting Bit/XP payouts, saving progression, and calling `trialDebriefModal.show(outcome)`.
- [x] 2.3 Bind `window.__tronCompleteCampaignTrial = completeCampaignTrial` and verify trial completion and storage updates in `test/campaign/campaign_runtime_bridge.test.js`.

## 3. Live Telemetry & Defeat Routing

- [x] 3.1 Wire disc impact telemetry in `src/entities/Disc.js` to invoke `campaignManager.recordMetric('curveHit', 1)` and `campaignManager.recordMetric('ricochetHit', 1)` during campaign trials.
- [x] 3.2 Wire player damage in `src/entities/Player.js` to invoke `campaignManager.recordMetric('damageTaken', amount)` and dynamically update `#campaignObjectiveHeader`.
- [x] 3.3 Wire player de-rez and void plunge in `src/entities/Player.js` during campaign mode to invoke `campaignManager.failTrial()` and present `trialDebriefModal.show({ success: false, ... })`.
- [x] 3.4 Add tests in `test/campaign/campaign_runtime_bridge.test.js` verifying metric accumulation, dynamic HUD updates, and defeat handling.

## 4. End-to-End Verification

- [x] 4.1 Run the full campaign test matrix (`test/campaign/campaign_phase1.test.js`, `campaign_phase2.test.js`, `campaign_phase3.test.js`, and `campaign_runtime_bridge.test.js`) and verify 100% pass rate.
