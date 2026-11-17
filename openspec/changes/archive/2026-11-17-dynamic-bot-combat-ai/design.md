# Design: Dynamic Bot Combat AI & Smarter Bosses

## Context

Current bot execution is split into three disparate implementations:
1. `updateFoes` in `src/entities/Bot.js`: A simplistic circle-and-throw loop for Swarm drones and Campaign minion waves.
2. `updateDuelFoe` in `src/entities/Bot.js`: A state machine (`ATTACK`, `SEEK_COVER`, `PEEK`, `EVADE`) for Solo AI Duel bots.
3. `ArbiterBossController` in `src/ai/ArbiterBossController.js`: A specialized boss controller managing multi-layer shields, curve volleys, and reactive dashes.

In the current code, Campaign Arbiters unintentionally execute both `f.bossController.update()` and `updateDuelFoe()`, creating conflicting movement vectors. Meanwhile, the engine already supports bot player-parity features in `Disc.js` and `materials.js` (charge damage scaling, guard crush, and character rig kinematics for `blocking` and `chargingThrow`), but no AI systems interface with them.

See `proposal.md` for background and motivation.

## Goals / Non-Goals

**Goals:**
- Provide a unified, allocation-free **Bot Combat Brain** that evaluates perception, tactical decision-making, and capability unlocks across all bot entities.
- Implement an authoritative **Difficulty & Capability Matrix (Levels 1–10)** that dynamically enables advanced combat moves (lead aim, cover, jump evade, tactical dash, curve throw, parry defense, charged throw, bank ricochet, aerial throw, and adaptive counters).
- Enable bot **Parry & Deflection Defense** with frontal cone validation, whiff recovery, and guard crush vulnerability to fuel thrilling ping-pong rallies.
- Implement a 2D geometric **Bank-Shot Ricochet Solver** for bots to bounce discs off arena walls around obstacles and strike player rear hemispheres.
- Overhaul the 4 Campaign Arbiter bosses with distinct combat personalities (Sentinel Bulwark, Sailmaster Aerialist, Leviathan Geometric Banker, Master Control Level 10 Apex AI).
- Implement the **Squad Commander & Disarray Lifecycle** for Swarm survival (early wave collapse, mid-wave disarray, late-wave re-election).
- Implement **Survival: Hardcore** with the **Dynamic Director AI** tracking player habits and dispatching counter-tactics.

**Non-Goals:**
- Machine learning or neural network AI models; all behaviors remain deterministic, high-performance heuristic state machines running at 60 FPS without garbage collection allocations.
- Online multiplayer AI bots (multiplayer remains human-to-human peer-to-peer).
- Modifying player disc physics constants; bots utilize the exact same physical rules and projectile mechanics as human athletes.

## Decisions

### 1. Unified Capability Evaluator vs. Fragmented Subclasses
- **Decision**: Introduce a centralized capability lookup table and evaluator within `src/ai/BotCombatBrain.js`. Each bot entity maintains a `difficultyLevel` (1–10) and queries helper methods (`canParry()`, `canCharge()`, `canBank()`, `canCurve()`).
- **Rationale**: Avoids code duplication across Swarm minions, Duel rivals, and Campaign bosses while permitting fine-grained tuning per game mode.
- **Alternatives Considered**: Creating deep inheritance hierarchies (e.g., `SwarmBot extends BaseBot`, `ArbiterBot extends DuelBot`), which would introduce fragile lifecycle hooks in Three.js entity management.

### 2. Geometric Specular Wall-Bank Solver
- **Decision**: Implement a 2D ray reflection solver across arena bounds ($X = \pm\text{lim}$, $Z = \pm\text{lim}$). When the player is obscured by a pillar or camping in cover, the bot tests the 4 arena boundary planes for a clear 1-bounce specular ray connecting bot position $\rightarrow$ wall bounce point $\rightarrow$ player position.
- **Rationale**: Specular reflection on a rectangular arena is computationally trivial ($O(1)$ arithmetic), requires zero heap allocations when using scratch vectors, and produces mathematically perfect bank shots.
- **Alternatives Considered**: Raymarching or grid pathfinding, which would incur significant per-frame overhead and GC pressure.

### 3. Frontal-Cone Parry Defense with Whiff Penalty
- **Decision**: In `Disc.js`, when a player disc approaches an alert bot possessing parry capability within 2.2m:
  - Check if throw charge is $\ge 85\%$: if so, trigger `GUARD_CRUSH`, shatter bot parry, apply full damage, and stagger.
  - Check frontal facing angle: `toDisc.dot(facing) > 0.35`. If struck from the side or behind, parry fails.
  - If successful: reflect projectile with $1.25\times$ speed scaling, transfer ownership to bot, and visual parry burst.
  - If bot attempts parry prematurely (e.g. against distant or curving disc), trigger 0.8s whiff cooldown.
