# Proposal: Dynamic Bot Combat AI & Smarter Bosses

## Why

Autonomous combatants in Tron Disc Arena currently exhibit rigid, fragmented behavior across disparate execution loops. Standard minions in Swarm and Campaign modes merely orbit and throw straight discs without utilizing cover, jumping, curving, charging, or deflecting, while Campaign Arbiter bosses follow static timers and lack the ability to read player tactics or break guards.

This change elevates bot combat to true player parity governed by an internal **Capability Matrix & Difficulty Ladder** (Levels 1–10). As difficulty scales across Swarm cycles, Campaign Grids, and Duel Tiers, bots dynamically unlock combat techniques: lead-aiming, Magnus curve throws, tactical dashes, jump evasions, parry defense, charged guard-crush throws, and wall-bank ricochets. Furthermore, Campaign Arbiters receive distinct tactical personalities and phase behaviors, Swarm introduces squad coordination with "Squad Commander" bots and a network disarray/election lifecycle, and a dedicated **Survival: Hardcore** mode brings dynamic difficulty adjustment to high-tier survival.

## What Changes

- **Unified Bot Capability Matrix (Levels 1–10)**: Establish an internal capability gate where difficulty determines what a bot can and cannot do (lead aim, cover, jump evade, lateral dash, curve throws, parry defense, charged throws, bank ricochets, aerial combat, and adaptive counter-play).
- **Player-Parity Combat Capabilities for Bots**:
  - **Parry & Deflection Defense**: High-difficulty bots can raise a frontal parry shield to deflect incoming player discs, fueling escalating 1.25x ping-pong rallies, subject to frontal angle constraints, whiff recovery windows, and guard crush vulnerability.
  - **Charged Throws & Guard Crush**: Bots can coil and release charged throws, executing guard crushes against turtling or blocking players when charged $\ge 85\%$.
  - **Geometric Wall-Bank Shots**: Bots can calculate specular wall ricochets to strike players taking cover behind pillars or hit their rear hemisphere for $2\times$ critical damage.
  - **Aerial Apex Throws & Jumps**: High-tier bots jump and double-jump to evade low discs and release aerial hook throws at their trajectory apex.
- **Smarter Campaign Arbiter Bosses**: Overhaul the 4 Campaign Arbiters with bespoke combat identities:
  - *Grid 01: Sentinel Arbiter* - The Heavy Bulwark (high shields, central arena dominance, charged guard-crush throws).
  - *Grid 02: Sailmaster Arbiter* - The Agile Aerialist (high mobility, frequent jump evasions, steep aerial curve volleys).
  - *Grid 03: Leviathan Arbiter* - The Geometric Tactician (perimeter wall-bank specialist, indirect zoner).
  - *Grid 04: Master Control Arbiter* - The Level 10 Apex AI (combines all combat disciplines, frame-perfect reads, and minion command).
- **Squad Coordination & Commander Lifecycle (Swarm & High-Tier Trials)**:
  - Spawn designated Squad Commander bots with distinct visual beacons and audio signals that direct wingmen with pincer maneuvers and staggered firing cadences.
  - **Tiered Disarray Lifecycle**:
    - *Early Waves (4–7)*: Eliminating the Commander collapses the swarm network, instantly clearing the remaining drones.
    - *Mid Waves (8–12)*: Eliminating the Commander induces a 2.5s glitch/disarray window, after which remaining minions fight as solo combatants.
    - *Hard Waves (13+)*: Eliminating the Commander triggers disarray, followed by an automated election promoting the highest-HP surviving drone to new Commander.
- **Survival: Hardcore Mode**:
  - Add a mode selector for Survival: Standard vs. Hardcore.
  - Hardcore unlocks upon clearing Wave 10 in Standard Survival, begins at Difficulty 5+, and activates the **Dynamic Director AI** that actively detects player habits (turtling, camping, parrying) and dispatches immediate tactical counter-measures.

## Capabilities

### Modified Capabilities

- `combat-ai`: Overhaul bot behavior to be driven by an internal 10-level capability matrix, add bot parry/deflection routines with guard crush and whiff vulnerabilities, add bot charged throws and geometric bank-shot targeting, differentiate Campaign Arbiter boss personalities, and introduce Squad Commander coordination and disarray lifecycles.
- `game-modes`: Add the Survival: Hardcore mode option (unlocked at Standard Wave 10 clear) governed by the Dynamic Director AI, integrate wave-based Commander spawning, and implement Commander elimination wave-clearing lifecycles.

## Impact

- **Bot Simulation & Kinematics**: Unifies `updateFoes`, `updateDuelFoe`, and `ArbiterBossController` under a modular bot brain architecture. Kinematic animation rigs in `materials.js` already support `blocking` and `chargingThrow` and will now be actively driven by AI bots.
- **Combat Projectile System (`Disc.js`)**: Extend disc collision to support bot frontal parries, bot guard crushes, and disc rally speed escalation.
- **Survival UI & Lobby**: Add Hardcore mode toggle/badge to Survival lobby and mode selector, gated by `stats.swarmMaxWave >= 10`.
- **Campaign Trial Balancing**: Increases tactical depth of Campaign Trials and Arbiter encounters without breaking existing star thresholds.
