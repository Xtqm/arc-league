# Tasks: Dynamic Bot Combat AI & Smarter Bosses

## 1. Core Bot Capability Engine & Bank-Shot Solver

- [x] 1.1 Create `src/ai/BotCombatBrain.js` defining the 10-level capability matrix (`AIM_LEAD`, `COVER_SEEK`, `JUMP_EVADE`, `LATERAL_DASH`, `CURVE_THROW`, `PARRY_DEFENSE`, `CHARGED_THROW`, `BANK_RICOCHET`, `AERIAL_COMBAT`, `ADAPTIVE_COUNTER`) and verify capability query unit tests pass.
- [x] 1.2 Implement the 2D geometric specular wall-bank reflection solver in `BotCombatBrain.js` calculating bounce angles off arena bounds ($X = \pm\text{lim}$, $Z = \pm\text{lim}$) without heap allocations, and verify specular trajectory unit tests pass.
- [x] 1.3 Add test suite `test/ai/bot_combat_brain.test.js` validating capability gates across difficulty ratings 1 through 10 and bank-shot ray reflection mathematics.

## 2. Bot Parry Defense & Guard Crush Projectile Mechanics

- [x] 2.1 Update `src/entities/Disc.js` collision detection to evaluate bot frontal parry attempts when player discs approach within 2.2m, verifying frontal cone validation (`toDisc.dot(facing) > 0.35`) and whiff cooldowns.
- [x] 2.2 Implement guard crush shattering in `Disc.js` against blocking bots when hit by player throws with charge $\ge 85\%$, applying full damage, guard crush particles, and stagger state.
- [x] 2.3 Implement ping-pong deflection velocity escalation in `Disc.js`, scaling deflected projectile speed by $1.25\times$ and transferring ownership between combatants during rallies.
- [x] 2.4 Add test suite `test/combat/bot_parry_guard_crush.test.js` validating bot parry interception, whiff windows, and guard crush penetrations.

## 3. Bot Charged Throws & Kinematic Integration

- [x] 3.1 Update `src/entities/Bot.js` to support bot throw charge coiling (`f.isChargingThrow`, `f.throwCharge`, `f.chargeDuration`) when `canCharge()` is unlocked, integrating with `animateProgramKinematics` visual rig coils.
- [x] 3.2 Update bot throw dispatch in `Bot.js` to release charged discs via `spawnDisc(..., charge)` when fully wound up or when line-of-sight is optimal.
- [x] 3.3 Implement player parry breaking when struck by high-difficulty bot charged throws ($\ge 85\%$), triggering player guard crush alert and shield cooldown.
- [x] 3.4 Add test suite `test/combat/bot_charged_throws.test.js` verifying bot charge windups and guard crushing against blocking players.

## 4. Campaign Arbiter Boss Overhaul & Decoupling

- [x] 4.1 Refactor `src/ai/ArbiterBossController.js` to implement the 4 distinct Arbiter personalities (Sentinel Bulwark, Sailmaster Aerialist, Leviathan Geometric Banker, Master Control Level 10 Apex AI) with personality-weighted action profiles.
- [x] 4.2 Decouple Arbiters from `updateDuelFoe` in `src/entities/Bot.js`, ensuring Arbiter movement, kinematics, and volleys are exclusively driven by `ArbiterBossController`.
- [x] 4.3 Implement Master Control Level 10 Apex AI subroutines in `ArbiterBossController.js` combining charged curve volleys, frame-perfect parrying, and wall-bank traps.
- [x] 4.4 Add test suite `test/ai/arbiter_personalities.test.js` verifying personality-specific combat behaviors and shield/phase transitions for all 4 Grids.

## 5. Swarm Squad Commander & Network Disarray Lifecycle

- [x] 5.1 Update `spawnWave` in `src/entities/Bot.js` to spawn a designated Squad Commander with a visual command beacon light and distinct audio hum starting at Wave 4.
- [x] 5.2 Implement Commander tactical order broadcasting (`PINCER` and `STAGGER`) to coordinate minion strafe flanks and staggered throw intervals.
- [x] 5.3 Implement the tiered disarray lifecycle in `killFoe()`: instant swarm collapse for Waves 4–7, 2.5s glitch disarray for Waves 8–12, and automated Commander re-election for Waves 13+.
- [x] 5.4 Add test suite `test/ai/swarm_squad_coordinator.test.js` verifying Commander order broadcasts and the tiered disarray lifecycle.

## 6. Survival: Hardcore Mode & Dynamic Director AI

- [x] 6.1 Add Survival mode variant selection (`Standard` vs. `Hardcore`) in `src/ui/lobbyCores.js` and `src/ui/menus.js`, gated by `stats.swarmMaxWave >= 10`.
- [x] 6.2 Implement `DynamicDirector` in `src/ai/DynamicDirector.js` tracking rolling player metrics (parry frequency, pillar camping, health preservation) to trigger real-time bot counter-measures in Hardcore mode.
- [x] 6.3 Integrate `DynamicDirector` into the main game loop (`src/core/main.js`) during Survival: Hardcore matches.
- [x] 6.4 Add test suite `test/modes/survival_hardcore.test.js` verifying unlock prerequisites, Hardcore mode instantiation, and Dynamic Director behavioral adjustments.

## 7. Full Integration Verification

- [x] 7.1 Run full project test suite (`npm test`) to verify all existing and new unit/integration tests pass without regressions.
- [x] 7.2 Perform an end-to-end simulation test across Swarm (Standard & Hardcore), Campaign Trial, and Arbiter encounters.