- **Rationale**: Directly mirrors the player's parry rules (`Player.js:46-66`), making bot parries feel fair, readable, and counterable.

### 4. Arbiter Boss Controller Overhaul & Resolution of Dual-Loop Conflict
- **Decision**: Cleanly decouple Arbiter bosses from `updateDuelFoe`. `ArbiterBossController` will act as the authoritative controller for Arbiter entities, reading its personality profile (Sentinel, Sailmaster, Leviathan, Master Control) and directly driving kinematics, movement, volleys, charges, and parries.
- **Personality Matrix**:
  - `SENTINEL`: Heavy charge weight (0.75), high shields (2-3), prefers center arena, slow strafe.
  - `SAILMASTER`: Aerial weight (0.80), frequent jump-evades, high speed (14 m/s), steep hook curves.
  - `LEVIATHAN`: Bank-shot weight (0.85), retreats to pillars, fires bank volleys off perimeter walls.
  - `MASTER CONTROL`: All weights enabled at 0.95+, frame-perfect parry, summons minion subroutines.

### 5. Swarm Squad Commander & Network Disarray
- **Decision**: In `spawnWave()`, when `state.wave >= 4`, designate one bot as `isCommander: true`, attaching a visual holographic command beacon mesh and distinct aura.
- **Commands**: Every 3–5 seconds, the Commander emits a command pulse:
  - `PINCER`: Signals 2 wingmen to set strafe vectors outward to encircle player.
  - `STAGGER`: Sets a staggered throw delay (0.3s–0.5s) on wingmen to create multi-angle sequential volleys.
- **Disarray Lifecycle**:
  - Waves 4–7: Killing Commander triggers `SWARM_COLLAPSE`; all peripheral drones de-rez immediately, clearing the wave.
  - Waves 8–12: Killing Commander inflicts 2.5s `disarrayTimer` (bots stagger, aim spread $+50\%$, speed $-50\%$), then recover as solo drones.
  - Waves 13+: Killing Commander triggers 2.5s disarray, followed by `electNewCommander()`, promoting the highest-HP minion and restoring the network.

### 6. Survival: Hardcore & Dynamic Director AI
- **Decision**: Stored in `localStorage` under `stats.swarmMaxWave >= 10`. When unlocked, a mode toggle appears on the Survival lobby card.
- **Dynamic Director**: Tracks a rolling 5-second window of player metrics:
  - `parryFrequency`: If $> 2$ parries per 5s $\rightarrow$ trigger Commander charge command.
  - `pillarCampingTime`: If $> 3\text{s}$ behind pillar $\rightarrow$ trigger Leviathan-style bank shots.
  - `flawlessHealth`: If player HP is 100% across wave $\rightarrow$ advance effective difficulty tier by $+1$.

## Risks / Trade-offs

- **[Risk] Bot parrying could cause frustrating stalemates** $\rightarrow$ *Mitigation*: The player can always bypass bot parries with $\ge 85\%$ charged throws (guard crush), bank shots hitting their rear hemisphere, or curves hooking around their frontal cone.
- **[Risk] Wall-bank calculations causing frame drops in large waves** $\rightarrow$ *Mitigation*: Restrict bank-shot checks strictly to bots with `canBank: true` (Level 6+) and limit checks to once every 0.3s rather than every animation frame, using static pre-allocated scratch vectors.
- **[Risk] Existing Campaign Trial star ratings broken by smarter enemies** $\rightarrow$ *Mitigation*: Early Grid 01 levels are locked to Difficulty Level 1–2 (Recon), which remain gentle introductory encounters. Advanced tactics only emerge in later Grids (Grid 02+).
- **[Risk] State conflicts between Arbiter controller and main update loop** $\rightarrow$ *Mitigation*: Remove `updateDuelFoe` invocation for Arbiters in `updateFoes()`; route all Arbiter updates exclusively through `f.bossController.update()`.

## Migration Plan

1. Create `src/ai/BotCombatBrain.js` with the 10-level capability matrix and geometric bank solver.
2. Refactor `src/entities/Bot.js` to route all bot locomotion and throw logic through `BotCombatBrain`.
3. Update `src/entities/Disc.js` collision checks to handle bot frontal parries, guard crush breaks, and rally speed boosts.
4. Refactor `src/ai/ArbiterBossController.js` to implement the 4 distinct Arbiter personalities and resolve the update loop conflict.
5. Integrate Squad Commander spawning, visual beacon, and tiered disarray lifecycle in `src/entities/Bot.js`.
6. Add Survival: Hardcore selector in `src/ui/lobbyCores.js` and `src/ui/menus.js` with Dynamic Director tracking in `src/core/main.js`.
7. Verify all unit and integration tests across duel, swarm, and campaign modes.
