# Design

## Context

The Campaign Mode architecture defines a 4-tier data and UI model:
1. `CampaignRegistry.js`: 4 Grids, 28 levels, wave definitions, star criteria, base Bit/XP rewards.
2. `CampaignManager.js` & `StarEvaluator.js`: Trial lifecycle (`startTrial`, `recordMetric`, `completeTrial`, `failTrial`), pure 1-3 star evaluations, monotonic star upgrades, and persistent storage synchronization.
3. UI Layer (`GridSelectorModal.js`, `LevelSelectView.js`, `CampaignHUD.js`, `TrialDebriefModal.js`): Sector carousel, level matrix, mission brief, top tactical header, and debrief modal.
4. Three.js Combat Simulation (`Bot.js`, `Player.js`, `Disc.js`, `Arena.js`, `SectorHazardBuilder.js`): Physics, bots, discs, arena tiles, and hazard colliders.

In the current implementation, `CampaignHUD.launchTrial()` initializes `campaignManager.startTrial(levelId)` and triggers a 3-second countdown targeting `window.__tronSpawnCampaignWave`. However, the bridge functions connecting live combat to the campaign progression engine were never bound to `window` or called from entity event handlers.

## Goals / Non-Goals

**Goals:**
- Provide authoritative campaign wave spawning matching `levelConfig.waves` (enemy count, type, archetype, and HP) and Arbiter boss encounters.
- Enable multi-wave progression within trials when a level defines multiple waves.
- Connect victory resolution: when all foes in the active wave/trial are eliminated, trigger `CampaignManager.completeTrial()`, evaluate stars and payouts, update persistent storage, and present `TrialDebriefModal`.
- Connect live telemetry: pipe disc curve hits, ricochets, and player damage taken directly to `CampaignManager.recordMetric()`, keeping the in-combat objective header reactively synced.
- Connect campaign defeat: when player integrity reaches zero or void plunge occurs, invoke `CampaignManager.failTrial()` and present the defeat debrief screen.

**Non-Goals:**
- Modifying campaign level metadata or reward balance in `CampaignRegistry.js`.
- Altering existing Duel or Swarm gameplay loops.
- Reworking existing storage schemas (`schema.js`).

## Decisions

### 1. Authoritative Wave Spawning in `Bot.js` via `spawnCampaignWave(levelConfig, waveIndex)`
- **Decision**: Define and export `spawnCampaignWave(levelConfig, waveIndex = 1)` in `src/entities/Bot.js` and register it on `window.__tronSpawnCampaignWave`.
- **Details**:
  - If `levelConfig.type === 'arbiter'` or `levelConfig.difficultyTier === 'ARBITER'`, delegate to `spawnArbiterBoss(levelConfig.id)`.
  - Otherwise, lookup wave `waveIndex` in `levelConfig.waves` (falling back to wave 1).
  - Clear existing combat foes and spawn bot entities matching the configured enemy tiers (`RECON`, `INTRUDER`, `GUARDIAN`, `ELITE`), setting appropriate AI skills, models, and HP pools.
  - Track active wave number in `state.campaignWave`.
- **Alternatives Considered**:
  - Spawning directly inside `CampaignHUD.js`: Rejected because Three.js bot instantiation, scene references, and mesh disposals belong in `Bot.js`.

### 2. Multi-Wave and Victory Completion in `Bot.js` (`killFoe`)
- **Decision**: In `killFoe(f)`, when `state.gameMode === 'campaign'`:
  - Increment `campaignManager.recordMetric('enemyKilled', 1)`.
  - Check if any active foe remains alive (`state.foes.some(x => x.alive && x.hp > 0)`).
  - If no foes remain:
    - Check if `levelConfig.waves` contains a subsequent wave (`waveIndex + 1`). If so, increment `state.campaignWave`, trigger a wave announcement and countdown, and spawn the next wave.
    - If all waves are cleared, invoke `completeCampaignTrial()`:
      - Terminate trial via `campaignManager.completeTrial({ finalHp: state.player.hp, maxHp: state.player.maxHp || 100 })`.
      - Halt combat simulation (`state.running = false`, exit pointer lock).
      - Present victory debrief via `trialDebriefModal.show(outcome)`.
- **Alternatives Considered**:
  - Polling `state.foes.length === 0` in `main.js`: Rejected in favor of event-driven trigger on foe de-rez for immediate response and exact telemetry timestamps.

### 3. Combat Telemetry Interception in `Disc.js` & `Player.js`
- **Decision**:
  - In `Disc.js`, when a player disc hits a foe:
    - If `Math.abs(D.initialCurve || D.curve || 0) > 0.05`: invoke `campaignManager.recordMetric('curveHit', 1)`.
    - If `D.bounces > 0`: invoke `campaignManager.recordMetric('ricochetHit', 1)`.
  - In `Player.js`, inside `damagePlayer(amount)`:
    - If `state.gameMode === 'campaign'`:
      - Invoke `campaignManager.recordMetric('damageTaken', amount)`.
      - Invoke `campaignManager.recordMetric('finalHp', state.player.hp)`.
      - Invoke `campaignHUD.updateIntegrity(state.player.hp, state.player.maxHp || 100)`.
- **Rationale**: Keeps `CampaignManager` as the single source of truth for telemetry metrics, allowing `StarEvaluator` to accurately evaluate Star 2 (>=75% HP) and Star 3 (completion time / trickshot mastery).

### 4. Campaign Trial Defeat in `Player.js`
- **Decision**: In `Player.js` de-rez / void plunge handler, check `if (state.gameMode === 'campaign')`:
  - Call `campaignManager.failTrial(state.gameOverReason || 'DE-REZ')`.
  - Set `state.running = false` and release pointer lock.
  - Present `trialDebriefModal.show({ success: false, levelId: state.campaignLevelId, ... })`.
- **Alternatives Considered**:
  - Reusing standard Swarm `showGameOver()`: Rejected because Swarm game over shows wave survival score and does not support the campaign Retry / Return to Grid workflow.

## Risks / Trade-offs

- **[Risk] Bot / Disc entity leaks across trial restarts** → Mitigation: Ensure `resetCampaignRound` thoroughly purges `state.foes` and `state.discs`, calling `disposeDiscEntity` and `scene.remove(f.obj)`.
- **[Risk] Multiple simultaneous de-rez events double-triggering completeTrial** → Mitigation: Add an idempotent guard `isCompletingTrial` flag in `CampaignManager` or `Bot.js` to ensure `completeTrial()` is only called once per session.
- **[Risk] Headless/Node unit tests failing if `window` or Three.js scene is missing** → Mitigation: Guard all window and DOM accesses with `typeof window !== 'undefined'` and null checks.
